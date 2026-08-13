import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { monthKey } from "./finance-core.server";

type Client = SupabaseClient<Database>;

/** Deterministic pseudo-random so a demo company looks the same every time. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const REVENUE_SOURCES = [
  { category: "subscriptions", counterparty: "Stripe payouts", weight: 0.62 },
  { category: "services", counterparty: "Enterprise services", weight: 0.24 },
  { category: "partnerships", counterparty: "Channel partners", weight: 0.14 },
];

const COST_LINES = [
  { category: "payroll", counterparty: "Payroll provider", base: 48000, drift: 0.02 },
  { category: "cloud", counterparty: "Cloud infrastructure", base: 9200, drift: 0.05 },
  { category: "software", counterparty: "SaaS subscriptions", base: 5400, drift: 0.04 },
  { category: "marketing", counterparty: "Ad platforms", base: 14500, drift: 0.06 },
  { category: "contractors", counterparty: "Agency retainer", base: 7800, drift: 0.03 },
  { category: "office", counterparty: "Workspace lease", base: 4200, drift: 0.0 },
  { category: "professional-services", counterparty: "Legal & audit", base: 2600, drift: 0.01 },
];

/** Creates a realistic 12-month demo company for a user that has no finance data yet. */
export async function seedDemoFinance(supabase: Client, userId: string) {
  const random = rng(7919);
  const now = new Date();

  const accounts = [
    { name: "Operating account", account_type: "bank", institution: "Mercury", balance: 412500 },
    { name: "Reserve savings", account_type: "bank", institution: "Mercury", balance: 180000 },
    { name: "Corporate card", account_type: "liability", institution: "Brex", balance: -38400 },
    { name: "Equipment", account_type: "asset", institution: null, balance: 62000 },
  ];

  const { data: accountRows, error: accountError } = await supabase
    .from("fin_accounts")
    .insert(accounts.map((a) => ({ ...a, user_id: userId })))
    .select("id, name, account_type");
  if (accountError) throw new Error(accountError.message);

  const operating = accountRows?.find((a) => a.name === "Operating account")?.id ?? null;
  const card = accountRows?.find((a) => a.name === "Corporate card")?.id ?? null;

  const transactions: Database["public"]["Tables"]["fin_transactions"]["Insert"][] = [];
  const budgets: Database["public"]["Tables"]["fin_budgets"]["Insert"][] = [];

  for (let back = 11; back >= 0; back -= 1) {
    const monthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - back, 1));
    const growth = 1 + (11 - back) * 0.035;
    const monthlyRevenue = 128000 * growth * (0.94 + random() * 0.12);

    for (const source of REVENUE_SOURCES) {
      const splits = source.category === "subscriptions" ? 4 : 2;
      for (let i = 0; i < splits; i += 1) {
        const day = Math.min(28, 3 + Math.floor(random() * 25));
        transactions.push({
          user_id: userId,
          account_id: operating,
          txn_date: new Date(Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth(), day)).toISOString().slice(0, 10),
          description: `${source.counterparty} settlement`,
          category: source.category,
          counterparty: source.counterparty,
          direction: "in",
          amount: Number(((monthlyRevenue * source.weight) / splits).toFixed(2)),
          status: "cleared",
          source: "demo",
        });
      }
    }

    for (const line of COST_LINES) {
      const amount = line.base * (1 + line.drift * (11 - back)) * (0.95 + random() * 0.1);
      transactions.push({
        user_id: userId,
        account_id: line.category === "software" || line.category === "cloud" ? card : operating,
        txn_date: new Date(Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth(), 5)).toISOString().slice(0, 10),
        description: `${line.counterparty} — monthly`,
        category: line.category,
        counterparty: line.counterparty,
        direction: "out",
        amount: Number(amount.toFixed(2)),
        status: "cleared",
        source: "demo",
      });

      if (back === 0) {
        budgets.push({
          user_id: userId,
          period_month: monthKey(monthDate),
          category: line.category,
          department: line.category === "payroll" ? "People" : line.category === "marketing" ? "Marketing" : "Operations",
          planned: Number((line.base * 1.05).toFixed(2)),
          actual: Number(amount.toFixed(2)),
        });
      }
    }

    // A deliberate outlier in the most recent month so anomaly detection has something real to find.
    if (back === 0) {
      transactions.push({
        user_id: userId,
        account_id: card,
        txn_date: new Date(Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth(), 12)).toISOString().slice(0, 10),
        description: "Cloud infrastructure — unplanned burst capacity",
        category: "cloud",
        counterparty: "Cloud infrastructure",
        direction: "out",
        amount: 41800,
        status: "cleared",
        source: "demo",
      });
    }
  }

  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const invoices: Database["public"]["Tables"]["fin_invoices"]["Insert"][] = [
    { kind: "receivable", number: "INV-2041", counterparty: "Northwind Group", amount: 24500, status: "sent", issue_date: iso(new Date(now.getTime() - 26 * 864e5)), due_date: iso(new Date(now.getTime() - 4 * 864e5)) },
    { kind: "receivable", number: "INV-2042", counterparty: "Halcyon Retail", amount: 18200, status: "sent", issue_date: iso(new Date(now.getTime() - 18 * 864e5)), due_date: iso(new Date(now.getTime() + 12 * 864e5)) },
    { kind: "receivable", number: "INV-2038", counterparty: "Vertex Labs", amount: 31000, status: "overdue", issue_date: iso(new Date(now.getTime() - 62 * 864e5)), due_date: iso(new Date(now.getTime() - 32 * 864e5)) },
    { kind: "receivable", number: "INV-2035", counterparty: "Blue Harbor", amount: 12750, status: "paid", issue_date: iso(new Date(now.getTime() - 70 * 864e5)), due_date: iso(new Date(now.getTime() - 40 * 864e5)), paid_at: new Date(now.getTime() - 38 * 864e5).toISOString() },
    { kind: "payable", number: "BILL-889", counterparty: "Cloud infrastructure", amount: 41800, status: "sent", issue_date: iso(new Date(now.getTime() - 10 * 864e5)), due_date: iso(new Date(now.getTime() + 5 * 864e5)) },
    { kind: "payable", number: "BILL-890", counterparty: "Agency retainer", amount: 7800, status: "sent", issue_date: iso(new Date(now.getTime() - 8 * 864e5)), due_date: iso(new Date(now.getTime() + 14 * 864e5)) },
  ].map((i) => ({ ...i, user_id: userId }));

  const expenses: Database["public"]["Tables"]["fin_expenses"]["Insert"][] = [
    { vendor: "Cloud infrastructure", category: "cloud", department: "Engineering", amount: 41800, status: "pending", notes: "Burst capacity overage — needs review", recurring: false },
    { vendor: "Conference travel", category: "travel", department: "Sales", amount: 6400, status: "pending", recurring: false },
    { vendor: "SaaS subscriptions", category: "software", department: "Operations", amount: 5400, status: "approved", recurring: true },
    { vendor: "Legal & audit", category: "professional-services", department: "Finance", amount: 2600, status: "approved", recurring: false },
  ].map((e) => ({ ...e, user_id: userId, expense_date: iso(now) }));

  const compliance: Database["public"]["Tables"]["fin_compliance_checks"]["Insert"][] = [
    { framework: "internal", control: "Segregation of duties on payments", description: "No AI employee may both create and approve a payment.", status: "passing", severity: "high" },
    { framework: "internal", control: "Approval threshold enforced", description: "Money movement above the configured threshold requires human approval.", status: "passing", severity: "critical" },
    { framework: "gaap", control: "Month-end reconciliation complete", description: "All bank accounts reconciled before statements are issued.", status: "attention", severity: "medium" },
    { framework: "tax", control: "Filing calendar up to date", description: "Upcoming filings tracked with owners assigned.", status: "pending", severity: "medium" },
    { framework: "soc2", control: "Finance audit log retention", description: "Every finance action is written to the immutable audit log.", status: "passing", severity: "high" },
  ].map((c) => ({ ...c, user_id: userId }));

  for (let i = 0; i < transactions.length; i += 500) {
    const { error } = await supabase.from("fin_transactions").insert(transactions.slice(i, i + 500));
    if (error) throw new Error(error.message);
  }
  await supabase.from("fin_budgets").upsert(budgets, { onConflict: "user_id,period_month,category" });
  await supabase.from("fin_invoices").insert(invoices);
  await supabase.from("fin_expenses").insert(expenses);
  await supabase.from("fin_compliance_checks").insert(compliance);
  await supabase
    .from("fin_settings")
    .upsert({ user_id: userId, autonomy_level: "assisted", approval_threshold: 1000 }, { onConflict: "user_id" });

  return { transactions: transactions.length, invoices: invoices.length, expenses: expenses.length };
}
