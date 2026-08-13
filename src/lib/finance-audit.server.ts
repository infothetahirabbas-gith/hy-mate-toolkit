import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type Client = SupabaseClient<Database>;

/** Every finance mutation is written to the shared immutable audit log. */
export async function logFinance(
  supabase: Client,
  userId: string,
  entry: {
    action: string;
    resourceType: string;
    resourceId?: string | null;
    actorType?: "user" | "ai";
    actorLabel?: string | null;
    previous?: unknown;
    next?: unknown;
    metadata?: Record<string, unknown>;
    risk?: string | null;
    result?: "success" | "failure" | "blocked";
  },
) {
  await supabase.from("audit_logs").insert({
    user_id: userId,
    actor_type: entry.actorType ?? "user",
    actor_label: entry.actorLabel ?? null,
    action: entry.action,
    resource_type: entry.resourceType,
    resource_id: entry.resourceId ?? null,
    previous_value: entry.previous ? JSON.parse(JSON.stringify(entry.previous)) : null,
    new_value: entry.next ? JSON.parse(JSON.stringify(entry.next)) : null,
    metadata: JSON.parse(JSON.stringify(entry.metadata ?? {})),
    risk: entry.risk ?? null,
    result: entry.result ?? "success",
  });
}

/** Returns the user's finance guardrails, creating defaults on first use. */
export async function financeSettings(supabase: Client, userId: string) {
  const { data } = await supabase.from("fin_settings").select("*").eq("user_id", userId).maybeSingle();
  if (data) return data;
  const { data: created } = await supabase
    .from("fin_settings")
    .upsert({ user_id: userId }, { onConflict: "user_id" })
    .select("*")
    .maybeSingle();
  return created;
}

/** Central oversight rule: what must a human sign off on? */
export function requiresHumanApproval(
  settings: { autonomy_level: string; approval_threshold: number | string; require_approval_high_risk: boolean } | null,
  args: { amount?: number; risk?: string; regulated?: boolean },
) {
  if (args.regulated) return { required: true, reason: "Regulated or irreversible financial action." };
  const level = settings?.autonomy_level ?? "assisted";
  const threshold = Number(settings?.approval_threshold ?? 1000);
  if (level === "observe") return { required: true, reason: "Autonomy is set to observe only." };
  if (level === "assisted") return { required: true, reason: "Autonomy is set to assisted — every action needs approval." };
  if ((settings?.require_approval_high_risk ?? true) && args.risk === "high") {
    return { required: true, reason: "High-risk actions always need a human." };
  }
  if ((args.amount ?? 0) > threshold) {
    return { required: true, reason: `Amount exceeds your approval threshold of ${threshold}.` };
  }
  return { required: false, reason: "Within your configured autonomy limits." };
}
