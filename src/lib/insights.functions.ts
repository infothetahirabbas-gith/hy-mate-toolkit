import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type TaskRow = {
  id: string;
  task_name: string;
  task_type: string;
  status: string;
  input: string | null;
  created_at: string;
  completed_at: string | null;
  employee: { name: string; slug: string; role_title: string } | null;
};

export type IntegrationRow = {
  id: string;
  provider: string;
  category: string;
  status: string;
  account_label: string | null;
  connected_at: string;
};

export const getTasks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("ai_tasks")
      .select(
        "id, task_name, task_type, status, input, created_at, completed_at, employee:ai_employees(name, slug, role_title)",
      )
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as TaskRow[];
  });

export const getAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [{ data: tasks }, { data: reports }, { data: subs }] = await Promise.all([
      supabase
        .from("ai_tasks")
        .select("id, status, created_at, employee:ai_employees(name)")
        .eq("user_id", userId),
      supabase.from("reports").select("id, created_at").eq("user_id", userId),
      supabase
        .from("user_subscriptions")
        .select("status, price_monthly, employee:ai_employees(name)")
        .eq("user_id", userId),
    ]);

    const allTasks = tasks ?? [];
    const completed = allTasks.filter((t) => t.status === "completed").length;
    const failed = allTasks.filter((t) => t.status === "failed").length;
    const running = allTasks.filter((t) => t.status === "pending" || t.status === "processing").length;

    const byEmployee = new Map<string, number>();
    for (const task of allTasks) {
      const name = (task.employee as { name?: string } | null)?.name ?? "Unknown";
      byEmployee.set(name, (byEmployee.get(name) ?? 0) + 1);
    }

    const months: { label: string; tasks: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i -= 1) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      months.push({
        label: start.toLocaleString("en", { month: "short" }),
        tasks: allTasks.filter((t) => {
          const at = new Date(t.created_at);
          return at >= start && at < end;
        }).length,
      });
    }

    const active = (subs ?? []).filter((s) => s.status === "active");

    return {
      totals: {
        tasks: allTasks.length,
        completed,
        failed,
        running,
        reports: (reports ?? []).length,
        activeEmployees: active.length,
        monthlySpend: active.reduce((sum, s) => sum + (s.price_monthly ?? 0), 0),
        hoursSaved: completed * 3,
        successRate: allTasks.length ? Math.round((completed / allTasks.length) * 100) : 0,
      },
      months,
      leaderboard: [...byEmployee.entries()]
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6),
    };
  });

export const listIntegrations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_integrations")
      .select("id, provider, category, status, account_label, connected_at")
      .eq("user_id", context.userId);

    if (error) throw new Error(error.message);
    return (data ?? []) as IntegrationRow[];
  });

export const toggleIntegration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        provider: z.string().trim().min(1).max(80),
        category: z.string().trim().min(1).max(80),
        connect: z.boolean(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    if (!data.connect) {
      const { error } = await supabase
        .from("user_integrations")
        .delete()
        .eq("user_id", userId)
        .eq("provider", data.provider);
      if (error) throw new Error(error.message);
      return { ok: true, connected: false };
    }

    const { error } = await supabase.from("user_integrations").upsert(
      {
        user_id: userId,
        provider: data.provider,
        category: data.category,
        status: "connected",
        connected_at: new Date().toISOString(),
      },
      { onConflict: "user_id,provider" },
    );

    if (error) throw new Error(error.message);
    return { ok: true, connected: true };
  });
