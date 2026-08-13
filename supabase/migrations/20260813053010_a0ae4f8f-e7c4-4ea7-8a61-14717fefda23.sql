-- ACCOUNTS
CREATE TABLE public.fin_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  account_type text NOT NULL DEFAULT 'bank',
  code text,
  currency text NOT NULL DEFAULT 'USD',
  institution text,
  balance numeric(14,2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_accounts TO authenticated;
GRANT ALL ON public.fin_accounts TO service_role;
ALTER TABLE public.fin_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own fin_accounts" ON public.fin_accounts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER fin_accounts_updated_at BEFORE UPDATE ON public.fin_accounts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- TRANSACTIONS
CREATE TABLE public.fin_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id uuid REFERENCES public.fin_accounts(id) ON DELETE SET NULL,
  txn_date date NOT NULL DEFAULT current_date,
  description text NOT NULL,
  category text NOT NULL DEFAULT 'uncategorized',
  counterparty text,
  direction text NOT NULL DEFAULT 'out',
  amount numeric(14,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'cleared',
  source text NOT NULL DEFAULT 'manual',
  is_anomaly boolean NOT NULL DEFAULT false,
  anomaly_reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_transactions TO authenticated;
GRANT ALL ON public.fin_transactions TO service_role;
ALTER TABLE public.fin_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own fin_transactions" ON public.fin_transactions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER fin_transactions_updated_at BEFORE UPDATE ON public.fin_transactions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX fin_transactions_user_date_idx ON public.fin_transactions (user_id, txn_date DESC);

-- INVOICES
CREATE TABLE public.fin_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'receivable',
  number text NOT NULL,
  counterparty text NOT NULL,
  issue_date date NOT NULL DEFAULT current_date,
  due_date date,
  amount numeric(14,2) NOT NULL DEFAULT 0,
  tax_amount numeric(14,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'sent',
  paid_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_invoices TO authenticated;
GRANT ALL ON public.fin_invoices TO service_role;
ALTER TABLE public.fin_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own fin_invoices" ON public.fin_invoices FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER fin_invoices_updated_at BEFORE UPDATE ON public.fin_invoices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- EXPENSES
CREATE TABLE public.fin_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vendor text NOT NULL,
  category text NOT NULL DEFAULT 'operating',
  department text,
  amount numeric(14,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  expense_date date NOT NULL DEFAULT current_date,
  status text NOT NULL DEFAULT 'pending',
  recurring boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_expenses TO authenticated;
GRANT ALL ON public.fin_expenses TO service_role;
ALTER TABLE public.fin_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own fin_expenses" ON public.fin_expenses FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER fin_expenses_updated_at BEFORE UPDATE ON public.fin_expenses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- BUDGETS
CREATE TABLE public.fin_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_month date NOT NULL,
  category text NOT NULL,
  department text,
  planned numeric(14,2) NOT NULL DEFAULT 0,
  actual numeric(14,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, period_month, category)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_budgets TO authenticated;
GRANT ALL ON public.fin_budgets TO service_role;
ALTER TABLE public.fin_budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own fin_budgets" ON public.fin_budgets FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER fin_budgets_updated_at BEFORE UPDATE ON public.fin_budgets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- FORECASTS
CREATE TABLE public.fin_forecasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  horizon_month date NOT NULL,
  metric text NOT NULL,
  amount numeric(14,2) NOT NULL DEFAULT 0,
  low numeric(14,2),
  high numeric(14,2),
  method text NOT NULL DEFAULT 'trend',
  confidence integer NOT NULL DEFAULT 70,
  generated_by text NOT NULL DEFAULT 'ai',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, horizon_month, metric)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_forecasts TO authenticated;
GRANT ALL ON public.fin_forecasts TO service_role;
ALTER TABLE public.fin_forecasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own fin_forecasts" ON public.fin_forecasts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- INSIGHTS
CREATE TABLE public.fin_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES public.ai_employees(id) ON DELETE SET NULL,
  kind text NOT NULL DEFAULT 'recommendation',
  severity text NOT NULL DEFAULT 'medium',
  title text NOT NULL,
  detail text,
  impact_amount numeric(14,2) NOT NULL DEFAULT 0,
  confidence integer NOT NULL DEFAULT 70,
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  source text NOT NULL DEFAULT 'ai',
  verified boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_insights TO authenticated;
GRANT ALL ON public.fin_insights TO service_role;
ALTER TABLE public.fin_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own fin_insights" ON public.fin_insights FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER fin_insights_updated_at BEFORE UPDATE ON public.fin_insights FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- GOALS
CREATE TABLE public.fin_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  target_metric text NOT NULL DEFAULT 'operating_cost',
  target_change_pct numeric(6,2) NOT NULL DEFAULT 0,
  baseline_amount numeric(14,2) NOT NULL DEFAULT 0,
  current_amount numeric(14,2) NOT NULL DEFAULT 0,
  realized_savings numeric(14,2) NOT NULL DEFAULT 0,
  autonomy_level text NOT NULL DEFAULT 'assisted',
  status text NOT NULL DEFAULT 'planning',
  progress integer NOT NULL DEFAULT 0,
  due_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_goals TO authenticated;
GRANT ALL ON public.fin_goals TO service_role;
ALTER TABLE public.fin_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own fin_goals" ON public.fin_goals FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER fin_goals_updated_at BEFORE UPDATE ON public.fin_goals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.fin_goal_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL REFERENCES public.fin_goals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sequence integer NOT NULL DEFAULT 1,
  title text NOT NULL,
  detail text,
  owner_role text NOT NULL DEFAULT 'AI Finance Analyst',
  expected_impact numeric(14,2) NOT NULL DEFAULT 0,
  risk text NOT NULL DEFAULT 'low',
  requires_approval boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'proposed',
  result text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_goal_steps TO authenticated;
GRANT ALL ON public.fin_goal_steps TO service_role;
ALTER TABLE public.fin_goal_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own fin_goal_steps" ON public.fin_goal_steps FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER fin_goal_steps_updated_at BEFORE UPDATE ON public.fin_goal_steps FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- SETTINGS
CREATE TABLE public.fin_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  autonomy_level text NOT NULL DEFAULT 'assisted',
  approval_threshold numeric(14,2) NOT NULL DEFAULT 1000,
  require_approval_high_risk boolean NOT NULL DEFAULT true,
  base_currency text NOT NULL DEFAULT 'USD',
  fiscal_year_start integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_settings TO authenticated;
GRANT ALL ON public.fin_settings TO service_role;
ALTER TABLE public.fin_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own fin_settings" ON public.fin_settings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER fin_settings_updated_at BEFORE UPDATE ON public.fin_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- COMPLIANCE
CREATE TABLE public.fin_compliance_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  framework text NOT NULL DEFAULT 'internal',
  control text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending',
  severity text NOT NULL DEFAULT 'medium',
  last_checked_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_compliance_checks TO authenticated;
GRANT ALL ON public.fin_compliance_checks TO service_role;
ALTER TABLE public.fin_compliance_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own fin_compliance_checks" ON public.fin_compliance_checks FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER fin_compliance_updated_at BEFORE UPDATE ON public.fin_compliance_checks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();