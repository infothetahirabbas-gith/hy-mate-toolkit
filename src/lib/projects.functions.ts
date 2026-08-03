import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listProjects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [{ data: projects, error }, { data: members }] = await Promise.all([
      supabase
        .from("ai_projects")
        .select("id, name, description, goal, status, progress, due_date, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("ai_project_members")
        .select("project_id, status, project_role, employee:ai_employees(id, name, role_title, accent)")
        .eq("user_id", userId),
    ]);

    if (error) throw new Error(error.message);

    return (projects ?? []).map((project) => ({
      ...project,
      members: (members ?? [])
        .filter((m) => m.project_id === project.id)
        .map((m) => ({
          status: m.status,
          projectRole: m.project_role,
          employee: m.employee as unknown as {
            id: string;
            name: string;
            role_title: string;
            accent: string;
          },
        })),
    }));
  });

export const getProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: project, error } = await supabase
      .from("ai_projects")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!project) throw new Error("That project does not exist.");

    const [{ data: members }, { data: messages }, { data: tasks }] = await Promise.all([
      supabase
        .from("ai_project_members")
        .select(
          "id, project_role, status, contribution, employee:ai_employees(id, name, role_title, category, accent, slug)",
        )
        .eq("project_id", project.id)
        .eq("user_id", userId),
      supabase
        .from("ai_project_messages")
        .select("id, author, kind, content, created_at, employee:ai_employees(name, accent)")
        .eq("project_id", project.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("ai_tasks")
        .select("id, task_name, status, created_at")
        .eq("project_id", project.id)
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
    ]);

    return {
      project,
      members: members ?? [],
      messages: messages ?? [],
      tasks: tasks ?? [],
    };
  });

export const createProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        name: z.string().trim().min(3).max(140),
        description: z.string().trim().max(1500).default(""),
        goal: z.string().trim().max(600).default(""),
        dueDate: z.string().trim().max(40).default(""),
        sharedKnowledge: z.string().trim().max(4000).default(""),
        employeeIds: z.array(z.string().uuid()).min(1).max(6),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: project, error } = await supabase
      .from("ai_projects")
      .insert({
        user_id: userId,
        name: data.name,
        description: data.description || null,
        goal: data.goal || null,
        shared_knowledge: data.sharedKnowledge || null,
        due_date: data.dueDate ? new Date(data.dueDate).toISOString() : null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const { error: memberError } = await supabase.from("ai_project_members").insert(
      data.employeeIds.map((employeeId, index) => ({
        project_id: project.id,
        user_id: userId,
        employee_id: employeeId,
        project_role: index === 0 ? "lead" : "contributor",
      })),
    );
    if (memberError) throw new Error(memberError.message);

    await supabase.from("ai_project_messages").insert({
      project_id: project.id,
      user_id: userId,
      author: "user",
      kind: "brief",
      content: data.goal || data.description || `Project "${data.name}" created.`,
    });

    return { projectId: project.id };
  });

export const deleteProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("ai_projects")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Runs the whole AI team on the project: each member works in turn, sees the
 * previous members' contributions, posts an internal hand-off message, and the
 * combined result is stored as the project output.
 */
export const runProjectCollaboration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: project } = await supabase
      .from("ai_projects")
      .select("id, name, goal, description, shared_knowledge")
      .eq("id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!project) throw new Error("That project does not exist.");

    const { data: members } = await supabase
      .from("ai_project_members")
      .select(
        "id, employee_id, project_role, employee:ai_employees(id, name, role_title, category, persona, skills, features)",
      )
      .eq("project_id", project.id)
      .eq("user_id", userId);

    if (!members?.length) throw new Error("Assign at least one AI employee to this project.");

    const { data: business } = await supabase
      .from("business_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    const { runAiEmployee } = await import("./ai-employee.server");

    await supabase.from("ai_projects").update({ status: "running", progress: 5 }).eq("id", project.id);

    const contributions: { name: string; role: string; headline: string; summary: string }[] = [];

    for (const [index, member] of members.entries()) {
      const employee = member.employee as unknown as {
        id: string;
        name: string;
        role_title: string;
        category: string;
        persona: string;
        skills: string[] | null;
        features: string[] | null;
      };

      const handoff = contributions.length
        ? `\n\nWork already delivered by your teammates:\n${contributions
            .map((c) => `- ${c.name} (${c.role}): ${c.headline} — ${c.summary}`)
            .join("\n")}\nBuild on their work; do not repeat it.`
        : "";

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
        memory: [],
        taskName: `${project.name} — ${employee.role_title} contribution`,
        input: `Project: ${project.name}
Goal: ${project.goal ?? "not specified"}
Description: ${project.description ?? "not specified"}
Shared knowledge: ${project.shared_knowledge ?? "none"}
Your role on this team: ${member.project_role}.${handoff}

Deliver your part of this project.`,
      });

      const json = JSON.parse(JSON.stringify(result));

      await supabase
        .from("ai_project_members")
        .update({ contribution: json, status: "delivered" })
        .eq("id", member.id);

      await supabase.from("ai_project_messages").insert({
        project_id: project.id,
        user_id: userId,
        employee_id: employee.id,
        author: "agent",
        kind: "contribution",
        content: `**${result.headline}**\n\n${result.summary}${
          result.actionPlan.length
            ? `\n\nHand-off to the team:\n${result.actionPlan
                .slice(0, 3)
                .map((step) => `- ${step.title}`)
                .join("\n")}`
            : ""
        }`,
      });

      await supabase.from("reports").insert({
        user_id: userId,
        employee_id: employee.id,
        type: employee.category.toLowerCase(),
        report_type: "project",
        title: result.headline,
        summary: result.summary,
        content: json,
      });

      contributions.push({
        name: employee.name,
        role: employee.role_title,
        headline: result.headline,
        summary: result.summary,
      });

      await supabase
        .from("ai_projects")
        .update({ progress: Math.round(((index + 1) / members.length) * 100) })
        .eq("id", project.id);
    }

    const finalOutput = {
      generatedAt: new Date().toISOString(),
      contributions,
      recommendation: `The team delivered ${contributions.length} coordinated workstreams for "${project.name}". Review each contribution, then approve the combined plan.`,
    };

    await supabase
      .from("ai_projects")
      .update({ status: "completed", progress: 100, final_output: finalOutput })
      .eq("id", project.id);

    await supabase.from("ai_project_messages").insert({
      project_id: project.id,
      user_id: userId,
      author: "system",
      kind: "summary",
      content: finalOutput.recommendation,
    });

    await supabase.from("notifications").insert({
      user_id: userId,
      kind: "project_completed",
      title: `Your AI team finished "${project.name}"`,
      body: "The combined team output is ready for review.",
    });

    return { contributions: contributions.length };
  });
