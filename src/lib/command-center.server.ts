const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/responses";
const MODEL = "openai/gpt-5.6-sol";

export type PlannedStep = {
  title: string;
  detail: string;
  departmentSlug: string | null;
  ownerRole: string;
  employeeSlug: string | null;
  risk: "low" | "medium" | "high";
  requiresApproval: boolean;
  expectedOutcome: string;
};

export type GoalPlan = {
  summary: string;
  strategy: { phase: string; focus: string }[];
  risks: string[];
  kpis: { name: string; target: string }[];
  steps: PlannedStep[];
};

async function readStreamedText(response: Response) {
  const body = response.body;
  if (!body) throw new Error("The AI gateway returned an empty response.");
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const event = JSON.parse(payload) as {
          type?: string;
          delta?: string;
          response?: { output_text?: string };
        };
        if (event.type === "response.output_text.delta" && typeof event.delta === "string") {
          text += event.delta;
        } else if (
          event.type === "response.completed" &&
          !text &&
          typeof event.response?.output_text === "string"
        ) {
          text = event.response.output_text;
        }
      } catch {
        /* keep-alive frame */
      }
    }
  }
  return text.trim();
}

function extractJson(text: string): unknown {
  const cleaned = text
    .replace(/^\s*```(?:json)?/i, "")
    .replace(/```\s*$/, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error("The strategy engine returned a response we could not read.");
  }
}

const INSTRUCTIONS = `You are the AI Chief of Staff of a company that runs an AI workforce.

The human CEO gives you a business goal. You turn it into an execution plan that the company's
existing AI employees can actually run.

Hard rules:
- Only assign work to AI employees listed in ROSTER. Use their exact "slug". If no roster member fits a step, set employeeSlug to null and name the role that is missing in ownerRole.
- Never claim work is already done. Every step is future work.
- Mark any step that spends money, signs or commits externally, touches legal/medical/security matters, contacts customers at scale, or changes staffing as risk "high" and requiresApproval true.
- Between 4 and 10 steps, ordered so each one is executable.
- Keep every string plain text, concise and specific to the goal and to this business.

Reply with JSON only, in exactly this shape:
{
  "summary": "2-3 sentences on the approach",
  "strategy": [{ "phase": "Phase name", "focus": "what happens in it" }],
  "risks": ["risk"],
  "kpis": [{ "name": "metric", "target": "target value" }],
  "steps": [{
    "title": "short imperative title",
    "detail": "what the AI employee must do, with the inputs it should use",
    "departmentSlug": "slug or null",
    "ownerRole": "job title that owns this",
    "employeeSlug": "roster slug or null",
    "risk": "low|medium|high",
    "requiresApproval": true,
    "expectedOutcome": "the deliverable"
  }]
}`;

export async function planGoal(input: {
  goal: string;
  context: string;
  budget: number;
  currency: string;
  deadline: string | null;
  autonomyLevel: string;
  business: Record<string, unknown> | null;
  roster: { slug: string; name: string; role: string; department: string | null; skills: string[] }[];
  departments: { slug: string; name: string }[];
}): Promise<GoalPlan> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI is not configured for this workspace yet.");

  const payload = [
    `GOAL: ${input.goal}`,
    input.context ? `EXTRA CONTEXT: ${input.context}` : "",
    `BUDGET: ${input.budget > 0 ? `${input.budget} ${input.currency}` : "not specified"}`,
    `DEADLINE: ${input.deadline ?? "not specified"}`,
    `AUTONOMY LEVEL: ${input.autonomyLevel}`,
    `BUSINESS: ${JSON.stringify(input.business ?? {})}`,
    `DEPARTMENTS: ${JSON.stringify(input.departments)}`,
    `ROSTER: ${JSON.stringify(input.roster)}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const response = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: MODEL,
      stream: true,
      instructions: INSTRUCTIONS,
      input: payload,
      reasoning: { effort: "low", summary: "auto" },
    }),
  });

  if (!response.ok) {
    if (response.status === 429) throw new Error("The strategy engine is rate limited. Try again shortly.");
    if (response.status === 402) throw new Error("AI credits are exhausted. Add credits to continue.");
    console.error("[command-center]", response.status, await response.text().catch(() => ""));
    throw new Error("The strategy engine could not respond right now.");
  }

  const raw = extractJson(await readStreamedText(response)) as Partial<GoalPlan>;
  const rosterSlugs = new Set(input.roster.map((r) => r.slug));

  const steps = (Array.isArray(raw.steps) ? raw.steps : []).slice(0, 12).map((step, index) => {
    const risk = step.risk === "high" || step.risk === "medium" ? step.risk : "low";
    const employeeSlug =
      typeof step.employeeSlug === "string" && rosterSlugs.has(step.employeeSlug)
        ? step.employeeSlug
        : null;
    return {
      title: String(step.title ?? `Step ${index + 1}`).slice(0, 160),
      detail: String(step.detail ?? "").slice(0, 2000),
      departmentSlug: typeof step.departmentSlug === "string" ? step.departmentSlug : null,
      ownerRole: String(step.ownerRole ?? "AI Specialist").slice(0, 120),
      employeeSlug,
      risk,
      requiresApproval: risk === "high" ? true : Boolean(step.requiresApproval),
      expectedOutcome: String(step.expectedOutcome ?? "").slice(0, 500),
    } satisfies PlannedStep;
  });

  if (steps.length === 0) throw new Error("The strategy engine returned no executable steps.");

  return {
    summary: String(raw.summary ?? "").slice(0, 1200),
    strategy: (Array.isArray(raw.strategy) ? raw.strategy : []).slice(0, 8).map((p) => ({
      phase: String(p?.phase ?? "").slice(0, 120),
      focus: String(p?.focus ?? "").slice(0, 400),
    })),
    risks: (Array.isArray(raw.risks) ? raw.risks : []).slice(0, 8).map((r) => String(r).slice(0, 300)),
    kpis: (Array.isArray(raw.kpis) ? raw.kpis : []).slice(0, 8).map((k) => ({
      name: String(k?.name ?? "").slice(0, 120),
      target: String(k?.target ?? "").slice(0, 120),
    })),
    steps,
  };
}
