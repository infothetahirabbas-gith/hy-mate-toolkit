import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { FINANCE_ORG } from "./finance";
import { detectAnomalies, financeSnapshot, loadDataset, type FinanceDataset } from "./finance-core.server";

type Client = SupabaseClient<Database>;

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/responses";
const MODEL = "openai/gpt-5.6-sol";

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
        const event = JSON.parse(payload) as { type?: string; delta?: string; response?: { output_text?: string } };
        if (event.type === "response.output_text.delta" && typeof event.delta === "string") text += event.delta;
        else if (event.type === "response.completed" && !text && typeof event.response?.output_text === "string") {
          text = event.response.output_text;
        }
      } catch {
        /* keep-alive frame */
      }
    }
  }
  return text.trim();
}

async function callGateway(instructions: string, input: string) {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI is not configured for this workspace yet.");

  const response = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "fetch" },
    body: JSON.stringify({ model: MODEL, stream: true, instructions, input, reasoning: { effort: "low", summary: "auto" } }),
  });

  if (!response.ok) {
    if (response.status === 429) throw new Error("The AI CFO is rate limited. Try again shortly.");
    if (response.status === 402) throw new Error("AI credits are exhausted. Add credits to continue.");
    console.error("[finance-ai]", response.status, await response.text().catch(() => ""));
    throw new Error("The AI CFO could not respond right now.");
  }
  const text = await readStreamedText(response);
  if (!text) throw new Error("The AI CFO returned an empty response.");
  return text;
}

function extractJson(text: string): unknown {
  const cleaned = text.replace(/^\s*```(?:json)?/i, "").replace(/```\s*$/, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error("The AI CFO returned a response we could not read.");
  }
}

const GUARDRAILS = `You are the AI CFO of an enterprise AI finance department.

Hard rules you must never break:
- Verified facts come only from the FINANCIAL DATA block. Never invent a number that is not derivable from it.
- Clearly separate "verified" figures from your own "estimate" or "recommendation".
- Never claim an action has been executed. You propose; humans approve.
- Regulated, irreversible or high-value actions (payments, filings, contracts, payroll) always require human approval — say so.
- If the data is insufficient, say exactly what data is missing.`;

function factBlock(dataset: FinanceDataset) {
  const snap = financeSnapshot(dataset);
  const k = snap.kpis;
  return [
    `Reporting month: ${k.month}`,
    `Revenue (month): ${k.revenue.toFixed(2)} | change vs prior month: ${k.revenueChangePct.toFixed(1)}%`,
    `Expenses (month): ${k.expenses.toFixed(2)} | change: ${k.expenseChangePct.toFixed(1)}%`,
    `Net profit (month): ${k.profit.toFixed(2)} | gross margin: ${k.grossMargin.toFixed(1)}%`,
    `Trailing 12m revenue: ${k.ttmRevenue.toFixed(2)}`,
    `Cash balance: ${k.cashBalance.toFixed(2)} | avg monthly burn: ${k.monthlyBurn.toFixed(2)} | runway months: ${k.runwayMonths?.toFixed(1) ?? "n/a (cash-flow positive)"}`,
    `AR outstanding: ${k.arOutstanding.toFixed(2)} (${k.overdueArCount} overdue worth ${k.overdueArAmount.toFixed(2)})`,
    `AP outstanding: ${k.apOutstanding.toFixed(2)}`,
    "",
    "Monthly series (month | revenue | expenses | profit):",
    ...snap.series.map((m) => `${m.month} | ${m.revenue.toFixed(0)} | ${m.expenses.toFixed(0)} | ${m.profit.toFixed(0)}`),
    "",
    "Expense categories (last 3 months):",
    ...snap.categories.map((c) => `${c.category}: ${c.amount.toFixed(0)}`),
    "",
    "Budget variance (current month, negative variance = overspend):",
    ...(snap.budgets.length
      ? snap.budgets.map((b) => `${b.category}: planned ${b.planned.toFixed(0)}, actual ${b.actual.toFixed(0)}, variance ${b.variance.toFixed(0)}`)
      : ["No budgets set."]),
    "",
    "Balance sheet:",
    `Total assets ${snap.balance.totalAssets.toFixed(0)}, total liabilities ${snap.balance.totalLiabilities.toFixed(0)}, equity ${snap.balance.equity.toFixed(0)}`,
  ].join("\n");
}

export async function askCfo(supabase: Client, userId: string, question: string, history: { role: "user" | "assistant"; content: string }[]) {
  const dataset = await loadDataset(supabase, userId);
  const { data: business } = await supabase
    .from("business_profiles")
    .select("business_name, industry, country, primary_goal")
    .eq("user_id", userId)
    .maybeSingle();

  const instructions = `${GUARDRAILS}

Company: ${business?.business_name ?? "the client company"} (${business?.industry ?? "industry unknown"}, ${business?.country ?? "region unknown"}).
Stated goal: ${business?.primary_goal ?? "not stated"}.

## FINANCIAL DATA (verified)
${factBlock(dataset)}

Answer in markdown. Lead with the direct answer in one sentence, then the evidence, then what you recommend. Tag every recommendation with the approval it would need. Keep it under 300 words unless asked for depth.`;

  const transcript = history
    .slice(-8)
    .map((t) => `${t.role === "user" ? "Executive" : "AI CFO"}: ${t.content}`)
    .join("\n");

  return callGateway(instructions, `${transcript ? `${transcript}\n\n` : ""}Executive: ${question}`);
}

export type GeneratedInsight = {
  kind: string;
  severity: string;
  title: string;
  detail: string;
  impact_amount: number;
  confidence: number;
  evidence: string[];
};

export async function generateInsights(supabase: Client, userId: string) {
  const dataset = await loadDataset(supabase, userId);
  const anomalies = detectAnomalies(dataset);

  const instructions = `${GUARDRAILS}

You are running the department's analysis pass: the AI Risk Analyst, AI Financial Analyst and AI FP&A Manager reporting to you.

## FINANCIAL DATA (verified)
${factBlock(dataset)}

## Rule-based anomalies already confirmed by the system (verified facts)
${anomalies.length ? anomalies.map((a) => `- ${a.reason} (severity ${a.severity})`).join("\n") : "None detected."}

Return ONE JSON object, no markdown:
{"insights":[{"kind":"anomaly|risk|saving|recommendation|forecast","severity":"low|medium|high|critical","title":string,"detail":string,"impact_amount":number,"confidence":number,"evidence":[string]}]}
Produce 5-8 insights. impact_amount is the annualised money impact in the base currency, 0 when not quantifiable. confidence is 0-100. evidence must cite figures that appear in the data above. Titles under 80 characters, details under 320.`;

  const raw = extractJson(await callGateway(instructions, "Run the analysis now."));
  const list = Array.isArray((raw as { insights?: unknown }).insights) ? (raw as { insights: unknown[] }).insights : [];

  const rows = list.slice(0, 8).map((item) => {
    const o = (item ?? {}) as Record<string, unknown>;
    return {
      user_id: userId,
      kind: String(o["kind"] ?? "recommendation"),
      severity: String(o["severity"] ?? "medium"),
      title: String(o["title"] ?? "Finance insight").slice(0, 160),
      detail: String(o["detail"] ?? "").slice(0, 800),
      impact_amount: Number(o["impact_amount"] ?? 0) || 0,
      confidence: Math.max(0, Math.min(100, Number(o["confidence"] ?? 60) || 60)),
      evidence: Array.isArray(o["evidence"]) ? (o["evidence"] as unknown[]).map(String).slice(0, 6) : [],
      source: "ai",
      verified: false,
      status: "open",
    };
  });

  // Confirmed rule-based anomalies are stored as verified facts, not AI opinion.
  const anomalyRows = anomalies.slice(0, 5).map((a) => ({
    user_id: userId,
    kind: "anomaly",
    severity: a.severity,
    title: "Transaction anomaly detected",
    detail: a.reason,
    impact_amount: 0,
    confidence: 100,
    evidence: [`transaction:${a.transactionId}`],
    source: "rule",
    verified: true,
    status: "open",
  }));

  await supabase.from("fin_insights").delete().eq("user_id", userId).eq("status", "open");
  const all = [...anomalyRows, ...rows];
  if (all.length) {
    const { error } = await supabase.from("fin_insights").insert(all);
    if (error) throw new Error(error.message);
  }

  if (anomalies.length) {
    await supabase
      .from("fin_transactions")
      .update({ is_anomaly: true })
      .eq("user_id", userId)
      .in("id", anomalies.map((a) => a.transactionId));
  }

  return { created: all.length, anomalies: anomalies.length };
}

export async function planGoal(
  supabase: Client,
  userId: string,
  goal: { id: string; title: string; description: string | null; target_metric: string; target_change_pct: number; autonomy_level: string },
) {
  const dataset = await loadDataset(supabase, userId);
  const roles = FINANCE_ORG.map((r) => `${r.title} — ${r.mandate}`).join("\n");

  const instructions = `${GUARDRAILS}

You are planning an autonomous finance goal for your department.

## Your department
${roles}

## FINANCIAL DATA (verified)
${factBlock(dataset)}

Return ONE JSON object, no markdown:
{"baseline_amount":number,"summary":string,"steps":[{"title":string,"detail":string,"owner_role":string,"expected_impact":number,"risk":"low|medium|high","requires_approval":boolean}]}
baseline_amount is the current annualised value of the target metric taken from the data. Produce 5-8 ordered steps. owner_role must be one of the department titles above. Any step that moves money, changes a contract, contacts a supplier or customer, or touches payroll/tax MUST have requires_approval true and risk medium or high.`;

  const raw = extractJson(
    await callGateway(
      instructions,
      `Goal: ${goal.title}\nDescription: ${goal.description ?? "n/a"}\nTarget metric: ${goal.target_metric}\nTarget change: ${goal.target_change_pct}%\nAutonomy level: ${goal.autonomy_level}\n\nPlan it now.`,
    ),
  ) as Record<string, unknown>;

  const steps = Array.isArray(raw["steps"]) ? (raw["steps"] as unknown[]) : [];
  const rows = steps.slice(0, 8).map((item, index) => {
    const o = (item ?? {}) as Record<string, unknown>;
    const risk = String(o["risk"] ?? "medium");
    return {
      goal_id: goal.id,
      user_id: userId,
      sequence: index + 1,
      title: String(o["title"] ?? `Step ${index + 1}`).slice(0, 160),
      detail: String(o["detail"] ?? "").slice(0, 800),
      owner_role: String(o["owner_role"] ?? "AI Financial Analyst").slice(0, 120),
      expected_impact: Number(o["expected_impact"] ?? 0) || 0,
      risk,
      requires_approval: o["requires_approval"] === false && risk === "low" ? false : true,
      status: "proposed",
    };
  });

  await supabase.from("fin_goal_steps").delete().eq("goal_id", goal.id).eq("user_id", userId);
  if (rows.length) {
    const { error } = await supabase.from("fin_goal_steps").insert(rows);
    if (error) throw new Error(error.message);
  }

  const baseline = Number(raw["baseline_amount"] ?? 0) || 0;
  await supabase
    .from("fin_goals")
    .update({
      baseline_amount: baseline,
      current_amount: baseline,
      description: goal.description ?? String(raw["summary"] ?? "").slice(0, 800),
      status: "active",
      progress: 5,
    })
    .eq("id", goal.id)
    .eq("user_id", userId);

  return { steps: rows.length, baseline };
}
