import type { AiEmployeeResult } from "./ai-types";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/responses";
const MODEL = "openai/gpt-5.6-sol";

export type EmployeeBrief = {
  name: string;
  role_title: string;
  persona: string;
  skills: string[];
  features: string[];
  category: string;
};

export type BusinessBrief = {
  business_name?: string | null;
  website?: string | null;
  industry?: string | null;
  target_customer?: string | null;
  country?: string | null;
  goals?: string | null;
  brand_info?: string | null;
};

export type MemoryItem = { task_name: string; input: string | null; headline: string | null };

function buildInstructions(
  employee: EmployeeBrief,
  business: BusinessBrief | null,
  memory: MemoryItem[],
) {
  const knowledge = business
    ? [
        `Business name: ${business.business_name ?? "unknown"}`,
        `Website: ${business.website ?? "unknown"}`,
        `Industry: ${business.industry ?? "unknown"}`,
        `Target customer: ${business.target_customer ?? "unknown"}`,
        `Country / market: ${business.country ?? "unknown"}`,
        `Business goals: ${business.goals ?? "unknown"}`,
        `Brand voice & positioning: ${business.brand_info ?? "unknown"}`,
      ].join("\n")
    : "No onboarding information has been provided yet. Make reasonable assumptions and say so.";

  const history = memory.length
    ? memory
        .map((m) => `- ${m.task_name} (input: ${m.input ?? "n/a"}) => ${m.headline ?? "completed"}`)
        .join("\n")
    : "No previous tasks yet.";

  return `${employee.persona}

You work as a ${employee.role_title} in the ${employee.category} team of an AI workforce platform.
Your skills: ${employee.skills.join(", ")}.
Your deliverables: ${employee.features.join(", ")}.

## Business knowledge
${knowledge}

## Your memory of previous work for this client
${history}

## Output contract
Reply with ONE JSON object and nothing else. No markdown fences, no commentary.
Shape:
{
  "headline": string,            // short, specific title for this deliverable
  "summary": string,             // 2-3 sentence executive summary
  "score": number|null,          // 0-100 health/quality score when meaningful, else null
  "scoreLabel": string|null,     // what the score measures, e.g. "SEO Score"
  "metrics": [{"label": string, "value": string, "hint": string}],       // 3-5 items
  "findings": [{"title": string, "severity": string, "detail": string}], // 3-6 items, severity one of: critical, high, medium, low
  "opportunities": [{"title": string, "detail": string, "impact": string}], // 3-5 items
  "actionPlan": [{"title": string, "detail": string, "effort": string, "impact": string}], // 4-6 ordered steps
  "closingNote": string|null     // one sentence, written in first person as ${employee.name}
}
Keep every string concise: titles under 70 characters, details under 320 characters.
Be concrete and specific to this business. Never invent precise analytics numbers you cannot know — describe estimates as estimates.`;
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
    if (start !== -1 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw new Error("The AI employee returned a response we could not read. Please try again.");
  }
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function normalize(raw: unknown, fallbackHeadline: string): AiEmployeeResult {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const score = typeof obj["score"] === "number" ? Math.round(obj["score"]) : null;

  return {
    headline: asString(obj["headline"], fallbackHeadline) || fallbackHeadline,
    summary: asString(obj["summary"]),
    score: score !== null && score >= 0 && score <= 100 ? score : null,
    scoreLabel: asString(obj["scoreLabel"]) || null,
    metrics: asArray(obj["metrics"])
      .slice(0, 6)
      .map((m) => {
        const item = (m ?? {}) as Record<string, unknown>;
        return {
          label: asString(item["label"], "Metric"),
          value: asString(item["value"], "—"),
          hint: asString(item["hint"]),
        };
      }),
    findings: asArray(obj["findings"])
      .slice(0, 8)
      .map((f) => {
        const item = (f ?? {}) as Record<string, unknown>;
        return {
          title: asString(item["title"], "Finding"),
          severity: asString(item["severity"], "medium").toLowerCase(),
          detail: asString(item["detail"]),
        };
      }),
    opportunities: asArray(obj["opportunities"])
      .slice(0, 8)
      .map((o) => {
        const item = (o ?? {}) as Record<string, unknown>;
        return {
          title: asString(item["title"], "Opportunity"),
          detail: asString(item["detail"]),
          impact: asString(item["impact"]),
        };
      }),
    actionPlan: asArray(obj["actionPlan"])
      .slice(0, 8)
      .map((a) => {
        const item = (a ?? {}) as Record<string, unknown>;
        return {
          title: asString(item["title"], "Next step"),
          detail: asString(item["detail"]),
          effort: asString(item["effort"]),
          impact: asString(item["impact"]),
        };
      }),
    closingNote: asString(obj["closingNote"]) || null,
  };
}

async function readStreamedText(response: Response): Promise<string> {
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
        // ignore keep-alive / partial frames
      }
    }
  }

  return text.trim();
}

export async function runAiEmployee(args: {
  employee: EmployeeBrief;
  business: BusinessBrief | null;
  memory: MemoryItem[];
  taskName: string;
  input: string;
}): Promise<AiEmployeeResult> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI is not configured for this workspace yet.");

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
      instructions: buildInstructions(args.employee, args.business, args.memory),
      input: `Task: ${args.taskName}\nClient input: ${args.input}\n\nProduce the deliverable now.`,
      reasoning: { effort: "low", summary: "auto" },
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    if (response.status === 429) {
      throw new Error("Your AI employees are at their rate limit. Please try again in a moment.");
    }
    if (response.status === 402) {
      throw new Error("AI credits are exhausted. Add credits to keep your AI employees working.");
    }
    console.error("[ai-gateway]", response.status, detail);
    throw new Error("The AI employee could not complete this task right now.");
  }

  const text = await readStreamedText(response);
  if (!text) throw new Error("The AI employee returned an empty result. Please try again.");

  return normalize(extractJson(text), args.taskName);
}
