import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type GoalStep = {
  id: string;
  sequence: number;
  title: string;
  detail: string | null;
  department_slug: string | null;
  owner_role: string;
  employee_id: string | null;
  task_id: string | null;
  risk: string;
  requires_approval: boolean;
  expected_outcome: string | null;
  status: string;
  result: string | null;
  employee: { id: string; name: string; slug: string; role_title: string; accent: string } | null;
};

export type CompanyGoal = {
  id: string;
  goal: string;
  context: string | null;
  budget: number;
  currency: string;
  deadline: string | null;
  autonomy_level: string;
  status: string;
  progress: number;
  summary: string | null;
  strategy: { phase: string; focus: string }[];
  risks: string[];
  kpis: { name: string; target: string }[];
  created_at: string;
};

const STEP_FIELDS =
  "id, sequence, title, detail, department_slug, owner_role, employee_id, task_id, risk, requires_approval, expected_outcome, status, result, employee:ai_employees(id, name, slug, role_title, accent)";
const GOAL_FIELDS =
  "id, goal, context, budget, currency, deadline, autonomy_level, status, progress, summary, strategy, risks, kpis, created_at";

export const listCompanyGoals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [{ data: goals, error }, { data: roster }] = await Promise.all([
      supabase
        .from("company_goals")
        .select(GOAL_FIELDS)
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("user_subscriptions")
        .select("status, employee:ai_employees(id, name, slug, role_title, department, accent)")
        .eq("user_id", userId)
        .eq("status", "active"),
    ]);

    if (error) throw new Error(error.message);

    const ids = (goals ?? []).map((g) => g.id);
    const { data: steps } = ids.length
      ? await supabase
          .from("company_goal_steps")
          .select(`goal_id, ${STEP_FIELDS}`)
          .in("goal_id", ids)
          .order("sequence", { ascending: true })
      : { data: [] as Record<string, unknown>[] };

    return {
      goals: (goals ?? []).map((goal) => ({
        ...(goal as unknown as Omit<CompanyGoal, "strategy" | "risks" | "kpis">),
        strategy: (goal.strategy ?? []) as CompanyGoal["strategy"],
        risks: (goal.risks ?? []) as CompanyGoal["risks"],
        kpis: (goal.kpis ?? []) as CompanyGoal["kpis"],
        steps: ((steps ?? []) as unknown as (GoalStep & { goal_id: string })[]).filter(
          (s) => s.goal_id === goal.id,
        ),
      })),
      roster: (roster ?? [])
        .map((r) => r.employee as unknown as {
          id: string;
          name: string;
          slug: string;
          role_title: string;
          department: string | null;
          accent: string;
        })
        .filter(Boolean),
    };
  });

export const createCompanyGoal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        goal: z.string().trim().min(8).max(400),
        context: z.string().trim().max(2000).default(""),
        budget: z.number().min(0).max(1_000_000_000).default(0),
        deadline: z.string().trim().max(20).default(""),
        autonomyLevel: z.enum(["suggest", "assisted", "autonomous"]).default("assisted"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const [{ data: subs }, { data: business }, { data: departments }] = await Promise.all([
      supabase
        .from("user_subscriptions")
        .select("status, employee:ai_employees(id, slug, name, role_title, department, skills)")
        .eq("user_id", userId)
        .eq("status", "active"),
      supabase.from("business_profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("departments").select("slug, name").order("sort_order", { ascending: true }),
    ]);

    const roster = (subs ?? [])
      .map((s) => s.employee as unknown as {
        id: string;
        slug: string;
        name: string;
        role_title: string;
        department: string | null;
        skills: string[] | null;
      })
      .filter(Boolean);

    if (roster.length === 0) {
      throw new Error("Hire and activate at least one AI employee before setting a company goal.");
    }

    const { planGoal } = await import("./command-center.server");
    const plan = await planGoal({
      goal: data.goal,
      context: data.context,
      budget: data.budget,
      currency: "USD",
      deadline: data.deadline || null,
      autonomyLevel: data.autonomyLevel,
      business: (business as Record<string, unknown> | null) ?? null,
      roster: roster.map((r) => ({
        slug: r.slug,
        name: r.name,
        role: r.role_title,
        department: r.department,
        skills: (r.skills ?? []).slice(0, 8),
      })),
      departments: (departments ?? []) as { slug: string; name: string }[],
    });

    const { data: goalRow, error: goalError } = await supabase
      .from("company_goals")
      .insert({
        user_id: userId,
        goal: data.goal,
        context: data.context || null,
        budget: data.budget,
        deadline: data.deadline || null,
        autonomy_level: data.autonomyLevel,
        status: "active",
        summary: plan.summary,
        strategy: plan.strategy,
        risks: plan.risks,
        kpis: plan.kpis,
      })
      .select("id")
      .single();

    if (goalError) throw new Error(goalError.message);

    const bySlug = new Map(roster.map((r) => [r.slug, r.id]));
    const { error: stepsError } = await supabase.from("company_goal_steps").insert(
      plan.steps.map((step, index) => ({
        goal_id: goalRow.id,
        user_id: userId,
        sequence: index + 1,
        title: step.title,
        detail: step.detail,
        department_slug: step.departmentSlug,
        owner_role: step.ownerRole,
        employee_id: step.employeeSlug ? (bySlug.get(step.employeeSlug) ?? null) : null,
        risk: step.risk,
        requires_approval:
          data.autonomyLevel === "suggest" ? true : step.requiresApproval || step.risk === "high",
        expected_outcome: step.expectedOutcome,
      })),
    );

    if (stepsError) throw new Error(stepsError.message);
    return { goalId: goalRow.id as string, steps: plan.steps.length };
  });

export const dispatchGoalStep = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ stepId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: step, error } = await supabase
      .from("company_goal_steps")
      .select("id, goal_id, title, detail, expected_outcome, employee_id, task_id, status, risk, requires_approval")
      .eq("id", data.stepId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!step) throw new Error("Step not found.");
    if (step.task_id) throw new Error("This step already has a task.");
    if (!step.employee_id) throw new Error("Assign an AI employee to this step first.");

    const { data: sub } = await supabase
      .from("user_subscriptions")
      .select("status")
      .eq("user_id", userId)
      .eq("employee_id", step.employee_id)
      .maybeSingle();

    if (!sub || sub.status !== "active") {
      throw new Error("That AI employee is not on your active roster.");
    }

    const { data: task, error: taskError } = await supabase
      .from("ai_tasks")
      .insert({
        user_id: userId,
        employee_id: step.employee_id,
        task_name: step.title,
        description: step.detail,
        input: [step.detail, step.expected_outcome ? `Expected outcome: ${step.expected_outcome}` : ""]
          .filter(Boolean)
          .join("\n\n"),
        status: "incomplete",
        priority: step.risk === "high" ? "high" : "medium",
        requires_approval: step.requires_approval,
      })
      .select("id")
      .single();

    if (taskError) throw new Error(taskError.message);

    await supabase
      .from("company_goal_steps")
      .update({ task_id: task.id, status: "dispatched" })
      .eq("id", step.id)
      .eq("user_id", userId);

    return { taskId: task.id as string };
  });

export const setGoalStepStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        stepId: z.string().uuid(),
        status: z.enum(["pending", "dispatched", "approved", "completed", "blocked", "skipped"]),
        result: z.string().trim().max(2000).default(""),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: step, error } = await supabase
      .from("company_goal_steps")
      .update({ status: data.status, result: data.result || null })
      .eq("id", data.stepId)
      .eq("user_id", userId)
      .select("goal_id")
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!step) throw new Error("Step not found.");

    const { data: siblings } = await supabase
      .from("company_goal_steps")
      .select("status")
      .eq("goal_id", step.goal_id)
      .eq("user_id", userId);

    const all = siblings ?? [];
    const done = all.filter((s) => s.status === "completed" || s.status === "skipped").length;
    const progress = all.length ? Math.round((done / all.length) * 100) : 0;

    await supabase
      .from("company_goals")
      .update({ progress, ...(progress === 100 ? { status: "completed" } : {}) })
      .eq("id", step.goal_id)
      .eq("user_id", userId);

    return { progress };
  });

export const setCompanyGoalStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        goalId: z.string().uuid(),
        status: z.enum(["active", "paused", "completed", "cancelled"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("company_goals")
      .update({ status: data.status })
      .eq("id", data.goalId)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteCompanyGoal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ goalId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("company_goals")
      .delete()
      .eq("id", data.goalId)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
