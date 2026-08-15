import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type MySubscription = {
  id: string;
  status: string;
  plan: string;
  plan_name: string;
  amount: number;
  billing_cycle: string;
  start_date: string;
  price_monthly: number;
  subscription_date: string;
  employee: {
    id: string;
    slug: string;
    name: string;
    role_title: string;
    category: string;
    tagline: string;
    accent: string;
    features: string[];
    workspace_input_label: string;
    workspace_input_placeholder: string;
  };
  tasks_completed: number;
};

const PLAN_NAMES: Record<string, string> = {
  starter: "Starter",
  professional: "Professional",
  business: "Business",
};

const EMPLOYEE_JOIN =
  "employee:ai_employees(id, slug, name, role_title, category, tagline, accent, features, workspace_input_label, workspace_input_placeholder)";

export const getMySubscriptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [{ data: subs, error }, { data: tasks }] = await Promise.all([
      supabase
        .from("user_subscriptions")
        .select(`id, status, plan, plan_name, amount, billing_cycle, start_date, price_monthly, subscription_date, ${EMPLOYEE_JOIN}`)
        .eq("user_id", userId)
        .order("subscription_date", { ascending: false }),
      supabase.from("ai_tasks").select("employee_id, status").eq("user_id", userId),
    ]);

    if (error) throw new Error(error.message);

    const counts = new Map<string, number>();
    for (const task of tasks ?? []) {
      if (task.status !== "completed") continue;
      counts.set(task.employee_id, (counts.get(task.employee_id) ?? 0) + 1);
    }

    return (subs ?? []).map((sub) => {
      const employee = sub.employee as MySubscription["employee"];
      return {
        ...sub,
        employee,
        tasks_completed: counts.get(employee?.id ?? "") ?? 0,
      };
    }) as MySubscription[];
  });

export const getDashboardOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [subs, tasks, reports, business] = await Promise.all([
      supabase
        .from("user_subscriptions")
        .select(`status, price_monthly, subscription_date, ${EMPLOYEE_JOIN}`)
        .eq("user_id", userId),
      supabase
        .from("ai_tasks")
        .select("id, task_name, status, created_at, employee_id")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("reports")
        .select("id, title, type, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("business_profiles")
        .select("business_name, website")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

    const active = (subs.data ?? []).filter((s) => s.status === "active");
    const { count: taskCount } = await supabase
      .from("ai_tasks")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "completed");
    const { count: reportCount } = await supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    return {
      activeEmployees: active.length,
      monthlySpend: active.reduce((sum, s) => sum + (s.price_monthly ?? 0), 0),
      tasksCompleted: taskCount ?? 0,
      reportsGenerated: reportCount ?? 0,
      onboarded: Boolean(business.data?.business_name),
      businessName: business.data?.business_name ?? null,
      recentTasks: tasks.data ?? [],
      recentReports: reports.data ?? [],
      roster: active.map((s) => s.employee) as MySubscription["employee"][],
    };
  });

export const hireEmployee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        slug: z.string().min(1).max(120),
        plan: z.enum(["starter", "professional", "business"]).default("starter"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: employee, error: employeeError } = await supabase
      .from("ai_employees")
      .select("id, slug, price_monthly, department_slug, team_slug")
      .eq("slug", data.slug)
      .eq("is_active", true)
      .maybeSingle();

    if (employeeError) throw new Error(employeeError.message);
    if (!employee) throw new Error("That AI employee is not available.");

    // Snapshot the structured role assignment (department/team) onto the
    // hired instance itself, so the roster always reflects the real
    // designation the employee was hired under, never a generic record.
    const { error } = await supabase.from("user_subscriptions").upsert(
      {
        user_id: userId,
        employee_id: employee.id,
        status: "active",
        plan: data.plan,
        plan_name: PLAN_NAMES[data.plan] ?? "Starter",
        price_monthly: employee.price_monthly,
        amount: employee.price_monthly,
        billing_cycle: "monthly",
        department_slug: employee.department_slug,
        team_slug: employee.team_slug,
        start_date: new Date().toISOString(),
        end_date: null,
        cancelled_at: null,
        subscription_date: new Date().toISOString(),
      },
      { onConflict: "user_id,employee_id" },
    );

    if (error) throw new Error(error.message);

    const { data: business } = await supabase
      .from("business_profiles")
      .select("business_name")
      .eq("user_id", userId)
      .maybeSingle();

    return { slug: employee.slug, needsOnboarding: !business?.business_name };
  });

export const setSubscriptionStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        subscriptionId: z.string().uuid(),
        status: z.enum(["active", "paused", "cancelled"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("user_subscriptions")
      .update({
        status: data.status,
        cancelled_at: data.status === "cancelled" ? new Date().toISOString() : null,
      })
      .eq("id", data.subscriptionId)
      .eq("user_id", context.userId);

    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getBusinessProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("business_profiles")
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data;
  });

const businessSchema = z.object({
  business_name: z.string().trim().min(1).max(120),
  website: z.string().trim().max(200).default(""),
  industry: z.string().trim().max(120).default(""),
  target_customer: z.string().trim().max(600).default(""),
  country: z.string().trim().max(120).default(""),
  goals: z.string().trim().max(800).default(""),
  brand_info: z.string().trim().max(800).default(""),
  target_audience: z.string().trim().max(600).default(""),
  primary_goal: z.string().trim().max(60).default(""),
});

export const saveBusinessProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => businessSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("business_profiles")
      .upsert({ ...data, user_id: context.userId }, { onConflict: "user_id" });

    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: profile }, { data: roles }] = await Promise.all([
      context.supabase.from("profiles").select("*").eq("id", context.userId).maybeSingle(),
      context.supabase.from("user_roles").select("role").eq("user_id", context.userId),
    ]);

    return {
      profile,
      isAdmin: (roles ?? []).some((r) => r.role === "admin"),
    };
  });

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        name: z.string().trim().max(120).default(""),
        company: z.string().trim().max(120).default(""),
        industry: z.string().trim().max(120).default(""),
        company_website: z.string().trim().max(200).default(""),
        country: z.string().trim().max(120).default(""),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update(data)
      .eq("id", context.userId);

    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("reports")
      .select("id, title, type, summary, content, created_at, employee:ai_employees(name, slug, role_title)")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getEmployeeActivity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ slug: z.string().min(1).max(120) }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: employee } = await supabase
      .from("ai_employees")
      .select("id")
      .eq("slug", data.slug)
      .maybeSingle();

    if (!employee) return [];

    const { data: tasks, error } = await supabase
      .from("ai_tasks")
      .select("id, task_name, input, status, result, created_at")
      .eq("user_id", userId)
      .eq("employee_id", employee.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) throw new Error(error.message);
    return tasks ?? [];
  });
