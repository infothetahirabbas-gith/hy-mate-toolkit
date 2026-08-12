/** Client-safe registry of the real OAuth providers AI employees can act through. */

export type ConnectorOperation = {
  id: string;
  label: string;
  /** low = read/analyse, medium = creates a draft/record, high = communicates externally */
  risk: "low" | "medium" | "high";
  description: string;
};

export type ConnectorDef = {
  connectorId: string;
  name: string;
  category: string;
  description: string;
  /** ids from TOOL_LIBRARY this connector powers */
  toolIds: string[];
  scopes: string[];
  operations: ConnectorOperation[];
};

export const CONNECTORS: ConnectorDef[] = [
  {
    connectorId: "google_mail",
    name: "Gmail",
    category: "Communication",
    description: "Draft and send outreach, follow-ups and customer replies.",
    toolIds: ["gmail", "email"],
    scopes: [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.compose",
      "https://www.googleapis.com/auth/gmail.send",
    ],
    operations: [
      {
        id: "create_draft",
        label: "Create email draft",
        risk: "medium",
        description: "Writes a draft into your mailbox for review.",
      },
      {
        id: "send_email",
        label: "Send email",
        risk: "high",
        description: "Sends an email from your address to a recipient.",
      },
    ],
  },
  {
    connectorId: "slack",
    name: "Slack",
    category: "Communication",
    description: "Post updates, summaries and alerts to your channels.",
    toolIds: ["slack"],
    scopes: ["chat:write", "channels:read"],
    operations: [
      {
        id: "post_message",
        label: "Post message",
        risk: "high",
        description: "Posts a message into a Slack channel.",
      },
    ],
  },
  {
    connectorId: "hubspot",
    name: "HubSpot",
    category: "CRM",
    description: "Create and enrich contacts, deals and notes in your CRM.",
    toolIds: ["crm"],
    scopes: ["crm.objects.contacts.read", "crm.objects.contacts.write"],
    operations: [
      {
        id: "create_contact",
        label: "Create CRM contact",
        risk: "high",
        description: "Adds a new contact record to HubSpot.",
      },
      {
        id: "create_note",
        label: "Log CRM note",
        risk: "medium",
        description: "Logs a note against your CRM timeline.",
      },
    ],
  },
  {
    connectorId: "google_sheets",
    name: "Google Sheets",
    category: "Data",
    description: "Read and append structured data for reporting.",
    toolIds: ["google-sheets"],
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    operations: [
      {
        id: "append_rows",
        label: "Append rows",
        risk: "medium",
        description: "Appends rows to one of your spreadsheets.",
      },
      {
        id: "read_range",
        label: "Read range",
        risk: "low",
        description: "Reads a range of cells for analysis.",
      },
    ],
  },
  {
    connectorId: "google_calendar",
    name: "Google Calendar",
    category: "Productivity",
    description: "Book meetings and follow-ups on your calendar.",
    toolIds: ["calendar"],
    scopes: ["https://www.googleapis.com/auth/calendar.events"],
    operations: [
      {
        id: "create_event",
        label: "Create calendar event",
        risk: "medium",
        description: "Adds an event to your primary calendar.",
      },
    ],
  },
  {
    connectorId: "notion",
    name: "Notion",
    category: "Data",
    description: "Publish briefs, docs and knowledge pages.",
    toolIds: ["notion"],
    scopes: [],
    operations: [
      {
        id: "create_page",
        label: "Create page",
        risk: "medium",
        description: "Creates a page in a Notion parent page you choose.",
      },
    ],
  },
];

export const RISK_LEVELS = ["low", "medium", "high"] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

export function connectorById(id: string) {
  return CONNECTORS.find((c) => c.connectorId === id);
}

export function connectorForTool(toolId: string) {
  return CONNECTORS.find((c) => c.toolIds.includes(toolId));
}

export function operationDef(connectorId: string, operation: string) {
  return connectorById(connectorId)?.operations.find((o) => o.id === operation);
}

export function riskFor(connectorId: string | null, operation: string): RiskLevel {
  if (!connectorId) return "low";
  return operationDef(connectorId, operation)?.risk ?? "medium";
}

export const RISK_COPY: Record<RiskLevel, { label: string; hint: string }> = {
  low: { label: "Low risk", hint: "Reads data or analyses information only." },
  medium: { label: "Medium risk", hint: "Creates drafts or internal records." },
  high: { label: "High risk", hint: "Communicates externally or changes customer data." },
};
