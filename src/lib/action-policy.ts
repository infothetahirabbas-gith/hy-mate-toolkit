import type { RiskLevel } from "./connectors";

export type RiskPolicyRow = {
  target_type: string;
  target_key: string;
  requires_approval: boolean;
};

/** Default: reads run automatically, everything that writes or sends needs a human. */
export const DEFAULT_POLICY: Record<RiskLevel, boolean> = {
  low: false,
  medium: true,
  high: true,
};

export function needsApproval(
  policies: RiskPolicyRow[],
  risk: RiskLevel,
  connectorId: string | null,
): boolean {
  const toolRule = connectorId
    ? policies.find((p) => p.target_type === "connector" && p.target_key === connectorId)
    : undefined;
  if (toolRule) return toolRule.requires_approval;

  const riskRule = policies.find((p) => p.target_type === "risk" && p.target_key === risk);
  if (riskRule) return riskRule.requires_approval;

  return DEFAULT_POLICY[risk];
}

export const ACTION_STATUS_COPY: Record<string, string> = {
  planned: "Planned",
  awaiting_approval: "Awaiting approval",
  approved: "Ready to run",
  running: "Running",
  succeeded: "Completed",
  failed: "Failed",
  rejected: "Rejected",
  skipped: "Skipped",
};
