import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getFinanceOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { loadDataset, financeSnapshot } = await import("@/lib/finance-core.server");
    const { financeSettings } = await import("@/lib/finance-audit.server");
    const { supabase, userId } = context;

    const [dataset, settings, insights] = await Promise.all([
      loadDataset(supabase, userId),
      financeSettings(supabase, userId),
      supabase
        .from("fin_insights")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "open")
        .order("impact_amount", { ascending: false })
        .limit(6),
    ]);

    return {
      ...financeSnapshot(dataset),
      settings,
      insights: insights.data ?? [],
      hasData: dataset.transactions.length > 0 || dataset.accounts.length > 0,
      accounts: dataset.accounts,
      recentTransactions: dataset.transactions.slice(0, 12),
    };
  });

export const seedFinanceDemo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { count } = await supabase
      .from("fin_transactions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    if ((count ?? 0) > 0) throw new Error("You already have finance data. Clear it before loading the demo company.");

    const { seedDemoFinance } = await import("@/lib/finance-seed.server");
    const { logFinance } = await import("@/lib/finance-audit.server");
    const result = await seedDemoFinance(supabase, userId);
    await logFinance(supabase, userId, { action: "finance.demo_seeded", resourceType: "fin_dataset", metadata: result });
    return result;
  });

export const clearFinanceData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    for (const table of [
      "fin_goal_steps",
      "fin_goals",
      "fin_insights",
      "fin_forecasts",
      "fin_budgets",
      "fin_expenses",
      "fin_invoices",
      "fin_transactions",
      "fin_accounts",
      "fin_compliance_checks",
    ] as const) {
      await supabase.from(table).delete().eq("user_id", userId);
    }
    const { logFinance } = await import("@/lib/finance-audit.server");
    await logFinance(supabase, userId, { action: "finance.data_cleared", resourceType: "fin_dataset", risk: "high" });
    return { ok: true };
  });

/* ------------------------------- transactions ------------------------------ */

export const listFinanceTransactions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        search: z.string().trim().max(120).default(""),
        category: z.string().trim().max(60).default(""),
        direction: z.enum(["all", "in", "out"]).default("all"),
        anomaliesOnly: z.boolean().default(false),
        limit: z.number().int().min(10).max(500).default(200),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    let query = context.supabase
      .from("fin_transactions")
      .select("*, account:fin_accounts(name)")
      .eq("user_id", context.userId)
      .order("txn_date", { ascending: false })
      .limit(data.limit);

    if (data.category) query = query.eq("category", data.category);
    if (data.direction !== "all") query = query.eq("direction", data.direction);
    if (data.anomaliesOnly) query = query.eq("is_anomaly", true);
    if (data.search) query = query.or(`description.ilike.%${data.search}%,counterparty.ilike.%${data.search}%`);

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const saveTransaction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        account_id: z.string().uuid().nullable().default(null),
        txn_date: z.string().min(8).max(10),
        description: z.string().trim().min(1).max(240),
        category: z.string().trim().min(1).max(60),
        counterparty: z.string().trim().max(160).default(""),
        direction: z.enum(["in", "out"]),
        amount: z.number().min(0),
        status: z.enum(["cleared", "pending", "void"]).default("cleared"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const payload = { ...data, counterparty: data.counterparty || null, user_id: userId, source: "manual" };
    const { logFinance } = await import("@/lib/finance-audit.server");

    if (data.id) {
      const { error } = await supabase.from("fin_transactions").update(payload).eq("id", data.id).eq("user_id", userId);
      if (error) throw new Error(error.message);
      await logFinance(supabase, userId, { action: "finance.transaction_updated", resourceType: "fin_transaction", resourceId: data.id, next: payload });
      return { ok: true, id: data.id };
    }

    const { data: row, error } = await supabase.from("fin_transactions").insert(payload).select("id").maybeSingle();
    if (error) throw new Error(error.message);
    await logFinance(supabase, userId, { action: "finance.transaction_created", resourceType: "fin_transaction", resourceId: row?.id, next: payload });
    return { ok: true, id: row?.id ?? null };
  });

export const deleteTransaction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("fin_transactions")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    const { logFinance } = await import("@/lib/finance-audit.server");
    await logFinance(context.supabase, context.userId, {
      action: "finance.transaction_deleted",
      resourceType: "fin_transaction",
      resourceId: data.id,
      risk: "medium",
    });
    return { ok: true };
  });

export const importTransactions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        accountId: z.string().uuid().nullable().default(null),
        rows: z
          .array(
            z.object({
              txn_date: z.string().min(8).max(10),
              description: z.string().trim().min(1).max(240),
              category: z.string().trim().max(60).default("uncategorized"),
              counterparty: z.string().trim().max(160).default(""),
              direction: z.enum(["in", "out"]),
              amount: z.number().min(0),
            }),
          )
          .min(1)
          .max(2000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const rows = data.rows.map((r) => ({
      ...r,
      counterparty: r.counterparty || null,
      account_id: data.accountId,
      user_id: userId,
      source: "import",
    }));
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await supabase.from("fin_transactions").insert(rows.slice(i, i + 500));
      if (error) throw new Error(error.message);
    }
    const { logFinance } = await import("@/lib/finance-audit.server");
    await logFinance(supabase, userId, {
      action: "finance.transactions_imported",
      resourceType: "fin_transaction",
      metadata: { count: rows.length },
    });
    return { imported: rows.length };
  });

/* --------------------------------- accounts -------------------------------- */

export const saveFinanceAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        name: z.string().trim().min(1).max(120),
        account_type: z.enum(["bank", "asset", "liability", "credit", "equity"]).default("bank"),
        institution: z.string().trim().max(120).default(""),
        currency: z.string().trim().min(3).max(3).default("USD"),
        balance: z.number(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const payload = { ...data, institution: data.institution || null, user_id: userId };
    const { error } = data.id
      ? await supabase.from("fin_accounts").update(payload).eq("id", data.id).eq("user_id", userId)
      : await supabase.from("fin_accounts").insert(payload);
    if (error) throw new Error(error.message);
    const { logFinance } = await import("@/lib/finance-audit.server");
    await logFinance(supabase, userId, { action: data.id ? "finance.account_updated" : "finance.account_created", resourceType: "fin_account", resourceId: data.id, next: payload });
    return { ok: true };
  });

/* --------------------------------- invoices -------------------------------- */

export const listInvoices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("fin_invoices")
      .select("*")
      .eq("user_id", context.userId)
      .order("due_date", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        kind: z.enum(["receivable", "payable"]),
        number: z.string().trim().min(1).max(60),
        counterparty: z.string().trim().min(1).max(160),
        issue_date: z.string().min(8).max(10),
        due_date: z.string().min(8).max(10),
        amount: z.number().min(0),
        tax_amount: z.number().min(0).default(0),
        status: z.enum(["draft", "sent", "paid", "overdue", "void"]).default("sent"),
        notes: z.string().trim().max(600).default(""),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const payload = {
      ...data,
      notes: data.notes || null,
      paid_at: data.status === "paid" ? new Date().toISOString() : null,
      user_id: userId,
    };
    const { error } = data.id
      ? await supabase.from("fin_invoices").update(payload).eq("id", data.id).eq("user_id", userId)
      : await supabase.from("fin_invoices").insert(payload);
    if (error) throw new Error(error.message);
    const { logFinance } = await import("@/lib/finance-audit.server");
    await logFinance(supabase, userId, {
      action: data.id ? "finance.invoice_updated" : "finance.invoice_created",
      resourceType: "fin_invoice",
      resourceId: data.id,
      next: payload,
      risk: "medium",
    });
    return { ok: true };
  });

/* --------------------------------- expenses -------------------------------- */

export const listExpenses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("fin_expenses")
      .select("*")
      .eq("user_id", context.userId)
      .order("expense_date", { ascending: false })
      .limit(300);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveExpense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        vendor: z.string().trim().min(1).max(160),
        category: z.string().trim().min(1).max(60),
        department: z.string().trim().max(80).default(""),
        amount: z.number().min(0),
        expense_date: z.string().min(8).max(10),
        recurring: z.boolean().default(false),
        notes: z.string().trim().max(600).default(""),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const payload = { ...data, department: data.department || null, notes: data.notes || null, user_id: userId };
    const { error } = data.id
      ? await supabase.from("fin_expenses").update(payload).eq("id", data.id).eq("user_id", userId)
      : await supabase.from("fin_expenses").insert({ ...payload, status: "pending" });
    if (error) throw new Error(error.message);
    const { logFinance } = await import("@/lib/finance-audit.server");
    await logFinance(supabase, userId, { action: data.id ? "finance.expense_updated" : "finance.expense_created", resourceType: "fin_expense", resourceId: data.id, next: payload });
    return { ok: true };
  });

export const decideExpense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        decision: z.enum(["approved", "rejected"]),
        note: z.string().trim().max(400).default(""),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: expense } = await supabase
      .from("fin_expenses")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!expense) throw new Error("Expense not found.");
    if (expense.status !== "pending") throw new Error("This expense was already decided.");

    const { error } = await supabase
      .from("fin_expenses")
      .update({ status: data.decision, notes: data.note || expense.notes })
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);

    const { logFinance } = await import("@/lib/finance-audit.server");
    await logFinance(supabase, userId, {
      action: `finance.expense_${data.decision}`,
      resourceType: "fin_expense",
      resourceId: data.id,
      previous: { status: expense.status },
      next: { status: data.decision, note: data.note },
      risk: Number(expense.amount) > 10000 ? "high" : "medium",
    });
    return { ok: true };
  });

/* --------------------------------- budgets --------------------------------- */

export const listBudgets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { loadDataset, budgetVariance } = await import("@/lib/finance-core.server");
    const dataset = await loadDataset(context.supabase, context.userId);
    return { rows: dataset.budgets, variance: budgetVariance(dataset) };
  });

export const saveBudget = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        period_month: z.string().min(8).max(10),
        category: z.string().trim().min(1).max(60),
        department: z.string().trim().max(80).default(""),
        planned: z.number().min(0),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("fin_budgets").upsert(
      { ...data, department: data.department || null, user_id: context.userId },
      { onConflict: "user_id,period_month,category" },
    );
    if (error) throw new Error(error.message);
    const { logFinance } = await import("@/lib/finance-audit.server");
    await logFinance(context.supabase, context.userId, { action: "finance.budget_set", resourceType: "fin_budget", next: data });
    return { ok: true };
  });

/* --------------------------------- reports --------------------------------- */

export const getFinanceReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ months: z.number().int().min(1).max(12).default(3) }).parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const { loadDataset, profitAndLoss, balanceSheet, cashFlow, monthlySeries } = await import("@/lib/finance-core.server");
    const dataset = await loadDataset(context.supabase, context.userId);
    return {
      pnl: profitAndLoss(dataset, data.months),
      balance: balanceSheet(dataset),
      cash: cashFlow(dataset, Math.max(6, data.months)),
      series: monthlySeries(dataset, 12),
    };
  });

/* -------------------------------- forecasts -------------------------------- */

export const listForecasts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("fin_forecasts")
      .select("*")
      .eq("user_id", context.userId)
      .order("horizon_month", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const runForecast = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ horizon: z.number().int().min(3).max(12).default(6) }).parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const { loadDataset, forecastSeries } = await import("@/lib/finance-core.server");
    const dataset = await loadDataset(context.supabase, context.userId);
    const rows = forecastSeries(dataset, data.horizon).map((r) => ({
      ...r,
      user_id: context.userId,
      method: "linear-trend",
      generated_by: "system",
    }));
    await context.supabase.from("fin_forecasts").delete().eq("user_id", context.userId);
    if (rows.length) {
      const { error } = await context.supabase.from("fin_forecasts").insert(rows);
      if (error) throw new Error(error.message);
    }
    const { logFinance } = await import("@/lib/finance-audit.server");
    await logFinance(context.supabase, context.userId, {
      action: "finance.forecast_generated",
      resourceType: "fin_forecast",
      actorType: "ai",
      actorLabel: "AI FP&A Manager",
      metadata: { horizon: data.horizon },
    });
    return { generated: rows.length };
  });

/* --------------------------------- insights -------------------------------- */

export const listFinanceInsights = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("fin_insights")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(60);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const runFinanceScan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { generateInsights } = await import("@/lib/finance-ai.server");
    const result = await generateInsights(context.supabase, context.userId);
    const { logFinance } = await import("@/lib/finance-audit.server");
    await logFinance(context.supabase, context.userId, {
      action: "finance.analysis_run",
      resourceType: "fin_insight",
      actorType: "ai",
      actorLabel: "AI Risk & Financial Analyst",
      metadata: result,
    });
    return result;
  });

export const setInsightStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["open", "accepted", "dismissed", "resolved"]),
        verified: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("fin_insights")
      .update({ status: data.status, ...(data.verified === undefined ? {} : { verified: data.verified }) })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    const { logFinance } = await import("@/lib/finance-audit.server");
    await logFinance(context.supabase, context.userId, {
      action: `finance.insight_${data.status}`,
      resourceType: "fin_insight",
      resourceId: data.id,
    });
    return { ok: true };
  });

/* ----------------------------------- goals --------------------------------- */

export const listFinanceGoals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("fin_goals")
      .select("*, steps:fin_goal_steps(*)")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createFinanceGoal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        title: z.string().trim().min(3).max(160),
        description: z.string().trim().max(600).default(""),
        target_metric: z.enum(["operating_cost", "revenue", "profit", "cash_runway", "dso"]).default("operating_cost"),
        target_change_pct: z.number().min(-100).max(500).default(15),
        autonomy_level: z.enum(["observe", "assisted", "supervised", "autonomous"]).default("assisted"),
        due_date: z.string().min(8).max(10).nullable().default(null),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: goal, error } = await supabase
      .from("fin_goals")
      .insert({ ...data, description: data.description || null, user_id: userId, status: "planning" })
      .select("*")
      .maybeSingle();
    if (error || !goal) throw new Error(error?.message ?? "Could not create the goal.");

    const { planGoal } = await import("@/lib/finance-ai.server");
    const plan = await planGoal(supabase, userId, goal);

    const { logFinance } = await import("@/lib/finance-audit.server");
    await logFinance(supabase, userId, {
      action: "finance.goal_created",
      resourceType: "fin_goal",
      resourceId: goal.id,
      actorType: "ai",
      actorLabel: "AI CFO",
      next: { ...data, ...plan },
    });
    return { id: goal.id, ...plan };
  });

export const replanFinanceGoal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ goalId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: goal } = await context.supabase
      .from("fin_goals")
      .select("*")
      .eq("id", data.goalId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!goal) throw new Error("Goal not found.");
    const { planGoal } = await import("@/lib/finance-ai.server");
    return planGoal(context.supabase, context.userId, goal);
  });

export const decideGoalStep = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        stepId: z.string().uuid(),
        decision: z.enum(["approved", "rejected", "completed"]),
        result: z.string().trim().max(600).default(""),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: step } = await supabase
      .from("fin_goal_steps")
      .select("*")
      .eq("id", data.stepId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!step) throw new Error("Step not found.");

    const { financeSettings, requiresHumanApproval, logFinance } = await import("@/lib/finance-audit.server");
    const settings = await financeSettings(supabase, userId);
    const gate = requiresHumanApproval(settings, {
      amount: Number(step.expected_impact),
      risk: step.risk,
      regulated: step.requires_approval,
    });

    const { error } = await supabase
      .from("fin_goal_steps")
      .update({ status: data.decision, result: data.result || null })
      .eq("id", data.stepId)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);

    const { data: siblings } = await supabase
      .from("fin_goal_steps")
      .select("status, expected_impact")
      .eq("goal_id", step.goal_id)
      .eq("user_id", userId);
    const done = (siblings ?? []).filter((s) => s.status === "completed");
    const progress = siblings?.length ? Math.round((done.length / siblings.length) * 100) : 0;
    const realized = done.reduce((sum, s) => sum + Number(s.expected_impact ?? 0), 0);

    await supabase
      .from("fin_goals")
      .update({ progress, realized_savings: realized, status: progress >= 100 ? "completed" : "active" })
      .eq("id", step.goal_id)
      .eq("user_id", userId);

    await logFinance(supabase, userId, {
      action: `finance.goal_step_${data.decision}`,
      resourceType: "fin_goal_step",
      resourceId: data.stepId,
      metadata: { gate: gate.reason, goal_id: step.goal_id },
      risk: step.risk,
    });

    return { ok: true, progress, gate };
  });

/* -------------------------------- compliance ------------------------------- */

export const listCompliance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("fin_compliance_checks")
      .select("*")
      .eq("user_id", context.userId)
      .order("severity", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const setComplianceStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["passing", "attention", "failing", "pending"]),
        notes: z.string().trim().max(600).default(""),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("fin_compliance_checks")
      .update({ status: data.status, notes: data.notes || null, last_checked_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    const { logFinance } = await import("@/lib/finance-audit.server");
    await logFinance(context.supabase, context.userId, {
      action: "finance.compliance_updated",
      resourceType: "fin_compliance_check",
      resourceId: data.id,
      next: { status: data.status },
    });
    return { ok: true };
  });

/* --------------------------------- settings -------------------------------- */

export const getFinanceSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { financeSettings } = await import("@/lib/finance-audit.server");
    return financeSettings(context.supabase, context.userId);
  });

export const saveFinanceSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        autonomy_level: z.enum(["observe", "assisted", "supervised", "autonomous"]),
        approval_threshold: z.number().min(0).max(10_000_000),
        require_approval_high_risk: z.boolean(),
        base_currency: z.string().trim().min(3).max(3),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("fin_settings")
      .upsert({ ...data, user_id: context.userId }, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    const { logFinance } = await import("@/lib/finance-audit.server");
    await logFinance(context.supabase, context.userId, {
      action: "finance.settings_updated",
      resourceType: "fin_settings",
      next: data,
      risk: "high",
    });
    return { ok: true };
  });

/* ---------------------------------- CFO chat ------------------------------- */

export const askFinanceCfo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        question: z.string().trim().min(2).max(1200),
        history: z
          .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) }))
          .max(12)
          .default([]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { askCfo } = await import("@/lib/finance-ai.server");
    const answer = await askCfo(context.supabase, context.userId, data.question, data.history);
    const { logFinance } = await import("@/lib/finance-audit.server");
    await logFinance(context.supabase, context.userId, {
      action: "finance.cfo_query",
      resourceType: "fin_cfo_chat",
      actorType: "ai",
      actorLabel: "AI CFO",
      metadata: { question: data.question.slice(0, 200) },
    });
    return { answer };
  });

/* --------------------------------- audit ----------------------------------- */

export const listFinanceAudit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("audit_logs")
      .select("*")
      .eq("user_id", context.userId)
      .like("action", "finance.%")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
