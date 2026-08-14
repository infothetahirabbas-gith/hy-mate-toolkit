CREATE TABLE public.company_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal text NOT NULL,
  context text,
  budget numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  deadline date,
  autonomy_level text NOT NULL DEFAULT 'assisted',
  status text NOT NULL DEFAULT 'planning',
  progress integer NOT NULL DEFAULT 0,
  summary text,
  strategy jsonb NOT NULL DEFAULT '{}'::jsonb,
  risks jsonb NOT NULL DEFAULT '[]'::jsonb,
  kpis jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_goals TO authenticated;
GRANT ALL ON public.company_goals TO service_role;
ALTER TABLE public.company_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own company goals" ON public.company_goals
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER company_goals_updated_at BEFORE UPDATE ON public.company_goals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.company_goal_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL REFERENCES public.company_goals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sequence integer NOT NULL DEFAULT 1,
  title text NOT NULL,
  detail text,
  department_slug text,
  owner_role text NOT NULL DEFAULT 'AI Specialist',
  employee_id uuid REFERENCES public.ai_employees(id) ON DELETE SET NULL,
  task_id uuid REFERENCES public.ai_tasks(id) ON DELETE SET NULL,
  risk text NOT NULL DEFAULT 'low',
  requires_approval boolean NOT NULL DEFAULT false,
  expected_outcome text,
  status text NOT NULL DEFAULT 'pending',
  result text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_goal_steps TO authenticated;
GRANT ALL ON public.company_goal_steps TO service_role;
ALTER TABLE public.company_goal_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own company goal steps" ON public.company_goal_steps
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER company_goal_steps_updated_at BEFORE UPDATE ON public.company_goal_steps
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX company_goal_steps_goal_idx ON public.company_goal_steps(goal_id, sequence);