import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const TRIGGER_TYPES = ["schedule", "event", "data_change", "manual"] as const;
export const STEP_TYPES = [
  "condition",
  "employee",
  "tool",
  "task",
  "report",
  "message",
  "output",
] as const;

export type WorkflowStep = {
  id: string;
  type: (typeof STEP_TYPES)[number];
  label: string;
  config: Record<string, string>;
};

const stepSchema = z.object({
  id: z.string().max(60),
  type: z.enum(STEP_TYPES),
  label: z.string().trim().max(140),
  config: z.record(z.string(), z.string().max(400)).default({}),
});

export const listWorkflows = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("workflows")
      .select(
        "id, name, description, trigger_type, trigger_config, steps, status, run_count, last_run_at, created_at",
      )
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveWorkflow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        name: z.string().trim().min(3).max(140),
        description: z.string().trim().max(600).default(""),
        triggerType: z.enum(TRIGGER_TYPES),
        triggerValue: z.string().trim().max(200).default(""),
        steps: z.array(stepSchema).max(12).default([]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const payload = {
      name: data.name,
      description: data.description || null,
      trigger_type: data.triggerType,
      trigger_config: { value: data.triggerValue },
      steps: data.steps,
    };

    if (data.id) {
      const { error } = await supabase
        .from("workflows")
        .update(payload)
        .eq("id", data.id)
        .eq("user_id", userId);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }

    const { data: created, error } = await supabase
      .from("workflows")
      .insert({ ...payload, user_id: userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: created.id };
  });

export const setWorkflowStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), status: z.enum(["active", "paused"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("workflows")
      .update({ status: data.status })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const duplicateWorkflow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: source } = await supabase
      .from("workflows")
      .select("name, description, trigger_type, trigger_config, steps")
      .eq("id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!source) throw new Error("That workflow does not exist.");

    const { error } = await supabase.from("workflows").insert({
      user_id: userId,
      name: `${source.name} (copy)`,
      description: source.description,
      trigger_type: source.trigger_type,
      trigger_config: source.trigger_config,
      steps: source.steps,
      status: "paused",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteWorkflow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("workflows")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Executes the workflow: creates the tasks its employee steps describe and logs every step. */
export const runWorkflow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: workflow } = await supabase
      .from("workflows")
      .select("id, name, steps")
      .eq("id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!workflow) throw new Error("That workflow does not exist.");

    const steps = (workflow.steps ?? []) as unknown as WorkflowStep[];
    const log: { step: string; outcome: string }[] = [];
    const createdTaskIds: string[] = [];
    let currentEmployeeId: string | null = null;

    for (const step of steps) {
      if (step.type === "employee" && step.config["employeeId"]) {
        currentEmployeeId = step.config["employeeId"];
        log.push({ step: step.label, outcome: "assigned" });
        continue;
      }

      if (step.type === "tool") {
        await supabase.from("tool_activity_logs").insert({
          user_id: userId,
          employee_id: currentEmployeeId,
          tool_id: step.config["toolId"] ?? step.label,
          action: `Workflow "${workflow.name}" step: ${step.label}`,
          outcome: "allowed",
        });
        log.push({ step: step.label, outcome: "tool logged" });
        continue;
      }

      if ((step.type === "task" || step.type === "report") && currentEmployeeId) {
        const { data: task } = await supabase
          .from("ai_tasks")
          .insert({
            user_id: userId,
            employee_id: currentEmployeeId,
            task_name: step.label || `${workflow.name} step`,
            description: step.config["description"] ?? null,
            input: step.config["description"] || step.label,
            task_type: "workflow",
            priority: "medium",
            status: "incomplete",
          })
          .select("id")
          .maybeSingle();
        if (task) createdTaskIds.push(task.id);
        log.push({ step: step.label, outcome: "task created" });
        continue;
      }

      log.push({ step: step.label, outcome: "noted" });
    }

    await supabase.from("workflow_runs").insert({
      workflow_id: workflow.id,
      user_id: userId,
      status: "completed",
      log,
    });

    const { data: current } = await supabase
      .from("workflows")
      .select("run_count")
      .eq("id", workflow.id)
      .maybeSingle();

    await supabase
      .from("workflows")
      .update({ run_count: (current?.run_count ?? 0) + 1, last_run_at: new Date().toISOString() })
      .eq("id", workflow.id)
      .eq("user_id", userId);

    await supabase.from("notifications").insert({
      user_id: userId,
      kind: "workflow_run",
      title: `Workflow "${workflow.name}" ran`,
      body: `${createdTaskIds.length} task(s) created for your AI employees.`,
    });

    return { createdTasks: createdTaskIds.length, log };
  });
