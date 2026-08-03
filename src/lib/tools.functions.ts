import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const PERMISSION_LEVELS = ["full", "approval", "disabled"] as const;
export type PermissionLevel = (typeof PERMISSION_LEVELS)[number];

export const getToolRegistry = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [{ data: subs }, { data: permissions }, { data: logs }, { data: integrations }] =
      await Promise.all([
        supabase
          .from("user_subscriptions")
          .select(
            "employee:ai_employees(id, name, role_title, category, accent, slug, available_tools)",
          )
          .eq("user_id", userId)
          .eq("status", "active"),
        supabase
          .from("employee_tool_permissions")
          .select("id, employee_id, tool_id, permission")
          .eq("user_id", userId),
        supabase
          .from("tool_activity_logs")
          .select(
            "id, tool_id, action, outcome, created_at, employee:ai_employees(name, accent), task:ai_tasks(task_name)",
          )
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase.from("user_integrations").select("provider, status").eq("user_id", userId),
      ]);

    return {
      employees: (subs ?? [])
        .map(
          (s) =>
            s.employee as unknown as {
              id: string;
              name: string;
              role_title: string;
              category: string;
              accent: string;
              slug: string;
              available_tools: string[] | null;
            },
        )
        .filter(Boolean),
      permissions: permissions ?? [],
      logs: logs ?? [],
      integrations: integrations ?? [],
    };
  });

export const setToolPermission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        employeeId: z.string().uuid(),
        toolId: z.string().min(1).max(80),
        permission: z.enum(PERMISSION_LEVELS),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("employee_tool_permissions").upsert(
      {
        user_id: context.userId,
        employee_id: data.employeeId,
        tool_id: data.toolId,
        permission: data.permission,
      },
      { onConflict: "user_id,employee_id,tool_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });
