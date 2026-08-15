import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { SENIORITY_AUTHORITY } from "./command-center.server";

export type DispatchAlternative = { name: string; openTasks?: number; reasons?: string[] };

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
  required_capability_slug: string | null;
  min_seniority_level: string | null;
  min_authority_level: number | null;
  complexity: string;
  dispatch_reason: string | null;
  blocked_reason: string | null;
  dispatch_alternatives: DispatchAlternative[];
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
  "id, sequence, title, detail, department_slug, owner_role, employee_id, task_id, risk, requires_approval, expected_outcome, status, result, required_capability_slug, min_seniority_level, min_authority_level, complexity, dispatch_reason, blocked_reason, dispatch_alternatives, employee:ai_employees(id, name, slug, role_title, accent)";
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

    const [{ data: subs }, { data: business }, { data: departments }, { data: capabilityRows }] =
      await Promise.all([
        supabase
          .from("user_subscriptions")
          .select("status, employee:ai_employees(id, slug, name, role_title, department, skills)")
          .eq("user_id", userId)
          .eq("status", "active"),
        supabase.from("business_profiles").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("departments").select("slug, name").order("sort_order", { ascending: true }),
        (supabase.from("ai_capabilities") as any).select("slug, name, department_slug").order("name"),
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

    const capabilities = ((capabilityRows ?? []) as any[]).map((c) => ({
      slug: c.slug as string,
      name: c.name as string,
      departmentSlug: c.department_slug as string | null,
    }));

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
      capabilities,
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

    // For every step the AI Manager mapped to a real capability, run the full
    // capability -> seniority -> authority -> tool -> permission ->
    // integration -> workload validation chain server-side. The language
    // model only PROPOSED a capability and an employee guess above — this is
    // the step that actually decides who (if anyone) is qualified.
    const { matchCapabilityCandidates, explainAssignment } = await import("./role-dispatch.server");

    const resolvedSteps = await Promise.all(
      plan.steps.map(async (step) => {
        if (!step.requiredCapability) {
          // No capability in the registry covers this step yet. Fall back to
          // the roster pick the planner already validated against ROSTER.
          return {
            ...step,
            status: "pending" as const,
            dispatchReason: null as string | null,
            blockedReason: null as string | null,
            alternatives: [] as DispatchAlternative[],
            minAuthorityLevel: null as number | null,
          };
        }

        const minAuthorityLevel = SENIORITY_AUTHORITY[step.minSeniorityLevel] ?? null;
        const result = await matchCapabilityCandidates(supabase, userId, {
          capabilitySlug: step.requiredCapability,
          minAuthorityLevel,
        });
        const reason = explainAssignment(result);

        if (result.best) {
          return {
            ...step,
            employeeSlug: result.best.slug,
            status: "pending" as const,
            dispatchReason: reason,
            blockedReason: null as string | null,
            alternatives: result.qualified.slice(1, 4).map((c) => ({
              name: c.name,
              openTasks: c.openTasks,
            })),
            minAuthorityLevel,
          };
        }

        const hasHolders = result.qualified.length + result.blocked.length > 0;
        const blockedReason = hasHolders
          ? reason
          : `No hired employee holds the ${result.capability?.name ?? step.requiredCapability} capability yet. Hire or activate a qualified employee, or connect the required integration.`;

        return {
          ...step,
          employeeSlug: result.blocked[0]?.slug ?? null,
          status: "blocked" as const,
          dispatchReason: reason,
          blockedReason,
          alternatives: result.blocked.slice(0, 4).map((c) => ({
            name: c.name,
            reasons: c.blockedReasons,
          })),
          minAuthorityLevel,
        };
      }),
    );

    const { error: stepsError } = await supabase.from("company_goal_steps").insert(
      resolvedSteps.map((step, index) => ({
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
        required_capability_slug: step.requiredCapability,
        min_seniority_level: step.minSeniorityLevel,
        min_authority_level: step.minAuthorityLevel,
        complexity: step.complexity,
        status: step.status,
        dispatch_reason: step.dispatchReason,
        blocked_reason: step.blockedReason,
        dispatch_alternatives: step.alternatives,
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
      .select(
        "id, goal_id, title, detail, expected_outcome, employee_id, task_id, status, risk, requires_approval, required_capability_slug, min_authority_level",
      )
      .eq("id", data.stepId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!step) throw new Error("Step not found.");
    if (step.task_id) throw new Error("This step already has a task.");
    if (step.status === "blocked") {
      throw new Error(
        "This step is blocked. Resolve the configuration issue (hire/activate an employee, connect an integration, or grant a permission) before dispatching it.",
      );
    }
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

    // Re-validate against the real role/capability/authority/tool system —
    // conditions (permissions, integrations, workload) can change between
    // planning time and dispatch time.
    if (step.required_capability_slug) {
      const { matchCapabilityCandidates } = await import("./role-dispatch.server");
      const result = await matchCapabilityCandidates(supabase, userId, {
        capabilitySlug: step.required_capability_slug,
        minAuthorityLevel: step.min_authority_level ?? null,
      });
      const stillQualifies = result.qualified.some((c) => c.employeeId === step.employee_id);
      if (!stillQualifies) {
        const blocking = result.blocked.find((c) => c.employeeId === step.employee_id);
        const reason =
          blocking?.blockedReasons.join(" ") ??
          "This employee no longer qualifies for the required capability.";
        await supabase
          .from("company_goal_steps")
          .update({ status: "blocked", blocked_reason: reason })
          .eq("id", step.id)
          .eq("user_id", userId);
        throw new Error(reason);
      }
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
        goal_id: step.goal_id,
        goal_step_id: step.id,
        required_capability_slug: step.required_capability_slug,
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
