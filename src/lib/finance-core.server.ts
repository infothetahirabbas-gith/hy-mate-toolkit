import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type Client = SupabaseClient<Database>;

export type MonthPoint = {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
  inflow: number;
  outflow: number;
  net: number;
};

const num = (v: unknown) => {
  const n = typeof v === "number" ? v : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

export function monthKey(date: string | Date) {
  const d = typeof date === "string" ? new Date(`${date}T00:00:00Z`) : date;
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

export function lastMonths(count: number, from = new Date()) {
  const out: string[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() - i, 1));
    out.push(monthKey(d));
  }
  return out;
}

export type FinanceDataset = {
  accounts: Database["public"]["Tables"]["fin_accounts"]["Row"][];
  transactions: Database["public"]["Tables"]["fin_transactions"]["Row"][];
  invoices: Database["public"]["Tables"]["fin_invoices"]["Row"][];
  expenses: Database["public"]["Tables"]["fin_expenses"]["Row"][];
  budgets: Database["public"]["Tables"]["fin_budgets"]["Row"][];
};

export async function loadDataset(supabase: Client, userId: string): Promise<FinanceDataset> {
  const since = new Date();
  since.setUTCMonth(since.getUTCMonth() - 17);
  const sinceIso = monthKey(since);

  const [accounts, transactions, invoices, expenses, budgets] = await Promise.all([
    supabase.from("fin_accounts").select("*").eq("user_id", userId).order("name"),
    supabase
      .from("fin_transactions")
      .select("*")
      .eq("user_id", userId)
      .gte("txn_date", sinceIso)
      .order("txn_date", { ascending: false })
      .limit(4000),
    supabase.from("fin_invoices").select("*").eq("user_id", userId).order("due_date", { ascending: true }),
    supabase.from("fin_expenses").select("*").eq("user_id", userId).order("expense_date", { ascending: false }),
    supabase.from("fin_budgets").select("*").eq("user_id", userId).order("period_month", { ascending: false }),
  ]);

  return {
    accounts: accounts.data ?? [],
    transactions: transactions.data ?? [],
    invoices: invoices.data ?? [],
    expenses: expenses.data ?? [],
    budgets: budgets.data ?? [],
  };
}

/** Monthly revenue / expense / profit / cash series derived only from recorded transactions. */
export function monthlySeries(data: FinanceDataset, months = 12): MonthPoint[] {
  const keys = lastMonths(months);
  const map = new Map<string, MonthPoint>(
    keys.map((month) => [month, { month, revenue: 0, expenses: 0, profit: 0, inflow: 0, outflow: 0, net: 0 }]),
  );

  for (const t of data.transactions) {
    const key = monthKey(t.txn_date);
    const point = map.get(key);
    if (!point) continue;
    const amount = Math.abs(num(t.amount));
    if (t.direction === "in") {
      point.inflow += amount;
      point.revenue += amount;
    } else {
      point.outflow += amount;
      point.expenses += amount;
    }
  }

  for (const point of map.values()) {
    point.profit = point.revenue - point.expenses;
    point.net = point.inflow - point.outflow;
  }

  return keys.map((k) => map.get(k)!);
}

export function categoryBreakdown(data: FinanceDataset, months = 3) {
  const cutoff = lastMonths(months)[0]!;
  const totals = new Map<string, number>();
  for (const t of data.transactions) {
    if (t.direction !== "out") continue;
    if (monthKey(t.txn_date) < cutoff) continue;
    totals.set(t.category, (totals.get(t.category) ?? 0) + Math.abs(num(t.amount)));
  }
  return [...totals.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}

export function kpis(data: FinanceDataset) {
  const series = monthlySeries(data, 13);
  const current = series[series.length - 1]!;
  const prior = series[series.length - 2] ?? current;

  const cashBalance = data.accounts
    .filter((a) => a.account_type === "bank" || a.account_type === "asset")
    .reduce((sum, a) => sum + num(a.balance), 0);

  const burnMonths = series.slice(-3).filter((m) => m.net < 0);
  const avgBurn = burnMonths.length
    ? burnMonths.reduce((s, m) => s + Math.abs(m.net), 0) / burnMonths.length
    : 0;
  const runwayMonths = avgBurn > 0 ? cashBalance / avgBurn : null;

  const today = new Date().toISOString().slice(0, 10);
  const openAr = data.invoices.filter((i) => i.kind === "receivable" && i.status !== "paid");
  const openAp = data.invoices.filter((i) => i.kind === "payable" && i.status !== "paid");
  const overdueAr = openAr.filter((i) => (i.due_date ?? "9999-12-31") < today);

  const ttmRevenue = series.slice(-12).reduce((s, m) => s + m.revenue, 0);
  const grossMargin = current.revenue > 0 ? ((current.revenue - current.expenses) / current.revenue) * 100 : 0;

  return {
    month: current.month,
    revenue: current.revenue,
    expenses: current.expenses,
    profit: current.profit,
    netCash: current.net,
    revenueChangePct: prior.revenue > 0 ? ((current.revenue - prior.revenue) / prior.revenue) * 100 : 0,
    expenseChangePct: prior.expenses > 0 ? ((current.expenses - prior.expenses) / prior.expenses) * 100 : 0,
    cashBalance,
    runwayMonths,
    monthlyBurn: avgBurn,
    ttmRevenue,
    grossMargin,
    arOutstanding: openAr.reduce((s, i) => s + num(i.amount), 0),
    apOutstanding: openAp.reduce((s, i) => s + num(i.amount), 0),
    overdueArCount: overdueAr.length,
    overdueArAmount: overdueAr.reduce((s, i) => s + num(i.amount), 0),
    pendingExpenses: data.expenses.filter((e) => e.status === "pending").length,
    anomalies: data.transactions.filter((t) => t.is_anomaly).length,
  };
}

export function profitAndLoss(data: FinanceDataset, months = 3) {
  const cutoff = lastMonths(months)[0]!;
  const revenue = new Map<string, number>();
  const expense = new Map<string, number>();

  for (const t of data.transactions) {
    if (monthKey(t.txn_date) < cutoff) continue;
    const bucket = t.direction === "in" ? revenue : expense;
    bucket.set(t.category, (bucket.get(t.category) ?? 0) + Math.abs(num(t.amount)));
  }

  const revenueLines = [...revenue.entries()].map(([label, amount]) => ({ label, amount })).sort((a, b) => b.amount - a.amount);
  const expenseLines = [...expense.entries()].map(([label, amount]) => ({ label, amount })).sort((a, b) => b.amount - a.amount);
  const totalRevenue = revenueLines.reduce((s, l) => s + l.amount, 0);
  const totalExpense = expenseLines.reduce((s, l) => s + l.amount, 0);

  return {
    periodMonths: months,
    from: cutoff,
    revenueLines,
    expenseLines,
    totalRevenue,
    totalExpense,
    netProfit: totalRevenue - totalExpense,
    margin: totalRevenue > 0 ? ((totalRevenue - totalExpense) / totalRevenue) * 100 : 0,
  };
}

export function balanceSheet(data: FinanceDataset) {
  const group = (types: string[]) =>
    data.accounts
      .filter((a) => types.includes(a.account_type))
      .map((a) => ({ label: a.name, amount: num(a.balance) }));

  const assets = group(["bank", "asset"]);
  const receivables = data.invoices
    .filter((i) => i.kind === "receivable" && i.status !== "paid")
    .reduce((s, i) => s + num(i.amount), 0);
  if (receivables) assets.push({ label: "Accounts receivable", amount: receivables });

  const liabilities = group(["liability", "credit"]);
  const payables = data.invoices
    .filter((i) => i.kind === "payable" && i.status !== "paid")
    .reduce((s, i) => s + num(i.amount), 0);
  if (payables) liabilities.push({ label: "Accounts payable", amount: payables });

  const totalAssets = assets.reduce((s, l) => s + l.amount, 0);
  const totalLiabilities = liabilities.reduce((s, l) => s + Math.abs(l.amount), 0);

  return { assets, liabilities, totalAssets, totalLiabilities, equity: totalAssets - totalLiabilities };
}

export function cashFlow(data: FinanceDataset, months = 6) {
  const series = monthlySeries(data, months);
  const opening = data.accounts.reduce((s, a) => s + num(a.balance), 0) - series.reduce((s, m) => s + m.net, 0);
  let running = opening;
  return series.map((m) => {
    running += m.net;
    return { ...m, closing: running };
  });
}

export function budgetVariance(data: FinanceDataset) {
  const month = monthKey(new Date());
  const actuals = new Map<string, number>();
  for (const t of data.transactions) {
    if (t.direction !== "out" || monthKey(t.txn_date) !== month) continue;
    actuals.set(t.category, (actuals.get(t.category) ?? 0) + Math.abs(num(t.amount)));
  }
  return data.budgets
    .filter((b) => b.period_month === month)
    .map((b) => {
      const actual = actuals.get(b.category) ?? num(b.actual);
      const planned = num(b.planned);
      return {
        id: b.id,
        category: b.category,
        department: b.department,
        planned,
        actual,
        variance: planned - actual,
        variancePct: planned > 0 ? ((actual - planned) / planned) * 100 : 0,
      };
    })
    .sort((a, b) => a.variance - b.variance);
}

/** Deterministic, explainable anomaly rules — verified facts, not AI guesses. */
export function detectAnomalies(data: FinanceDataset) {
  const out: { transactionId: string; reason: string; severity: "medium" | "high" }[] = [];
  const byCategory = new Map<string, number[]>();
  for (const t of data.transactions) {
    if (t.direction !== "out") continue;
    const list = byCategory.get(t.category) ?? [];
    list.push(Math.abs(num(t.amount)));
    byCategory.set(t.category, list);
  }

  const stats = new Map<string, { mean: number; sd: number }>();
  for (const [category, values] of byCategory) {
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const sd = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length);
    stats.set(category, { mean, sd });
  }

  const seen = new Map<string, string>();
  for (const t of data.transactions) {
    const amount = Math.abs(num(t.amount));
    if (t.direction === "out") {
      const s = stats.get(t.category);
      if (s && s.sd > 0 && amount > s.mean + 3 * s.sd) {
        out.push({
          transactionId: t.id,
          reason: `${t.category} spend of ${amount.toFixed(2)} is more than 3 standard deviations above the ${s.mean.toFixed(0)} average.`,
          severity: "high",
        });
        continue;
      }
    }
    const fingerprint = `${t.counterparty ?? ""}|${amount}|${t.txn_date}`;
    if (seen.has(fingerprint)) {
      out.push({
        transactionId: t.id,
        reason: `Possible duplicate of transaction on ${t.txn_date} for the same counterparty and amount.`,
        severity: "medium",
      });
    } else {
      seen.set(fingerprint, t.id);
    }
  }
  return out;
}

/** Linear-trend forecast with seasonality-free confidence bands. Explicitly a projection. */
export function forecastSeries(data: FinanceDataset, horizon = 6) {
  const history = monthlySeries(data, 12);
  const project = (values: number[]) => {
    const n = values.length;
    if (!n) return { slope: 0, intercept: 0, sd: 0 };
    const meanX = (n - 1) / 2;
    const meanY = values.reduce((s, v) => s + v, 0) / n;
    let numr = 0;
    let den = 0;
    values.forEach((v, i) => {
      numr += (i - meanX) * (v - meanY);
      den += (i - meanX) ** 2;
    });
    const slope = den ? numr / den : 0;
    const intercept = meanY - slope * meanX;
    const sd = Math.sqrt(values.reduce((s, v, i) => s + (v - (intercept + slope * i)) ** 2, 0) / n);
    return { slope, intercept, sd };
  };

  const metrics = {
    revenue: project(history.map((h) => h.revenue)),
    expense: project(history.map((h) => h.expenses)),
  };

  const base = new Date();
  const rows: {
    horizon_month: string;
    metric: string;
    amount: number;
    low: number;
    high: number;
    confidence: number;
  }[] = [];

  for (let i = 1; i <= horizon; i += 1) {
    const month = monthKey(new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + i, 1)));
    const idx = history.length - 1 + i;
    const revenue = Math.max(0, metrics.revenue.intercept + metrics.revenue.slope * idx);
    const expense = Math.max(0, metrics.expense.intercept + metrics.expense.slope * idx);
    const confidence = Math.max(35, 90 - i * 7);
    rows.push(
      { horizon_month: month, metric: "revenue", amount: revenue, low: Math.max(0, revenue - metrics.revenue.sd), high: revenue + metrics.revenue.sd, confidence },
      { horizon_month: month, metric: "expense", amount: expense, low: Math.max(0, expense - metrics.expense.sd), high: expense + metrics.expense.sd, confidence },
      { horizon_month: month, metric: "profit", amount: revenue - expense, low: revenue - expense - metrics.revenue.sd, high: revenue - expense + metrics.expense.sd, confidence },
    );
  }
  return rows;
}

export function financeSnapshot(data: FinanceDataset) {
  return {
    kpis: kpis(data),
    series: monthlySeries(data, 12),
    categories: categoryBreakdown(data, 3),
    pnl: profitAndLoss(data, 3),
    balance: balanceSheet(data),
    cash: cashFlow(data, 6),
    budgets: budgetVariance(data),
  };
}
