import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import type { AiEmployeeResult } from "./ai-types";

export const runEmployeeTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        slug: z.string().min(1).max(120),
        input: z.string().trim().min(3).max(1000),
        taskName: z.string().trim().max(120).default(""),
        taskType: z.string().trim().max(60).default("general"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: employee, error: employeeError } = await supabase
      .from("ai_employees")
      .select("id, name, role_title, category, persona, skills, features")
      .eq("slug", data.slug)
      .eq("is_active", true)
      .maybeSingle();

    if (employeeError) throw new Error(employeeError.message);
    if (!employee) throw new Error("That AI employee does not exist.");

    const { data: subscription } = await supabase
      .from("user_subscriptions")
      .select("id, status")
      .eq("user_id", userId)
      .eq("employee_id", employee.id)
      .maybeSingle();

    if (!subscription || subscription.status !== "active") {
      throw new Error("Activate this AI employee before assigning work.");
    }

    const [{ data: business }, { data: history }] = await Promise.all([
      supabase.from("business_profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabase
        .from("ai_tasks")
        .select("task_name, input, result")
        .eq("user_id", userId)
        .eq("employee_id", employee.id)
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(3),
    ]);

    const taskName = data.taskName || `${employee.role_title} run`;

    const { data: task, error: taskError } = await supabase
      .from("ai_tasks")
      .insert({
        user_id: userId,
        employee_id: employee.id,
        task_name: taskName,
        task_type: data.taskType,
        input: data.input,
        status: "running",
      })
      .select("id")
      .single();

    if (taskError) throw new Error(taskError.message);

    try {
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
        taskName,
        input: data.input,
      });

      await supabase
        .from("ai_tasks")
        .update({
          status: "completed",
          result: JSON.parse(JSON.stringify(result)),
          completed_at: new Date().toISOString(),
        })
        .eq("id", task.id)
        .eq("user_id", userId);

      await supabase.from("reports").insert({
        user_id: userId,
        employee_id: employee.id,
        task_id: task.id,
        type: employee.category.toLowerCase(),
        report_type: data.taskType,
        title: result.headline || taskName,
        summary: result.summary,
        content: JSON.parse(JSON.stringify(result)),
      });

      return { taskId: task.id, result: result as AiEmployeeResult };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      await supabase
        .from("ai_tasks")
        .update({ status: "failed", error: message })
        .eq("id", task.id)
        .eq("user_id", userId);
      throw new Error(message);
    }
  });
