import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* ------------------------------------------------------------------ knowledge */

export const listKnowledge = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("knowledge_documents")
      .select("id, title, doc_type, source_url, content, employee_id, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveKnowledgeDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        title: z.string().trim().min(2).max(160),
        doc_type: z.enum(["website", "document", "brand", "product", "faq", "note"]),
        source_url: z.string().trim().max(500).optional().or(z.literal("")),
        content: z.string().trim().min(3).max(20000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const payload = {
      user_id: userId,
      title: data.title,
      doc_type: data.doc_type,
      source_url: data.source_url || null,
      content: data.content,
    };

    const query = data.id
      ? supabase.from("knowledge_documents").update(payload).eq("id", data.id).eq("user_id", userId)
      : supabase.from("knowledge_documents").insert(payload);

    const { error } = await query;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteKnowledgeDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("knowledge_documents")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* --------------------------------------------------------------------- memory */

export const listMemories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("agent_memories")
      .select("id, memory_type, category, content, importance, employee_id, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const addMemory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        content: z.string().trim().min(4).max(400),
        category: z.enum(["business", "preference", "decision"]).default("business"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("agent_memories").insert({
      user_id: context.userId,
      memory_type: "long_term",
      category: data.category,
      content: data.content,
      importance: 4,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteMemory = createServerFn({ method: "POST" })
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

/* ----------------------------------------------------------------- chat workspace */

export const getAgentConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ slug: z.string().min(1).max(120) }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: employee, error: employeeError } = await supabase
      .from("ai_employees")
      .select("id")
      .eq("slug", data.slug)
      .maybeSingle();
    if (employeeError) throw new Error(employeeError.message);
    if (!employee) throw new Error("That AI employee does not exist.");

    const { data: conversation } = await supabase
      .from("agent_conversations")
      .select("id")
      .eq("user_id", userId)
      .eq("employee_id", employee.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!conversation) return { conversationId: null, messages: [] };

    const { data: messages, error: messagesError } = await supabase
      .from("agent_messages")
      .select("id, role, content, created_at")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true });
    if (messagesError) throw new Error(messagesError.message);

    return { conversationId: conversation.id, messages: messages ?? [] };
  });

export const sendAgentMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        slug: z.string().min(1).max(120),
        conversationId: z.string().uuid().nullable().default(null),
        message: z.string().trim().min(1).max(4000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: employee, error: employeeError } = await supabase
      .from("ai_employees")
      .select(
        "id, name, role_title, category, department, gender, persona, personality, skills, daily_tasks, available_tools, main_responsibility, system_prompt",
      )
      .eq("slug", data.slug)
      .eq("is_active", true)
      .maybeSingle();
    if (employeeError) throw new Error(employeeError.message);
    if (!employee) throw new Error("That AI employee does not exist.");

    const { data: subscription } = await supabase
      .from("user_subscriptions")
      .select("status")
      .eq("user_id", userId)
      .eq("employee_id", employee.id)
      .maybeSingle();
    if (!subscription || subscription.status !== "active") {
      throw new Error("Activate this AI employee before chatting with them.");
    }

    let conversationId = data.conversationId;
    if (!conversationId) {
      const { data: created, error: createError } = await supabase
        .from("agent_conversations")
        .insert({
          user_id: userId,
          employee_id: employee.id,
          title: data.message.slice(0, 60),
        })
        .select("id")
        .single();
      if (createError) throw new Error(createError.message);
      conversationId = created.id;
    }

    const [{ data: business }, { data: knowledge }, { data: memories }, { data: history }, { data: feedback }] =
      await Promise.all([
        supabase.from("business_profiles").select("*").eq("user_id", userId).maybeSingle(),
        supabase
          .from("knowledge_documents")
          .select("title, doc_type, content")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(12),
        supabase
          .from("agent_memories")
          .select("memory_type, category, content")
          .eq("user_id", userId)
          .order("importance", { ascending: false })
          .limit(30),
        supabase
          .from("agent_messages")
          .select("role, content")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true })
          .limit(30),
        supabase
          .from("task_feedback")
          .select("correction")
          .eq("user_id", userId)
          .eq("employee_id", employee.id)
          .not("correction", "is", null)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

    const { buildAgentContext, chatWithAgent, extractMemories } = await import(
      "./agent-brain.server"
    );

    const instructions = buildAgentContext({
      identity: {
        name: employee.name,
        role_title: employee.role_title,
        category: employee.category,
        department: employee.department,
        gender: employee.gender,
        persona: employee.persona,
        personality: employee.personality ?? [],
        skills: employee.skills ?? [],
        daily_tasks: employee.daily_tasks ?? [],
        available_tools: employee.available_tools ?? [],
        main_responsibility: employee.main_responsibility,
        system_prompt: employee.system_prompt,
      },
      business: business ?? null,
      knowledge: knowledge ?? [],
      memories: memories ?? [],
      corrections: (feedback ?? [])
        .map((row) => row.correction)
        .filter((value): value is string => Boolean(value)),
    });

    const reply = await chatWithAgent({
      instructions,
      history: (history ?? []).map((row) => ({
        role: row.role === "assistant" ? ("assistant" as const) : ("user" as const),
        content: row.content,
      })),
      message: data.message,
    });

    const { error: insertError } = await supabase.from("agent_messages").insert([
      { conversation_id: conversationId, user_id: userId, role: "user", content: data.message },
      { conversation_id: conversationId, user_id: userId, role: "assistant", content: reply },
    ]);
    if (insertError) throw new Error(insertError.message);

    await supabase
      .from("agent_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId)
      .eq("user_id", userId);

    const learned = await extractMemories({
      employeeName: employee.name,
      message: data.message,
      reply,
    });
    if (learned.length) {
      await supabase.from("agent_memories").insert(
        learned.map((item) => ({
          user_id: userId,
          employee_id: employee.id,
          memory_type: "long_term",
          category: item.category,
          content: item.content,
          importance: 3,
        })),
      );
    }

    return { conversationId, reply, learned: learned.length };
  });

/* ------------------------------------------------------------- feedback & learning */

export const submitTaskFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        taskId: z.string().uuid(),
        rating: z.number().int().min(1).max(5),
        correction: z.string().trim().max(600).optional().or(z.literal("")),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: task, error: taskError } = await supabase
      .from("ai_tasks")
      .select("id, employee_id")
      .eq("id", data.taskId)
      .eq("user_id", userId)
      .maybeSingle();
    if (taskError) throw new Error(taskError.message);
    if (!task) throw new Error("That task does not exist.");

    const { error } = await supabase.from("task_feedback").insert({
      user_id: userId,
      employee_id: task.employee_id,
      task_id: task.id,
      rating: data.rating,
      correction: data.correction || null,
    });
    if (error) throw new Error(error.message);

    if (data.correction) {
      await supabase.from("agent_memories").insert({
        user_id: userId,
        employee_id: task.employee_id,
        memory_type: "long_term",
        category: "preference",
        content: `Client correction: ${data.correction}`,
        importance: 5,
      });
    }

    return { ok: true };
  });

/* --------------------------------------------------------------- performance layer */

export const getWorkforcePerformance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [{ data: subscriptions }, { data: tasks }, { data: reports }, { data: feedback }] =
      await Promise.all([
        supabase
          .from("user_subscriptions")
          .select("employee_id, status, ai_employees(name, role_title, slug, accent)")
          .eq("user_id", userId),
        supabase.from("ai_tasks").select("employee_id, status, created_at").eq("user_id", userId),
        supabase.from("reports").select("employee_id").eq("user_id", userId),
        supabase.from("task_feedback").select("employee_id, rating").eq("user_id", userId),
      ]);

    return (subscriptions ?? [])
      .filter((row) => row.status === "active" && row.ai_employees)
      .map((row) => {
        const employeeTasks = (tasks ?? []).filter((t) => t.employee_id === row.employee_id);
        const completed = employeeTasks.filter((t) => t.status === "completed").length;
        const failed = employeeTasks.filter((t) => t.status === "failed").length;
        const ratings = (feedback ?? []).filter((f) => f.employee_id === row.employee_id);
        const employee = row.ai_employees as unknown as {
          name: string;
          role_title: string;
          slug: string;
          accent: string;
        };

        return {
          employeeId: row.employee_id,
          name: employee.name,
          roleTitle: employee.role_title,
          slug: employee.slug,
          accent: employee.accent,
          tasks: employeeTasks.length,
          completed,
          failed,
          reports: (reports ?? []).filter((r) => r.employee_id === row.employee_id).length,
          hoursSaved: Math.round(completed * 2.5),
          successRate: employeeTasks.length
            ? Math.round((completed / employeeTasks.length) * 100)
            : 0,
          rating: ratings.length
            ? Number((ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(1))
            : null,
        };
      });
  });
