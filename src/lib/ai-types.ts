export type AiMetric = { label: string; value: string; hint?: string };
export type AiFinding = { title: string; severity: string; detail: string };
export type AiOpportunity = { title: string; detail: string; impact?: string };
export type AiActionStep = { title: string; detail: string; effort?: string; impact?: string };

export type AiEmployeeResult = {
  headline: string;
  summary: string;
  score: number | null;
  scoreLabel: string | null;
  metrics: AiMetric[];
  findings: AiFinding[];
  opportunities: AiOpportunity[];
  actionPlan: AiActionStep[];
  closingNote: string | null;
};

export const emptyAiResult: AiEmployeeResult = {
  headline: "",
  summary: "",
  score: null,
  scoreLabel: null,
  metrics: [],
  findings: [],
  opportunities: [],
  actionPlan: [],
  closingNote: null,
};
