import { callAsAppUser } from "@/integrations/lovable/appUserConnector";
import { getConnectionKeyForUser } from "@/server/appUserConnections.server";
import { CONNECTORS, connectorById, riskFor, type RiskLevel } from "@/lib/connectors";

export const GATEWAY_BASE_URL = "https://connector-gateway.lovable.dev";
const AI_URL = "https://ai.gateway.lovable.dev/v1/responses";
const MODEL = "openai/gpt-5.6-sol";

export type PlannedAction = {
  title: string;
  description: string;
  connectorId: string | null;
  toolId: string | null;
  operation: string;
  risk: RiskLevel;
  params: Record<string, unknown>;
  reason: string;
  dataUsed: string;
  expectedResult: string;
};

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
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
    return {};
  }
}

async function readStream(response: Response): Promise<string> {
  const body = response.body;
  if (!body) return "";
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
        const event = JSON.parse(payload) as { type?: string; delta?: string };
        if (event.type === "response.output_text.delta" && typeof event.delta === "string") {
          text += event.delta;
        }
      } catch {
        /* keep-alive frame */
      }
    }
  }
  return text.trim();
}

/** Asks the AI employee which real-world actions this task needs. */
export async function planActions(args: {
  employeeName: string;
  roleTitle: string;
  taskName: string;
  brief: string;
  connectedConnectorIds: string[];
  businessName: string | null;
}): Promise<PlannedAction[]> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return [];

  const available = CONNECTORS.filter((c) => args.connectedConnectorIds.includes(c.connectorId));
  if (!available.length) return [];

  const catalogue = available
    .map(
      (c) =>
        `${c.connectorId} (${c.name}): ` +
        c.operations.map((o) => `${o.id} [${o.risk}] — ${o.description}`).join("; "),
    )
    .join("\n");

  const instructions = `You are the action planner for ${args.employeeName}, a ${args.roleTitle}.
You decide which real actions in connected business tools are required to complete a task.
Only use the operations listed below. Never invent connectors, operations or parameters.
Prefer the smallest number of actions. If no external action is genuinely needed, return an empty list.

## Connected tools and operations
${catalogue}

## Parameter contracts
google_mail.create_draft / google_mail.send_email: { "to": string(email), "subject": string, "body": string }
slack.post_message: { "channel": string(#channel or ID), "text": string }
hubspot.create_contact: { "email": string, "firstname": string, "lastname": string, "company": string }
hubspot.create_note: { "body": string }
google_sheets.append_rows: { "spreadsheetId": string, "range": string, "rows": string[][] }
google_sheets.read_range: { "spreadsheetId": string, "range": string }
google_calendar.create_event: { "summary": string, "description": string, "startISO": string, "endISO": string }
notion.create_page: { "parentPageId": string, "title": string, "body": string }

If a required parameter (recipient, channel, spreadsheet id, page id) is unknown, still plan the action and
put a clearly-marked placeholder in the field, and say in "reason" what the user must confirm.

## Output contract
Reply with ONE JSON object, no markdown:
{ "actions": [ { "title": string, "description": string, "connectorId": string, "operation": string,
  "params": object, "reason": string, "dataUsed": string, "expectedResult": string } ] }
Max 4 actions. Keep strings under 300 characters.`;

  const response = await fetch(AI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: MODEL,
      stream: true,
      instructions,
      input: `Business: ${args.businessName ?? "unknown"}\nTask: ${args.taskName}\nBrief: ${args.brief}\n\nPlan the actions now.`,
      reasoning: { effort: "low", summary: "auto" },
    }),
  });

  if (!response.ok) return [];
  const raw = extractJson(await readStream(response)) as { actions?: unknown };
  const list = Array.isArray(raw.actions) ? raw.actions : [];

  return list.slice(0, 4).flatMap((entry): PlannedAction[] => {
    const item = (entry ?? {}) as Record<string, unknown>;
    const connectorId = str(item["connectorId"]) || null;
    const connector = connectorId ? connectorById(connectorId) : undefined;
    if (!connector) return [];
    const operation = str(item["operation"]);
    if (!connector.operations.some((o) => o.id === operation)) return [];
    return [
      {
        title: str(item["title"], operation) || operation,
        description: str(item["description"]),
        connectorId: connector.connectorId,
        toolId: connector.toolIds[0] ?? null,
        operation,
        risk: riskFor(connector.connectorId, operation),
        params: (item["params"] ?? {}) as Record<string, unknown>,
        reason: str(item["reason"]),
        dataUsed: str(item["dataUsed"]),
        expectedResult: str(item["expectedResult"]),
      },
    ];
  });
}

export type ActionOutcome = { summary: string; data: unknown };

function param(params: Record<string, unknown>, key: string, fallback = ""): string {
  const value = params[key];
  return typeof value === "string" ? value : typeof value === "number" ? String(value) : fallback;
}

function base64Url(input: string): string {
  return Buffer.from(input, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function readJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Provider rejected the action (${res.status}): ${text.slice(0, 300)}`);
  }
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text.slice(0, 500) };
  }
}

/** Executes one planned action against the real provider API as the app user. */
export async function executeAction(args: {
  userId: string;
  connectorId: string;
  operation: string;
  params: Record<string, unknown>;
}): Promise<ActionOutcome> {
  const connectionAPIKey = await getConnectionKeyForUser(args.userId, args.connectorId);
  if (!connectionAPIKey) {
    throw new Error(
      `${connectorById(args.connectorId)?.name ?? args.connectorId} is not connected. Connect it on the Integrations page first.`,
    );
  }

  const call = (path: string, init?: RequestInit) =>
    callAsAppUser({
      gatewayBaseUrl: GATEWAY_BASE_URL,
      connectionAPIKey,
      connectorId: args.connectorId,
      path,
      init,
    });

  const json = (body: unknown): RequestInit => ({
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const p = args.params;
  const key = `${args.connectorId}:${args.operation}`;

  switch (key) {
    case "google_mail:create_draft":
    case "google_mail:send_email": {
      const to = param(p, "to");
      const subject = param(p, "subject");
      const body = param(p, "body");
      if (!to.includes("@")) throw new Error("A valid recipient email address is required.");
      const raw = base64Url(
        [`To: ${to}`, `Subject: ${subject}`, "Content-Type: text/plain; charset=UTF-8", "", body].join(
          "\r\n",
        ),
      );
      if (args.operation === "send_email") {
        const data = await readJson(
          await call("/gmail/v1/users/me/messages/send", json({ raw })),
        );
        return { summary: `Email sent to ${to}`, data };
      }
      const data = await readJson(
        await call("/gmail/v1/users/me/drafts", json({ message: { raw } })),
      );
      return { summary: `Draft created for ${to}`, data };
    }

    case "slack:post_message": {
      const channel = param(p, "channel");
      const text = param(p, "text");
      if (!channel) throw new Error("A Slack channel is required.");
      const data = (await readJson(await call("/api/chat.postMessage", json({ channel, text })))) as {
        ok?: boolean;
        error?: string;
      };
      if (data && data.ok === false) throw new Error(`Slack rejected the message: ${data.error}`);
      return { summary: `Message posted to ${channel}`, data };
    }

    case "hubspot:create_contact": {
      const email = param(p, "email");
      if (!email.includes("@")) throw new Error("A valid contact email is required.");
      const data = await readJson(
        await call(
          "/crm/v3/objects/contacts",
          json({
            properties: {
              email,
              firstname: param(p, "firstname"),
              lastname: param(p, "lastname"),
              company: param(p, "company"),
            },
          }),
        ),
      );
      return { summary: `Contact ${email} created in HubSpot`, data };
    }

    case "hubspot:create_note": {
      const data = await readJson(
        await call(
          "/crm/v3/objects/notes",
          json({
            properties: {
              hs_note_body: param(p, "body"),
              hs_timestamp: new Date().toISOString(),
            },
          }),
        ),
      );
      return { summary: "Note logged in HubSpot", data };
    }

    case "google_sheets:append_rows": {
      const spreadsheetId = param(p, "spreadsheetId");
      const range = param(p, "range", "Sheet1!A1");
      const rows = Array.isArray(p["rows"]) ? (p["rows"] as unknown[][]) : [];
      if (!spreadsheetId) throw new Error("A spreadsheet id is required.");
      const data = await readJson(
        await call(
          `/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`,
          json({ values: rows }),
        ),
      );
      return { summary: `${rows.length} row(s) appended to ${range}`, data };
    }

    case "google_sheets:read_range": {
      const spreadsheetId = param(p, "spreadsheetId");
      const range = param(p, "range", "Sheet1!A1:Z50");
      if (!spreadsheetId) throw new Error("A spreadsheet id is required.");
      const data = await readJson(
        await call(`/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`),
      );
      return { summary: `Read ${range}`, data };
    }

    case "google_calendar:create_event": {
      const startISO = param(p, "startISO");
      const endISO = param(p, "endISO");
      if (!startISO || !endISO) throw new Error("Start and end times are required.");
      const data = await readJson(
        await call(
          "/calendar/v3/calendars/primary/events",
          json({
            summary: param(p, "summary", "AI employee follow-up"),
            description: param(p, "description"),
            start: { dateTime: startISO },
            end: { dateTime: endISO },
          }),
        ),
      );
      return { summary: `Event "${param(p, "summary")}" created`, data };
    }

    case "notion:create_page": {
      const parentPageId = param(p, "parentPageId");
      if (!parentPageId) throw new Error("A Notion parent page id is required.");
      const data = await readJson(
        await call(
          "/v1/pages",
          json({
            parent: { page_id: parentPageId },
            properties: {
              title: [{ type: "text", text: { content: param(p, "title", "AI deliverable") } }],
            },
            children: [
              {
                object: "block",
                type: "paragraph",
                paragraph: {
                  rich_text: [{ type: "text", text: { content: param(p, "body").slice(0, 1800) } }],
                },
              },
            ],
          }),
        ),
      );
      return { summary: `Notion page "${param(p, "title")}" created`, data };
    }

    default:
      throw new Error(`Unsupported action: ${key}`);
  }
}

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type ActionRecord = {
  id: string;
  task_id: string | null;
  employee_id: string | null;
  title: string;
  tool_id: string | null;
  connector_id: string | null;
  operation: string;
  risk: string;
  params: unknown;
  attempts: number;
};

/**
 * Executes a stored action row end-to-end: runs it against the provider,
 * records the outcome, writes the tool activity log and the audit entry.
 */
export async function runActionRecord(
  supabase: SupabaseClient<Database>,
  userId: string,
  action: ActionRecord,
): Promise<{ ok: boolean; summary: string }> {
  await supabase
    .from("task_actions")
    .update({ status: "running", started_at: new Date().toISOString(), attempts: action.attempts + 1 })
    .eq("id", action.id)
    .eq("user_id", userId);

  try {
    if (!action.connector_id) throw new Error("This action has no connected tool.");
    const outcome = await executeAction({
      userId,
      connectorId: action.connector_id,
      operation: action.operation,
      params: (action.params ?? {}) as Record<string, unknown>,
    });

    await supabase
      .from("task_actions")
      .update({
        status: "succeeded",
        result: JSON.parse(JSON.stringify({ summary: outcome.summary, data: outcome.data })),
        error: null,
        completed_at: new Date().toISOString(),
      })
      .eq("id", action.id)
      .eq("user_id", userId);

    await supabase.from("tool_activity_logs").insert({
      user_id: userId,
      employee_id: action.employee_id,
      task_id: action.task_id,
      tool_id: action.tool_id ?? action.connector_id,
      action: action.title,
      outcome: "success",
    });

    await supabase.from("audit_logs").insert({
      user_id: userId,
      actor_type: "ai",
      action: `action.${action.operation}`,
      resource_type: "task_action",
      resource_id: action.id,
      new_value: JSON.parse(JSON.stringify({ summary: outcome.summary })),
      metadata: JSON.parse(JSON.stringify({ connector: action.connector_id, title: action.title })),
      risk: action.risk,
      result: "success",
    });

    return { ok: true, summary: outcome.summary };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await supabase
      .from("task_actions")
      .update({ status: "failed", error: message, completed_at: new Date().toISOString() })
      .eq("id", action.id)
      .eq("user_id", userId);

    await supabase.from("tool_activity_logs").insert({
      user_id: userId,
      employee_id: action.employee_id,
      task_id: action.task_id,
      tool_id: action.tool_id ?? action.connector_id,
      action: action.title,
      outcome: "failed",
    });

    await supabase.from("audit_logs").insert({
      user_id: userId,
      actor_type: "ai",
      action: `action.${action.operation}`,
      resource_type: "task_action",
      resource_id: action.id,
      metadata: JSON.parse(JSON.stringify({ connector: action.connector_id, error: message })),
      risk: action.risk,
      result: "failed",
    });

    return { ok: false, summary: message };
  }
}
