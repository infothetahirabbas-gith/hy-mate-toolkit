import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import type { AiEmployeeResult } from "./ai-types";

export const TASK_STATUSES = ["incomplete", "processing", "review", "completed", "failed"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export type WorkforceTask = {
  id: string;
  task_name: string;
  description: string | null;
  status: string;
  priority: string;
  deadline: string | null;
  tools_required: string[];
  task_type: string;
  input: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  employee: { id: string; name: string; slug: string; role_title: string; accent: string } | null;
};

const EMPLOYEE_JOIN = "employee:ai_employees(id, name, slug, role_title, accent)";
const TASK_FIELDS = `id, task_name, description, status, priority, deadline, tools_required, task_type, input, created_at, updated_at, completed_at, ${EMPLOYEE_JOIN}`;

/** normalise legacy status values into the 5-state workflow */
export function normalizeStatus(status: string): TaskStatus {
  if (status === "pending") return "incomplete";
  if (status === "running") return "processing";
  return (TASK_STATUSES as readonly string[]).includes(status)
    ? (status as TaskStatus)
    : "incomplete";
}

export const getWorkforceOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [{ data: subs }, { data: tasks }, { data: reports }, { data: integrations }] =
      await Promise.all([
        supabase
          .from("user_subscriptions")
          .select(
            "id, status, price_monthly, plan_name, activated_at, display_name, employee:ai_employees(id, name, slug, role_title, category, department, accent, skills)",
          )
          .eq("user_id", userId)
          .neq("status", "cancelled"),
        supabase
          .from("ai_tasks")
          .select("id, task_name, status, employee_id, created_at, updated_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
        supabase.from("reports").select("id").eq("user_id", userId),
        supabase.from("user_integrations").select("provider").eq("user_id", userId),
      ]);

    const allTasks = (tasks ?? []).map((t) => ({ ...t, status: normalizeStatus(t.status) }));
    const count = (status: TaskStatus) => allTasks.filter((t) => t.status === status).length;
    const completed = count("completed");

    const roster = (subs ?? []).map((sub) => {
      const employee = sub.employee as unknown as {
        id: string;
        name: string;
        slug: string;
        role_title: string;
        category: string;
        department: string;
        accent: string;
        skills: string[];
      };
      const own = allTasks.filter((t) => t.employee_id === employee.id);
      const done = own.filter((t) => t.status === "completed").length;
      const failed = own.filter((t) => t.status === "failed").length;
      const current = own.find((t) => t.status === "processing") ?? own.find((t) => t.status === "review");

      const workingStatus =
        sub.status !== "active"
          ? "paused"
          : !sub.activated_at
            ? "waiting"
            : current?.status === "processing"
              ? "working"
              : failed > 0 && own[0]?.status === "failed"
                ? "error"
                : "active";

      return {
        subscriptionId: sub.id,
        subscriptionStatus: sub.status,
        activated: Boolean(sub.activated_at),
        displayName: sub.display_name,
        priceMonthly: sub.price_monthly ?? 0,
        planName: sub.plan_name,
        workingStatus,
        tasksCompleted: done,
        performanceScore: own.length ? Math.round((done / own.length) * 100) : 100,
        lastActivity: own[0]?.updated_at ?? own[0]?.created_at ?? null,
        currentTask: current ? { id: current.id, name: current.task_name } : null,
        employee,
      };
    });

    return {
      summary: {
        activeEmployees: roster.filter((r) => r.subscriptionStatus === "active").length,
        totalTasks: allTasks.length,
        completed,
        processing: count("processing"),
        review: count("review"),
        pending: count("incomplete"),
        failed: count("failed"),
        reports: (reports ?? []).length,
        connectedTools: (integrations ?? []).length,
        hoursSaved: completed * 3,
        monthlyCost: roster
          .filter((r) => r.subscriptionStatus === "active")
          .reduce((sum, r) => sum + r.priceMonthly, 0),
      },
      roster,
    };
  });

export const listWorkforceTasks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("ai_tasks")
      .select(TASK_FIELDS)
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(300);

    if (error) throw new Error(error.message);
    return ((data ?? []) as unknown as WorkforceTask[]).map((task) => ({
      ...task,
      status: normalizeStatus(task.status),
      tools_required: task.tools_required ?? [],
    }));
  });

async function notify(
  supabase: { from: (t: string) => { insert: (v: unknown) => Promise<unknown> } },
  row: {
    user_id: string;
    employee_id?: string | null;
    task_id?: string | null;
    kind: string;
    title: string;
    body?: string | null;
  },
) {
  await supabase.from("notifications").insert(row);
}

export const createTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        employeeId: z.string().uuid(),
        taskName: z.string().trim().min(3).max(140),
        description: z.string().trim().max(2000).default(""),
        priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
        deadline: z.string().trim().max(40).default(""),
        tools: z.array(z.string().max(80)).max(12).default([]),
        run: z.boolean().default(true),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: sub } = await supabase
      .from("user_subscriptions")
      .select("id, status")
      .eq("user_id", userId)
      .eq("employee_id", data.employeeId)
      .maybeSingle();

    if (!sub || sub.status !== "active") {
      throw new Error("Activate this AI employee before assigning work.");
    }

    const { data: task, error } = await supabase
      .from("ai_tasks")
      .insert({
        user_id: userId,
        employee_id: data.employeeId,
        task_name: data.taskName,
        description: data.description || null,
        priority: data.priority,
        deadline: data.deadline ? new Date(data.deadline).toISOString() : null,
        tools_required: data.tools,
        task_type: "manual",
        input: data.description || data.taskName,
        status: "incomplete",
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await notify(supabase as never, {
      user_id: userId,
      employee_id: data.employeeId,
      task_id: task.id,
      kind: "task_created",
      title: `New task assigned: ${data.taskName}`,
      body: "Your AI employee has the brief and is queued to start.",
    });

    return { taskId: task.id };
  });

export const setTaskStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ taskId: z.string().uuid(), status: z.enum(TASK_STATUSES) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("ai_tasks")
      .update({
        status: data.status,
        completed_at: data.status === "completed" ? new Date().toISOString() : null,
      })
      .eq("id", data.taskId)
      .eq("user_id", context.userId);

    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Runs the AI employee on an existing task: processing -> review, and files a report. */
export const runTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ taskId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: task, error: taskError } = await supabase
      .from("ai_tasks")
      .select(
        "id, task_name, description, input, task_type, tools_required, requires_approval, employee_id, employee:ai_employees(id, name, role_title, category, persona, skills, features)",
      )
      .eq("id", data.taskId)
      .eq("user_id", userId)
      .maybeSingle();

    if (taskError) throw new Error(taskError.message);
    if (!task) throw new Error("Task not found.");

    const employee = task.employee as unknown as {
      id: string;
      name: string;
      role_title: string;
      category: string;
      persona: string;
      skills: string[] | null;
      features: string[] | null;
    };

    const toolsRequired = task.tools_required ?? [];
    const { data: permissions } = await supabase
      .from("employee_tool_permissions")
      .select("tool_id, permission")
      .eq("user_id", userId)
      .eq("employee_id", task.employee_id);

    const permissionFor = (toolId: string) =>
      permissions?.find((p) => p.tool_id === toolId)?.permission ?? "full";

    const steps: { label: string; status: string; detail?: string }[] = [
      { label: "Understanding the brief", status: "running" },
      { label: "Gathering business context", status: "pending" },
      ...toolsRequired.map((tool) => ({ label: `Using ${tool}`, status: "pending" })),
      { label: "Producing the deliverable", status: "pending" },
      { label: "Preparing your report", status: "pending" },
    ];

    const setStep = async (index: number, status: string, detail?: string) => {
      const current = steps[index];
      if (current) {
        current.status = status;
        if (detail) current.detail = detail;
      }
      await supabase
        .from("ai_tasks")
        .update({ steps: JSON.parse(JSON.stringify(steps)) })
        .eq("id", task.id)
        .eq("user_id", userId);
    };

    await supabase
      .from("ai_tasks")
      .update({ status: "processing", steps: JSON.parse(JSON.stringify(steps)) })
      .eq("id", task.id);

    await notify(supabase as never, {
      user_id: userId,
      employee_id: task.employee_id,
      task_id: task.id,
      kind: "task_started",
      title: `${employee.name} started "${task.task_name}"`,
      body: (task.tools_required ?? []).length
        ? `Using ${(task.tools_required ?? []).join(", ")}.`
        : null,
    });

    try {
      const [{ data: business }, { data: history }] = await Promise.all([
        supabase.from("business_profiles").select("*").eq("user_id", userId).maybeSingle(),
        supabase
          .from("ai_tasks")
          .select("task_name, input, result")
          .eq("user_id", userId)
          .eq("employee_id", task.employee_id)
          .eq("status", "completed")
          .order("created_at", { ascending: false })
          .limit(3),
      ]);

      const { runAiEmployee } = await import("./ai-employee.server");
      const result = await runAiEmployee({
        employee: {
          name: employee.name,
          role_title: employee.role_title,
          category: employee.category,
          persona: employee.persona,
          skills: employee.skills ?? [],
          features: employee.features ?? [],
        },
        business: business ?? null,
        memory: (history ?? []).map((h) => ({
          task_name: h.task_name,
          input: h.input,
          headline: (h.result as { headline?: string } | null)?.headline ?? null,
        })),
        taskName: task.task_name,
        input: [task.description, task.input].filter(Boolean).join("\n") || task.task_name,
      });

      const json = JSON.parse(JSON.stringify(result));

      await supabase
        .from("ai_tasks")
        .update({ status: "review", result: json, completed_at: new Date().toISOString() })
        .eq("id", task.id)
        .eq("user_id", userId);

      await supabase.from("reports").insert({
        user_id: userId,
        employee_id: task.employee_id,
        task_id: task.id,
        type: employee.category.toLowerCase(),
        report_type: task.task_type,
        title: result.headline || task.task_name,
        summary: result.summary,
        content: json,
      });

      await notify(supabase as never, {
        user_id: userId,
        employee_id: task.employee_id,
        task_id: task.id,
        kind: "review_required",
        title: `${employee.name} finished "${task.task_name}"`,
        body: "A report is ready for your review and approval.",
      });

      return { result: result as AiEmployeeResult };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      await supabase
        .from("ai_tasks")
        .update({ status: "failed", error: message })
        .eq("id", task.id)
        .eq("user_id", userId);
      await notify(supabase as never, {
        user_id: userId,
        employee_id: task.employee_id,
        task_id: task.id,
        kind: "task_failed",
        title: `${employee.name} could not finish "${task.task_name}"`,
        body: message,
      });
      throw new Error(message);
    }
  });

export const getActivationState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ slug: z.string().min(1).max(160) }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: employee } = await supabase
      .from("ai_employees")
      .select("id, slug, name, role_title, category, department, accent, skills, tagline")
      .eq("slug", data.slug)
      .maybeSingle();

    if (!employee) throw new Error("That AI employee does not exist.");

    const [{ data: sub }, { data: business }, { data: integrations }] = await Promise.all([
      supabase
        .from("user_subscriptions")
        .select(
          "id, status, activated_at, display_name, brand_voice, instructions, working_preferences, onboarding_completed",
        )
        .eq("user_id", userId)
        .eq("employee_id", employee.id)
        .maybeSingle(),
      supabase.from("business_profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("user_integrations").select("provider, status").eq("user_id", userId),
    ]);

    return {
      employee,
      subscription: sub ?? null,
      business: business ?? null,
      integrations: integrations ?? [],
    };
  });

export const activateEmployee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        slug: z.string().min(1).max(160),
        displayName: z.string().trim().max(80).default(""),
        brandVoice: z.string().trim().max(400).default(""),
        instructions: z.string().trim().max(1200).default(""),
        workingPreferences: z.string().trim().max(400).default(""),
        firstTaskName: z.string().trim().max(140).default(""),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: employee } = await supabase
      .from("ai_employees")
      .select("id, name, role_title, category")
      .eq("slug", data.slug)
      .maybeSingle();

    if (!employee) throw new Error("That AI employee does not exist.");

    const { data: sub } = await supabase
      .from("user_subscriptions")
      .select("id")
      .eq("user_id", userId)
      .eq("employee_id", employee.id)
      .maybeSingle();

    if (!sub) throw new Error("Hire this AI employee before activating them.");

    const { error } = await supabase
      .from("user_subscriptions")
      .update({
        status: "active",
        activated_at: new Date().toISOString(),
        onboarding_completed: true,
        display_name: data.displayName || null,
        brand_voice: data.brandVoice || null,
        instructions: data.instructions || null,
        working_preferences: data.workingPreferences || null,
      })
      .eq("id", sub.id)
      .eq("user_id", userId);

    if (error) throw new Error(error.message);

    const firstTaskName =
      data.firstTaskName || `Complete initial ${employee.category.toLowerCase()} audit`;

    const { data: task } = await supabase
      .from("ai_tasks")
      .insert({
        user_id: userId,
        employee_id: employee.id,
        task_name: firstTaskName,
        description: `Kick-off task created automatically when ${employee.name} was activated.`,
        priority: "high",
        task_type: "onboarding",
        input: data.instructions || firstTaskName,
        status: "incomplete",
      })
      .select("id")
      .single();

    await notify(supabase as never, {
      user_id: userId,
      employee_id: employee.id,
      task_id: task?.id ?? null,
      kind: "activated",
      title: `${data.displayName || employee.name} is activated`,
      body: `First task created: ${firstTaskName}`,
    });

    return { taskId: task?.id ?? null };
  });

export const listNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("notifications")
      .select("id, kind, title, body, read_at, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const markNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await context.supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", context.userId)
      .is("read_at", null);
    return { ok: true };
  });
