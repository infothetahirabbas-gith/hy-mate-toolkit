import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { needsApproval, type RiskPolicyRow } from "@/lib/action-policy";
import { RISK_LEVELS } from "@/lib/connectors";

export const listTaskActions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ taskId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("task_actions")
      .select("*")
      .eq("user_id", context.userId)
      .eq("task_id", data.taskId)
      .order("sequence", { ascending: true });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

/** Plans the real-world actions for a task, gates them by risk policy, runs the safe ones. */
export const planTaskActions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ taskId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: task } = await supabase
      .from("ai_tasks")
      .select(
        "id, task_name, description, input, employee_id, employee:ai_employees(id, name, role_title)",
      )
      .eq("id", data.taskId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!task) throw new Error("Task not found.");

    const employee = task.employee as unknown as { name: string; role_title: string } | null;

    const [{ data: connections }, { data: policies }, { data: business }] = await Promise.all([
      supabase
        .from("user_integrations")
        .select("connector_id, status")
        .eq("user_id", userId)
        .eq("status", "connected"),
      supabase
        .from("action_risk_policies")
        .select("target_type, target_key, requires_approval")
        .eq("user_id", userId),
      supabase.from("business_profiles").select("business_name").eq("user_id", userId).maybeSingle(),
    ]);

    const connected = (connections ?? [])
      .map((row) => row.connector_id)
      .filter((id): id is string => Boolean(id));

    if (!connected.length) return { planned: 0, awaitingApproval: 0, executed: 0, connected: 0 };

    const { planActions, runActionRecord } = await import("@/lib/action-engine.server");
    const plan = await planActions({
      employeeName: employee?.name ?? "AI employee",
      roleTitle: employee?.role_title ?? "specialist",
      taskName: task.task_name,
      brief: [task.description, task.input].filter(Boolean).join("\n") || task.task_name,
      connectedConnectorIds: connected,
      businessName: business?.business_name ?? null,
    });

    let awaitingApproval = 0;
    let executed = 0;

    for (const [index, action] of plan.entries()) {
      const gated = needsApproval((policies ?? []) as RiskPolicyRow[], action.risk, action.connectorId);

      const { data: row, error } = await supabase
        .from("task_actions")
        .insert({
          user_id: userId,
          task_id: task.id,
          employee_id: task.employee_id,
          sequence: index,
          title: action.title,
          description: action.description,
          tool_id: action.toolId,
          connector_id: action.connectorId,
          operation: action.operation,
          risk: action.risk,
          params: JSON.parse(JSON.stringify(action.params)),
          requires_approval: gated,
          status: gated ? "awaiting_approval" : "approved",
        })
        .select("id, task_id, employee_id, title, tool_id, connector_id, operation, risk, params, attempts")
        .single();
      if (error) throw new Error(error.message);

      if (gated) {
        awaitingApproval += 1;
        await supabase.from("approval_requests").insert({
          user_id: userId,
          action_id: row.id,
          task_id: task.id,
          employee_id: task.employee_id,
          title: action.title,
          reason: action.reason,
          data_used: action.dataUsed,
          expected_result: action.expectedResult,
          risk: action.risk,
          tool_id: action.toolId,
          target: action.connectorId,
          payload: JSON.parse(JSON.stringify(action.params)),
        });
        await supabase.from("notifications").insert({
          user_id: userId,
          employee_id: task.employee_id,
          task_id: task.id,
          kind: "approval_required",
          title: `Approval needed: ${action.title}`,
          body: action.expectedResult || action.reason || null,
        });
      } else {
        const result = await runActionRecord(supabase, userId, row);
        if (result.ok) executed += 1;
      }
    }

    return {
      planned: plan.length,
      awaitingApproval,
      executed,
      connected: connected.length,
    };
  });

export const listApprovals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("approval_requests")
      .select(
        "*, employee:ai_employees(name, role_title, accent, slug), task:ai_tasks(task_name), action:task_actions(status, operation, connector_id, params, error)",
      )
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const decideApproval = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        approvalId: z.string().uuid(),
        decision: z.enum(["approve", "reject"]),
        note: z.string().trim().max(500).default(""),
        params: z.record(z.string(), z.unknown()).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: approval } = await supabase
      .from("approval_requests")
      .select("id, action_id, status, title, risk")
      .eq("id", data.approvalId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!approval) throw new Error("Approval request not found.");
    if (approval.status !== "pending") throw new Error("This request was already decided.");

    await supabase
      .from("approval_requests")
      .update({
        status: data.decision === "approve" ? "approved" : "rejected",
        decision_note: data.note || null,
        decided_at: new Date().toISOString(),
        ...(data.params ? { payload: JSON.parse(JSON.stringify(data.params)) } : {}),
      })
      .eq("id", approval.id)
      .eq("user_id", userId);

    await supabase.from("audit_logs").insert({
      user_id: userId,
      actor_type: "user",
      action: `approval.${data.decision}`,
      resource_type: "approval_request",
      resource_id: approval.id,
      metadata: JSON.parse(JSON.stringify({ title: approval.title, note: data.note })),
      risk: approval.risk,
      result: "success",
    });

    if (data.decision === "reject") {
      if (approval.action_id) {
        await supabase
          .from("task_actions")
          .update({ status: "rejected", error: data.note || "Rejected by user" })
          .eq("id", approval.action_id)
          .eq("user_id", userId);
      }
      return { ok: true, executed: false, summary: "Action rejected." };
    }

    if (!approval.action_id) return { ok: true, executed: false, summary: "Approved." };

    if (data.params) {
      await supabase
        .from("task_actions")
        .update({ params: JSON.parse(JSON.stringify(data.params)) })
        .eq("id", approval.action_id)
        .eq("user_id", userId);
    }

    const { data: action } = await supabase
      .from("task_actions")
      .select("id, task_id, employee_id, title, tool_id, connector_id, operation, risk, params, attempts")
      .eq("id", approval.action_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!action) throw new Error("The action for this request no longer exists.");

    const { runActionRecord } = await import("@/lib/action-engine.server");
    const result = await runActionRecord(supabase, userId, action);

    await supabase.from("notifications").insert({
      user_id: userId,
      employee_id: action.employee_id,
      task_id: action.task_id,
      kind: result.ok ? "action_completed" : "action_failed",
      title: result.ok ? `Action completed: ${action.title}` : `Action failed: ${action.title}`,
      body: result.summary,
    });

    return { ok: result.ok, executed: true, summary: result.summary };
  });

export const retryAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ actionId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: action } = await context.supabase
      .from("task_actions")
      .select("id, task_id, employee_id, title, tool_id, connector_id, operation, risk, params, attempts")
      .eq("id", data.actionId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!action) throw new Error("Action not found.");
    if (action.attempts >= 5) throw new Error("This action has been retried too many times.");

    const { runActionRecord } = await import("@/lib/action-engine.server");
    return runActionRecord(context.supabase, context.userId, action);
  });

export const listAuditLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("audit_logs")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getRiskPolicies = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("action_risk_policies")
      .select("target_type, target_key, requires_approval")
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return (data ?? []) as RiskPolicyRow[];
  });

export const setRiskPolicy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        targetType: z.enum(["risk", "connector"]),
        targetKey: z.string().min(1).max(60),
        requiresApproval: z.boolean(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    if (data.targetType === "risk" && !RISK_LEVELS.includes(data.targetKey as never)) {
      throw new Error("Unknown risk level.");
    }
    const { error } = await context.supabase.from("action_risk_policies").upsert(
      {
        user_id: context.userId,
        target_type: data.targetType,
        target_key: data.targetKey,
        requires_approval: data.requiresApproval,
      },
      { onConflict: "user_id,target_type,target_key" },
    );
    if (error) throw new Error(error.message);

    await context.supabase.from("audit_logs").insert({
      user_id: context.userId,
      actor_type: "user",
      action: "policy.updated",
      resource_type: "action_risk_policy",
      resource_id: `${data.targetType}:${data.targetKey}`,
      new_value: JSON.parse(JSON.stringify({ requires_approval: data.requiresApproval })),
      result: "success",
    });

    return { ok: true };
  });
