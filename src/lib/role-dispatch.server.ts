import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { connectorForTool } from "@/lib/connectors";

// Centralized, server-only role / capability / authority / tool matching for
// the AI Manager (Command Center). The planner in command-center.server.ts may
// PROPOSE a capability for a goal step, but this module is the only authority
// that can say a given AI employee actually qualifies to run it. Nothing here
// trusts the frontend or the language model for authority/permission decisions.

export const SENIORITY_AUTHORITY: Record<string, number> = {
  assistant: 1,
  specialist: 2,
  senior_specialist: 3,
  manager: 4,
  ai_manager: 5,
};

export type ToolStatus = "available" | "approval_required" | "not_granted" | "not_connected";

export type CandidateToolCheck = {
  toolId: string;
  status: ToolStatus;
  reason: string;
};

export type DispatchCandidate = {
  subscriptionId: string;
  employeeId: string;
  name: string;
  slug: string;
  roleTitle: string;
  department: string | null;
  seniorityLevel: string;
  authorityLevel: number;
  openTasks: number;
  toolChecks: CandidateToolCheck[];
  qualifies: boolean;
  blockedReasons: string[];
};

export type CapabilityDispatchResult = {
  capability: {
    slug: string;
    name: string;
    departmentSlug: string | null;
    requiredTools: string[];
    allowedSeniorityLevels: string[];
  } | null;
  qualified: DispatchCandidate[];
  blocked: DispatchCandidate[];
  best: DispatchCandidate | null;
};

type RosterRow = {
  id: string;
  status: string;
  employee: {
    id: string;
    name: string;
    slug: string;
    role_title: string;
    department: string | null;
    department_slug: string | null;
    seniority_level: string;
    authority_level: number;
    capability_slugs: string[] | null;
    available_tools: string[] | null;
  } | null;
};

/** Real capability + authority + tool/permission/integration aware matching.
 * This is the only place that decides whether an AI employee can be
 * assigned a piece of work. Never trust a raw employee pick alone. */
export async function matchCapabilityCandidates(
  supabase: SupabaseClient<Database>,
  userId: string,
  params: { capabilitySlug: string; minAuthorityLevel?: number | null },
): Promise<CapabilityDispatchResult> {
  const { data: capabilityRow } = await (supabase.from("ai_capabilities") as any)
    .select("*")
    .eq("slug", params.capabilitySlug)
    .maybeSingle();

  if (!capabilityRow) {
    return { capability: null, qualified: [], blocked: [], best: null };
  }

  const requiredTools: string[] = capabilityRow.required_tools ?? [];
  const allowedSeniority: string[] = capabilityRow.allowed_seniority_levels ?? [];
  const minAuthority = params.minAuthorityLevel ?? null;

  const { data: subs } = await (supabase.from("user_subscriptions") as any)
    .select(
      "id, status, employee:ai_employees(id, name, slug, role_title, department, department_slug, seniority_level, authority_level, capability_slugs, available_tools)",
    )
    .eq("user_id", userId)
    .eq("status", "active");

  const holders = ((subs ?? []) as RosterRow[]).filter(
    (s) => s.employee && (s.employee.capability_slugs ?? []).includes(params.capabilitySlug),
  );

  const capabilitySummary = {
    slug: capabilityRow.slug,
    name: capabilityRow.name,
    departmentSlug: capabilityRow.department_slug,
    requiredTools,
    allowedSeniorityLevels: allowedSeniority,
  };

  if (holders.length === 0) {
    return { capability: capabilitySummary, qualified: [], blocked: [], best: null };
  }

  const [{ data: permissionRows }, { data: integrationRows }] = await Promise.all([
    supabase
      .from("employee_tool_permissions")
      .select("employee_id, tool_id, permission")
      .eq("user_id", userId)
      .in(
        "employee_id",
        holders.map((h) => h.employee!.id),
      ),
    supabase.from("user_integrations").select("connector_id, provider, status").eq("user_id", userId),
  ]);

  const connectedConnectorIds = new Set(
    (integrationRows ?? [])
      .filter((r) => r.status === "connected")
      .map((r) => r.connector_id)
      .filter(Boolean) as string[],
  );

  const candidates: DispatchCandidate[] = await Promise.all(
    holders.map(async (h) => {
      const emp = h.employee!;
      const { count } = await supabase
        .from("ai_tasks")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("employee_id", emp.id)
        .in("status", ["incomplete", "processing", "review"]);

      const blockedReasons: string[] = [];

      const seniorityOk = allowedSeniority.length === 0 || allowedSeniority.includes(emp.seniority_level);
      if (!seniorityOk) {
        blockedReasons.push(
          `${emp.name} seniority (${emp.seniority_level}) does not meet what this capability requires.`,
        );
      }

      const authorityOk = minAuthority == null || emp.authority_level >= minAuthority;
      if (!authorityOk) {
        blockedReasons.push(
          `${emp.name} authority level (${emp.authority_level}) is below the required level (${minAuthority}) for this work.`,
        );
      }

      const toolChecks: CandidateToolCheck[] = requiredTools.map((toolId) => {
        const permissionRow = (permissionRows ?? []).find(
          (p) => p.employee_id === emp.id && p.tool_id === toolId,
        );
        const connector = connectorForTool(toolId);
        const connectorConnected = connector ? connectedConnectorIds.has(connector.connectorId) : true;

        if (permissionRow?.permission === "disabled") {
          return { toolId, status: "not_granted" as const, reason: `${toolId} access is disabled for this employee.` };
        }
        if (connector && !connectorConnected) {
          return {
            toolId,
            status: "not_connected" as const,
            reason: `${connector.name} is not connected. Connect it on the Integrations page.`,
          };
        }
        if (!permissionRow && !(emp.available_tools ?? []).includes(toolId)) {
          return { toolId, status: "not_granted" as const, reason: `${toolId} has not been granted to this employee.` };
        }
        if (permissionRow?.permission === "approval") {
          return { toolId, status: "approval_required" as const, reason: `${toolId} requires approval to use.` };
        }
        return { toolId, status: "available" as const, reason: `${toolId} is available.` };
      });

      for (const check of toolChecks) {
        if (check.status === "not_granted" || check.status === "not_connected") {
          blockedReasons.push(check.reason);
        }
      }

      return {
        subscriptionId: h.id,
        employeeId: emp.id,
        name: emp.name,
        slug: emp.slug,
        roleTitle: emp.role_title,
        department: emp.department,
        seniorityLevel: emp.seniority_level,
        authorityLevel: emp.authority_level,
        openTasks: count ?? 0,
        toolChecks,
        qualifies: blockedReasons.length === 0,
        blockedReasons,
      } satisfies DispatchCandidate;
    }),
  );

  const qualified = candidates
    .filter((c) => c.qualifies)
    .sort((a, b) => b.authorityLevel - a.authorityLevel || a.openTasks - b.openTasks);
  const blocked = candidates.filter((c) => !c.qualifies);

  return { capability: capabilitySummary, qualified, blocked, best: qualified[0] ?? null };
}

/** Builds the human-readable explanation the AI Manager shows for why an
 * employee was (or was not) assigned. Reflects only real backend data -
 * never generated text that contradicts the actual selection. */
export function explainAssignment(result: CapabilityDispatchResult): string {
  if (!result.capability) return "";
  const total = result.qualified.length + result.blocked.length;
  if (result.best) {
    const others = result.qualified.length - 1;
    const alt =
      others > 0
        ? ` They were ranked above ${others} other qualified employee${others === 1 ? "" : "s"} based on authority and current workload.`
        : "";
    return `Assigned to ${result.best.name} because they hold the ${result.capability.name} capability, have authority level ${result.best.authorityLevel}/5, and currently have ${result.best.openTasks} open task${result.best.openTasks === 1 ? "" : "s"}.${alt}`;
  }
  if (total > 0) {
    const reasons = result.blocked.flatMap((b) => b.blockedReasons).slice(0, 3);
    return `No employee currently qualifies for ${result.capability.name}. ${reasons.join(" ")}`.trim();
  }
  return `No hired employee holds the ${result.capability.name} capability yet.`;
}
