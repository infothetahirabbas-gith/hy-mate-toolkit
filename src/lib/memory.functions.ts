import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const MEMORY_CATEGORIES = [
  "business",
  "preference",
  "decision",
  "task_history",
  "communication",
] as const;

export const MEMORY_STATUSES = ["pending", "approved", "rejected", "disabled"] as const;
export const MEMORY_SOURCES = ["chat", "task", "document", "integration", "manual"] as const;

export const getMemoryCenter = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [{ data: memories, error }, { data: settings }, { data: subs }] = await Promise.all([
      supabase
        .from("agent_memories")
        .select(
          "id, memory_type, category, content, importance, status, source, confidence, employee_id, created_at, employee:ai_employees(id, name, role_title, accent, slug)",
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(400),
      supabase
        .from("memory_settings")
        .select("auto_save, require_approval")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("user_subscriptions")
        .select("employee:ai_employees(id, name, role_title, accent, slug)")
        .eq("user_id", userId)
        .eq("status", "active"),
    ]);

    if (error) throw new Error(error.message);

    return {
      memories: memories ?? [],
      settings: settings ?? { auto_save: true, require_approval: false },
      employees: (subs ?? [])
        .map((s) => s.employee as unknown as { id: string; name: string; role_title: string; accent: string; slug: string })
        .filter(Boolean),
    };
  });

export const saveMemory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        content: z.string().trim().min(4).max(600),
        category: z.enum(MEMORY_CATEGORIES).default("business"),
        employeeId: z.string().uuid().nullable().default(null),
        importance: z.number().int().min(1).max(5).default(4),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const payload = {
      content: data.content,
      category: data.category,
      employee_id: data.employeeId,
      importance: data.importance,
    };

    if (data.id) {
      const { error } = await supabase
        .from("agent_memories")
        .update(payload)
        .eq("id", data.id)
        .eq("user_id", userId);
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    const { error } = await supabase.from("agent_memories").insert({
      ...payload,
      user_id: userId,
      memory_type: "long_term",
      status: "approved",
      source: "manual",
      confidence: 100,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setMemoryStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), status: z.enum(MEMORY_STATUSES) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("agent_memories")
      .update({ status: data.status })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeMemory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("agent_memories")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const clearAllMemories = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("agent_memories")
      .delete()
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateMemorySettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ autoSave: z.boolean(), requireApproval: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("memory_settings").upsert(
      {
        user_id: context.userId,
        auto_save: data.autoSave,
        require_approval: data.requireApproval,
      },
      { onConflict: "user_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });
