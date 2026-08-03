ALTER TABLE public.ai_employees
  ADD COLUMN IF NOT EXISTS gender text NOT NULL DEFAULT 'female',
  ADD COLUMN IF NOT EXISTS department text NOT NULL DEFAULT 'General',
  ADD COLUMN IF NOT EXISTS main_responsibility text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS personality text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS daily_tasks text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS business_benefits text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS target_customers text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS integrations text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS reviews jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.ai_employee_categories
  ADD COLUMN IF NOT EXISTS tagline text,
  ADD COLUMN IF NOT EXISTS icon text;

CREATE INDEX IF NOT EXISTS ai_employees_category_id_idx ON public.ai_employees (category_id);