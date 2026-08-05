CREATE TABLE public.ai_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  department_slug text,
  tagline text,
  description text,
  price_monthly integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ai_teams TO anon;
GRANT SELECT ON public.ai_teams TO authenticated;
GRANT ALL ON public.ai_teams TO service_role;

ALTER TABLE public.ai_teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teams are publicly viewable" ON public.ai_teams FOR SELECT USING (true);

CREATE TRIGGER ai_teams_updated_at BEFORE UPDATE ON public.ai_teams
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX ai_teams_department_slug_idx ON public.ai_teams (department_slug);

ALTER TABLE public.ai_employees
  ADD COLUMN IF NOT EXISTS team_slug text,
  ADD COLUMN IF NOT EXISTS rating numeric(2,1) NOT NULL DEFAULT 4.8,
  ADD COLUMN IF NOT EXISTS review_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS businesses_served integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS verified boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS version text NOT NULL DEFAULT 'v1.0',
  ADD COLUMN IF NOT EXISTS last_updated_on date NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS languages text[] NOT NULL DEFAULT ARRAY['English']::text[],
  ADD COLUMN IF NOT EXISTS experience_years integer NOT NULL DEFAULT 8,
  ADD COLUMN IF NOT EXISTS hours_saved_monthly integer NOT NULL DEFAULT 40,
  ADD COLUMN IF NOT EXISTS cost_savings_monthly integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS success_rate integer NOT NULL DEFAULT 96,
  ADD COLUMN IF NOT EXISTS tasks_completed integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_completion_minutes integer NOT NULL DEFAULT 6,
  ADD COLUMN IF NOT EXISTS satisfaction numeric(3,1) NOT NULL DEFAULT 4.7,
  ADD COLUMN IF NOT EXISTS intro_line text,
  ADD COLUMN IF NOT EXISTS skill_levels jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS tool_status jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS portfolio jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS faqs jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS ai_employees_team_slug_idx ON public.ai_employees (team_slug);

ALTER TABLE public.user_subscriptions
  ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'employee',
  ADD COLUMN IF NOT EXISTS team_slug text,
  ADD COLUMN IF NOT EXISTS department_slug text;