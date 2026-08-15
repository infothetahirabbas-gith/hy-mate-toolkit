import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// AI Employee Job Role & Designation System (P0.2)
//
// Mirrors the pattern used in company-brain.functions.ts: the generated
// Supabase `Database` type does not yet know about the new role/designation
// columns added in the 20260815130000 migration (no CLI access in this
// environment to regenerate it), so those specific queries are scoped with
// `as any` / `select("*")` and given hand-written types here instead.

export type ResponsibilityMatrix = {
  own: string[];
  support: string[];
  escalate: string[];
};

export type EmployeeCapability = {
  slug: string;
  name: string;
  description: string | null;
  department_slug: string | null;
  required_tools: string[];
  required_permissions: string[];
  allowed_seniority_levels: string[];
};

export type RoleKpi = { name: string; target: string };

export type EmployeeRoleProfile = {
  subscriptionId: string;
  status: string;
  displayName: string | null;
  activatedAt: string | null;
  employee: {
    id: string;
    slug: string;
    name: string;
    roleTitle: string;
    designation: string;
    department: string | null;
    departmentSlug: string | null;
    teamSlug: string | null;
    seniorityLevel: string;
    authorityLevel: number;
    authorityDescription: string | null;
    primaryMission: string | null;
    accent: string;
  };
  responsibilities: ResponsibilityMatrix;
  capabilities: EmployeeCapability[];
  kpis: RoleKpi[];
  tools: { toolId: string; permission: string }[];
  reportsTo: { subscriptionId: string; name: string; slug: string; roleTitle: string } | null;
  workload: { openTasks: number; completedTasks: number };
};

const AUTHORITY_LABEL: Record<number, string> = {
  1: "Research and recommend",
  2: "Execute approved tasks",
  3: "Make operational decisions within defined limits",
  4: "Assign work to department employees",
  5: "Coordinate departments and business goals",
};

type CatalogRoleRow = {
  id: string;
  slug: string;
  name: string;
  role_title: string;
  designation: string;
  department: string | null;
  department_slug: string | null;
  team_slug: string | null;
  seniority_level: string;
  authority_level: number;
  primary_mission: string | null;
  own_responsibilities: string[] | null;
  support_responsibilities: string[] | null;
  escalate_responsibilities: string[] | null;
  role_kpis: RoleKpi[] | null;
  capability_slugs: string[] | null;
  accent: string;
};

export const getEmployeeRoleProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ slug: z.string().min(1).max(160) }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: employee, error: employeeError } = await (supabase.from("ai_employees") as any)
      .select("*")
      .eq("slug", data.slug)
      .maybeSingle();

    if (employeeError) throw new Error(employeeError.message);
    if (!employee) throw new Error("That AI employee does not exist.");
    const emp = employee as CatalogRoleRow;

    const { data: sub, error: subError } = await (supabase.from("user_subscriptions") as any)
      .select("*")
      .eq("user_id", userId)
      .eq("employee_id", emp.id)
      .maybeSingle();

    if (subError) throw new Error(subError.message);
    if (!sub) throw new Error("Hire this AI employee before viewing their role profile.");

    const capabilitySlugs = emp.capability_slugs ?? [];
    const [{ data: capRows }, { data: toolRows }, { data: tasks }] = await Promise.all([
      capabilitySlugs.length
        ? (supabase.from("ai_capabilities") as any).select("*").in("slug", capabilitySlugs)
        : Promise.resolve({ data: [] as unknown[] }),
      supabase
        .from("employee_tool_permissions")
        .select("tool_id, permission")
        .eq("user_id", userId)
        .eq("employee_id", emp.id),
      supabase.from("ai_tasks").select("status").eq("user_id", userId).eq("employee_id", emp.id),
    ]);

    let reportsTo: EmployeeRoleProfile["reportsTo"] = null;

    if (sub.reporting_manager_subscription_id) {
      const { data: managerSub } = await (supabase.from("user_subscriptions") as any)
        .select("id, employee:ai_employees(name, slug, role_title)")
        .eq("id", sub.reporting_manager_subscription_id)
        .eq("user_id", userId)
        .maybeSingle();
      const mgr = managerSub?.employee as { name: string; slug: string; role_title: string } | undefined;
      if (mgr) {
        reportsTo = { subscriptionId: managerSub.id, name: mgr.name, slug: mgr.slug, roleTitle: mgr.role_title };
      }
    } else if (
      emp.department_slug &&
      emp.seniority_level !== "manager" &&
      emp.seniority_level !== "ai_manager"
    ) {
      // No manually curated manager link yet: resolve the highest-authority
      // active manager hired in the SAME department, but only within this
      // user’s own roster (never crosses into another workspace’s hires).
      const { data: candidates } = await (supabase.from("user_subscriptions") as any)
        .select("id, status, employee:ai_employees(id, name, slug, role_title, department_slug, seniority_level, authority_level)")
        .eq("user_id", userId)
        .eq("status", "active");

      const managers = ((candidates ?? []) as { id: string; employee: CatalogRoleRow }[])
        .filter(
          (c) =>
            c.employee &&
            c.employee.department_slug === emp.department_slug &&
            c.employee.id !== emp.id &&
            (c.employee.seniority_level === "manager" || c.employee.seniority_level === "ai_manager"),
        )
        .sort((a, b) => b.employee.authority_level - a.employee.authority_level);

      if (managers[0]) {
        reportsTo = {
          subscriptionId: managers[0].id,
          name: managers[0].employee.name,
          slug: managers[0].employee.slug,
          roleTitle: managers[0].employee.role_title,
        };
      }
    }

    const capabilities: EmployeeCapability[] = ((capRows ?? []) as any[]).map((row) => ({
      slug: row.slug,
      name: row.name,
      description: row.description,
      department_slug: row.department_slug,
      required_tools: row.required_tools ?? [],
      required_permissions: row.required_permissions ?? [],
      allowed_seniority_levels: row.allowed_seniority_levels ?? [],
    }));

    const allTasks = (tasks ?? []) as { status: string }[];
    const openTasks = allTasks.filter((t) => t.status !== "completed" && t.status !== "failed").length;
    const completedTasks = allTasks.filter((t) => t.status === "completed").length;

    return {
      subscriptionId: sub.id,
      status: sub.status,
      displayName: sub.display_name,
      activatedAt: sub.activated_at,
      employee: {
        id: emp.id,
        slug: emp.slug,
        name: emp.name,
        roleTitle: emp.role_title,
        designation: emp.designation,
        department: emp.department,
        departmentSlug: emp.department_slug,
        teamSlug: emp.team_slug,
        seniorityLevel: emp.seniority_level,
        authorityLevel: emp.authority_level,
        authorityDescription: AUTHORITY_LABEL[emp.authority_level] ?? null,
        primaryMission: emp.primary_mission,
        accent: emp.accent,
      },
      responsibilities: {
        own: emp.own_responsibilities ?? [],
        support: emp.support_responsibilities ?? [],
        escalate: emp.escalate_responsibilities ?? [],
      },
      capabilities,
      kpis: emp.role_kpis ?? [],
      tools: (toolRows ?? []).map((t) => ({ toolId: t.tool_id, permission: t.permission })),
      reportsTo,
      workload: { openTasks, completedTasks },
    } satisfies EmployeeRoleProfile;
  });

/** Read-only registry of what an AI employee CAN eventually do. Execution of
 * most capabilities is intentionally not wired up yet (see PRODUCT_VISION.md);
 * this only defines the architecture + which roles are allowed to hold them. */
export const listCapabilities = createServerFn({ method: "GET" }).handler(async () => {
  const { publicClient } = await import("./catalog.server");
  const { data, error } = await (publicClient().from("ai_capabilities") as any)
    .select("*")
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return ((data ?? []) as any[]).map((row) => ({
    slug: row.slug,
    name: row.name,
    description: row.description,
    department_slug: row.department_slug,
    required_tools: row.required_tools ?? [],
    required_permissions: row.required_permissions ?? [],
    allowed_seniority_levels: row.allowed_seniority_levels ?? [],
  })) as EmployeeCapability[];
});

export type { DispatchCandidate as CapabilityMatch } from "./role-dispatch.server";

/** Role-matching endpoint used by the frontend: given a capability, find
 * this workspace’s active hires who hold it, running the full real
 * capability -> authority -> tool -> permission -> integration ->
 * workload validation chain from role-dispatch.server.ts. Nothing here
 * invents a match — unqualified holders are returned separately with the
 * real reason they were rejected. */
export const matchEmployeesForCapability = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        capabilitySlug: z.string().min(1).max(120),
        minAuthorityLevel: z.number().min(1).max(5).nullish(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { matchCapabilityCandidates } = await import("./role-dispatch.server");
    const result = await matchCapabilityCandidates(supabase, userId, {
      capabilitySlug: data.capabilitySlug,
      minAuthorityLevel: data.minAuthorityLevel ?? null,
    });
    return result.qualified;
  });
