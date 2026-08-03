const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/responses";
const MODEL = "openai/gpt-5.6-sol";

export type IdentityLayer = {
  name: string;
  role_title: string;
  category: string;
  department: string;
  gender: string;
  persona: string;
  personality: string[];
  skills: string[];
  daily_tasks: string[];
  available_tools: string[];
  main_responsibility: string;
  system_prompt: string | null;
};

export type KnowledgeItem = { title: string; doc_type: string; content: string };
export type MemoryRecord = { memory_type: string; category: string; content: string };
export type BusinessContext = Record<string, unknown> | null;

export type ChatTurn = { role: "user" | "assistant"; content: string };

function section(title: string, lines: string[]) {
  if (!lines.length) return "";
  return `\n## ${title}\n${lines.join("\n")}`;
}

/**
 * Composes the full agent stack: identity -> knowledge -> memory -> tools.
 * Shared by the chat workspace and structured task runs.
 */
export function buildAgentContext(args: {
  identity: IdentityLayer;
  business: BusinessContext;
  knowledge: KnowledgeItem[];
  memories: MemoryRecord[];
  corrections: string[];
}) {
  const { identity, business, knowledge, memories, corrections } = args;

  const businessLines = business
    ? Object.entries(business)
        .filter(([key, value]) => value && !["user_id", "created_at", "updated_at"].includes(key))
        .map(([key, value]) => `- ${key.replace(/_/g, " ")}: ${String(value)}`)
    : [];

  return [
    identity.system_prompt?.trim() || identity.persona,
    `
You are ${identity.name}, ${identity.role_title} in the ${identity.department} department (${identity.category}).
Main responsibility: ${identity.main_responsibility || identity.role_title}.
Personality: ${identity.personality.join(", ") || "professional, pragmatic"}.
Skills: ${identity.skills.join(", ")}.
Typical daily work: ${identity.daily_tasks.join("; ")}.
Tools you can draw on: ${identity.available_tools.join(", ") || "your own analysis"}.

Rules: stay in role, never claim to have run a tool you have no data from, label estimates as estimates,
and always end with a concrete next action the business owner can take.`.trim(),
    section("Business knowledge", businessLines),
    section(
      "Knowledge base",
      knowledge.map((k) => `- [${k.doc_type}] ${k.title}: ${k.content.slice(0, 1200)}`),
    ),
    section(
      "Memory",
      memories.map((m) => `- (${m.memory_type} / ${m.category}) ${m.content}`),
    ),
    section("Corrections from this client — respect them", corrections.map((c) => `- ${c}`)),
  ]
    .filter(Boolean)
    .join("\n");
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
        // ignore keep-alive frames
      }
    }
  }

  return text.trim();
}

function gatewayError(status: number, detail: string): Error {
  if (status === 429) {
    return new Error("Your AI employees are at their rate limit. Please try again in a moment.");
  }
  if (status === 402) {
    return new Error("AI credits are exhausted. Add credits to keep your AI employees working.");
  }
  console.error("[ai-gateway]", status, detail);
  return new Error("The AI employee could not respond right now.");
}

/** Conversational reply from an AI employee, with the full agent context applied. */
export async function chatWithAgent(args: {
  instructions: string;
  history: ChatTurn[];
  message: string;
}): Promise<string> {
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
      store: false,
      instructions: `${args.instructions}

## Chat style
Reply in clear markdown. Be specific and business-focused. Keep it under 300 words unless the client
asks for a full deliverable. When the client asks for work, state the plan and what you need from them.`,
      input: [
        ...args.history.slice(-14).map((turn) => ({
          role: turn.role,
          content: turn.content,
        })),
        { role: "user", content: args.message },
      ],
      reasoning: { effort: "low", summary: "auto" },
    }),
  });

  if (!response.ok) {
    throw gatewayError(response.status, await response.text().catch(() => ""));
  }

  const text = await readStreamedText(response);
  if (!text) throw new Error("The AI employee returned an empty reply. Please try again.");
  return text;
}

/** Extracts durable long-term memories from a conversation turn. Returns [] on any failure. */
export async function extractMemories(args: {
  employeeName: string;
  message: string;
  reply: string;
}): Promise<{ content: string; category: string }[]> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return [];

  try {
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
        store: false,
        instructions: `You maintain the long-term memory of an AI employee named ${args.employeeName}.
Extract at most 3 durable facts about the client's business, preferences or decisions from the exchange.
Ignore small talk, questions and anything temporary.
Reply with ONE JSON object: {"memories":[{"content":string,"category":"business"|"preference"|"decision"}]}
Use an empty array when nothing is worth remembering. No markdown, no commentary.`,
        input: `Client said: ${args.message}\n\n${args.employeeName} replied: ${args.reply}`,
      }),
    });

    if (!response.ok) return [];
    const text = await readStreamedText(response);
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end <= start) return [];

    const parsed = JSON.parse(text.slice(start, end + 1)) as {
      memories?: { content?: unknown; category?: unknown }[];
    };

    return (parsed.memories ?? [])
      .map((item) => ({
        content: typeof item.content === "string" ? item.content.trim().slice(0, 400) : "",
        category: typeof item.category === "string" ? item.category : "business",
      }))
      .filter((item) => item.content.length > 8)
      .slice(0, 3);
  } catch {
    return [];
  }
}
