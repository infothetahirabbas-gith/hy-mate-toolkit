/** Client-safe finance domain model: hierarchy, autonomy levels, formatting. */

export type FinanceRole = {
  key: string;
  title: string;
  level: "cfo" | "manager" | "specialist";
  reportsTo: string | null;
  mandate: string;
  duties: string[];
  autonomy: AutonomyLevel;
};

export const AUTONOMY_LEVELS = ["observe", "assisted", "supervised", "autonomous"] as const;
export type AutonomyLevel = (typeof AUTONOMY_LEVELS)[number];

export const AUTONOMY_COPY: Record<AutonomyLevel, { label: string; hint: string }> = {
  observe: { label: "Observe only", hint: "Analyses and reports. Never proposes or executes actions." },
  assisted: { label: "Assisted", hint: "Proposes actions. Every action needs your approval." },
  supervised: { label: "Supervised", hint: "Executes low-risk work automatically. Money movement needs approval." },
  autonomous: { label: "Autonomous", hint: "Executes up to your approval threshold. High-risk still needs a human." },
};

export const FINANCE_ORG: FinanceRole[] = [
  {
    key: "ai-cfo",
    title: "AI CFO",
    level: "cfo",
    reportsTo: null,
    mandate: "Owns the financial picture, answers executive questions and signs off the department plan.",
    duties: ["Executive Q&A", "Board-grade reporting", "Capital & runway strategy", "Approves department plans"],
    autonomy: "assisted",
  },
  {
    key: "controller",
    title: "AI Financial Controller",
    level: "manager",
    reportsTo: "ai-cfo",
    mandate: "Guards the integrity of the books, the close calendar and internal controls.",
    duties: ["Month-end close", "Reconciliation", "Control testing", "Policy enforcement"],
    autonomy: "supervised",
  },
  {
    key: "fpa-manager",
    title: "AI FP&A Manager",
    level: "manager",
    reportsTo: "ai-cfo",
    mandate: "Runs budgeting, forecasting and variance analysis across every department.",
    duties: ["Budget cycles", "Rolling forecasts", "Variance analysis", "Scenario planning"],
    autonomy: "supervised",
  },
  {
    key: "treasury-manager",
    title: "AI Treasury & Cash Manager",
    level: "manager",
    reportsTo: "ai-cfo",
    mandate: "Protects liquidity, runway and payment timing.",
    duties: ["Cash-flow intelligence", "Runway modelling", "Payment scheduling", "Bank position"],
    autonomy: "assisted",
  },
  {
    key: "bookkeeper",
    title: "AI Bookkeeper",
    level: "specialist",
    reportsTo: "controller",
    mandate: "Categorises every transaction and keeps the ledger clean.",
    duties: ["Transaction categorisation", "Ledger hygiene", "Receipt matching"],
    autonomy: "supervised",
  },
  {
    key: "accountant",
    title: "AI Accountant",
    level: "specialist",
    reportsTo: "controller",
    mandate: "Produces the P&L, balance sheet and cash-flow statement.",
    duties: ["Financial statements", "Accruals", "Journal entries"],
    autonomy: "supervised",
  },
  {
    key: "ap-specialist",
    title: "AI Accounts Payable Specialist",
    level: "specialist",
    reportsTo: "controller",
    mandate: "Processes supplier invoices and schedules payments.",
    duties: ["Invoice intake", "Duplicate detection", "Payment runs"],
    autonomy: "assisted",
  },
  {
    key: "ar-specialist",
    title: "AI Accounts Receivable Specialist",
    level: "specialist",
    reportsTo: "controller",
    mandate: "Chases customer invoices and shortens days-sales-outstanding.",
    duties: ["Dunning sequences", "Ageing analysis", "Collection forecasting"],
    autonomy: "assisted",
  },
  {
    key: "analyst",
    title: "AI Financial Analyst",
    level: "specialist",
    reportsTo: "fpa-manager",
    mandate: "Turns raw financial data into decisions and cost-saving opportunities.",
    duties: ["Margin analysis", "Cost-saving discovery", "KPI reporting"],
    autonomy: "supervised",
  },
  {
    key: "risk-analyst",
    title: "AI Risk & Fraud Analyst",
    level: "specialist",
    reportsTo: "controller",
    mandate: "Detects anomalies, fraud signals and compliance breaches.",
    duties: ["Anomaly detection", "Fraud scoring", "Compliance monitoring"],
    autonomy: "observe",
  },
  {
    key: "tax-specialist",
    title: "AI Tax Assistant",
    level: "specialist",
    reportsTo: "controller",
    mandate: "Tracks tax exposure and filing readiness. Never files without a human.",
    duties: ["Tax provisioning", "Filing calendar", "Deduction discovery"],
    autonomy: "observe",
  },
  {
    key: "fin-ops",
    title: "AI Finance Operations Specialist",
    level: "specialist",
    reportsTo: "treasury-manager",
    mandate: "Keeps finance workflows, approvals and integrations running.",
    duties: ["Workflow automation", "Approval routing", "System integrations"],
    autonomy: "supervised",
  },
];

export const EXPENSE_CATEGORIES = [
  "payroll",
  "software",
  "marketing",
  "cloud",
  "contractors",
  "office",
  "travel",
  "professional-services",
  "operating",
] as const;

export const INSIGHT_KINDS = ["anomaly", "risk", "saving", "recommendation", "forecast"] as const;

export function money(value: number | string | null | undefined, currency = "USD") {
  const n = typeof value === "string" ? Number(value) : (value ?? 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: Math.abs(n) >= 1000 ? 0 : 2,
  }).format(Number.isFinite(n) ? n : 0);
}

export function pct(value: number | null | undefined, digits = 1) {
  const n = Number(value ?? 0);
  return `${n > 0 ? "+" : ""}${n.toFixed(digits)}%`;
}

export function monthLabel(iso: string) {
  const d = new Date(`${iso.slice(0, 7)}-01T00:00:00Z`);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}

export const RISK_TONE: Record<string, string> = {
  low: "bg-emerald-50 text-emerald-700 border-emerald-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  high: "bg-rose-50 text-rose-700 border-rose-200",
  critical: "bg-rose-100 text-rose-800 border-rose-300",
};
