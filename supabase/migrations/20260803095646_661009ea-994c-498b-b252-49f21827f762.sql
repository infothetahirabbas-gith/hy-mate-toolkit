
-- 1. Categories
CREATE TABLE public.ai_employee_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ai_employee_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_employee_categories TO authenticated;
GRANT ALL ON public.ai_employee_categories TO service_role;

ALTER TABLE public.ai_employee_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can browse categories" ON public.ai_employee_categories
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Admins manage categories" ON public.ai_employee_categories
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER ai_employee_categories_updated_at
  BEFORE UPDATE ON public.ai_employee_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.ai_employee_categories (name, slug, description, sort_order) VALUES
  ('Marketing', 'marketing', 'SEO, content and demand generation specialists.', 1),
  ('Sales', 'sales', 'Prospecting, outreach and pipeline specialists.', 2),
  ('Support', 'support', 'Customer support and success specialists.', 3),
  ('Ecommerce', 'ecommerce', 'Storefront, catalog and conversion specialists.', 4),
  ('Finance', 'finance', 'Bookkeeping, reporting and forecasting specialists.', 5),
  ('HR', 'hr', 'Recruiting, onboarding and people ops specialists.', 6);

-- 2. AI employees: avatar, status, agent-ready config, category link
ALTER TABLE public.ai_employees
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'available',
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.ai_employee_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS system_prompt text,
  ADD COLUMN IF NOT EXISTS knowledge_base jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS available_tools text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS agent_configuration jsonb NOT NULL DEFAULT '{}'::jsonb;

UPDATE public.ai_employees e
SET category_id = c.id
FROM public.ai_employee_categories c
WHERE lower(c.name) = lower(e.category) AND e.category_id IS NULL;

-- Agent settings are admin-only: restrict the public browse policy to safe columns
DROP POLICY IF EXISTS "Anyone can browse active AI employees" ON public.ai_employees;
REVOKE SELECT ON public.ai_employees FROM anon, authenticated;
GRANT SELECT (id, slug, name, role_title, category, category_id, tagline, description,
  features, skills, persona, price_monthly, accent, avatar_url, status,
  workspace_input_label, workspace_input_placeholder, is_active, sort_order,
  created_at, updated_at) ON public.ai_employees TO anon, authenticated;

CREATE POLICY "Anyone can browse active AI employees" ON public.ai_employees
  FOR SELECT TO anon, authenticated USING (is_active = true);

-- 3. Tasks & reports typing
ALTER TABLE public.ai_tasks ADD COLUMN IF NOT EXISTS task_type text NOT NULL DEFAULT 'general';
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS report_type text;
UPDATE public.reports SET report_type = type WHERE report_type IS NULL;

-- 4. Subscriptions billing detail
ALTER TABLE public.user_subscriptions
  ADD COLUMN IF NOT EXISTS plan_name text NOT NULL DEFAULT 'Starter',
  ADD COLUMN IF NOT EXISTS amount integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS billing_cycle text NOT NULL DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS start_date timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS end_date timestamptz;

UPDATE public.user_subscriptions SET amount = price_monthly WHERE amount = 0;

-- 5. Profile detail
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS company_website text,
  ADD COLUMN IF NOT EXISTS country text;

ALTER TABLE public.business_profiles
  ADD COLUMN IF NOT EXISTS target_audience text,
  ADD COLUMN IF NOT EXISTS primary_goal text;
