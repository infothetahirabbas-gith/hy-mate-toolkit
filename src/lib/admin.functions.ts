import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

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

export const adminListCategories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as never);
    const { data, error } = await context.supabase
      .from("ai_employee_categories")
      .select("id, name, slug, description, sort_order")
      .order("sort_order");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminSaveCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        name: z.string().trim().min(1).max(60),
        description: z.string().trim().max(300).default(""),
        sort_order: z.number().int().min(0).max(999).default(0),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const { error } = await context.supabase
      .from("ai_employee_categories")
      .upsert({ ...(data.id ? { id: data.id } : {}), name: data.name, slug, description: data.description, sort_order: data.sort_order }, { onConflict: "slug" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { error } = await context.supabase
      .from("ai_employee_categories")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminUpdateEmployee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        price_monthly: z.number().int().min(0).max(100000).optional(),
        is_active: z.boolean().optional(),
        status: z.enum(["available", "beta", "retired"]).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const patch: { price_monthly?: number; is_active?: boolean; status?: string } = {};
    if (data.price_monthly !== undefined) patch.price_monthly = data.price_monthly;
    if (data.is_active !== undefined) patch.is_active = data.is_active;
    if (data.status !== undefined) patch.status = data.status;
    const { error } = await context.supabase.from("ai_employees").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminUpdateSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["active", "paused", "cancelled"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { error } = await context.supabase
      .from("user_subscriptions")
      .update({
        status: data.status,
        cancelled_at: data.status === "cancelled" ? new Date().toISOString() : null,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
