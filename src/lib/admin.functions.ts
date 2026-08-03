import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: {
  supabase: { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown }> };
  userId: string;
}) {
  const { data } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (data !== true) throw new Error("Admin access required.");
}

export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as never);
    const { supabase } = context;

    const [profiles, subscriptions, employees, tasks, reports] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, name, email, company, industry, created_at")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("user_subscriptions")
        .select(
          "id, status, plan, price_monthly, subscription_date, user_id, employee:ai_employees(name, role_title, slug)",
        )
        .order("subscription_date", { ascending: false })
        .limit(100),
      supabase
        .from("ai_employees")
        .select("id, slug, name, role_title, category, price_monthly, is_active")
        .order("sort_order"),
      supabase.from("ai_tasks").select("id, status, created_at").limit(1000),
      supabase.from("reports").select("id, created_at").limit(1000),
    ]);

    const subs = subscriptions.data ?? [];
    const activeSubs = subs.filter((s) => s.status === "active");

    return {
      users: profiles.data ?? [],
      subscriptions: subs,
      employees: employees.data ?? [],
      metrics: {
        totalUsers: (profiles.data ?? []).length,
        activeSubscriptions: activeSubs.length,
        mrr: activeSubs.reduce((sum, s) => sum + (s.price_monthly ?? 0), 0),
        tasksRun: (tasks.data ?? []).length,
        tasksCompleted: (tasks.data ?? []).filter((t) => t.status === "completed").length,
        reportsGenerated: (reports.data ?? []).length,
      },
    };
  });
