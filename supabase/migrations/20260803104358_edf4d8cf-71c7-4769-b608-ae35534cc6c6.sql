-- 1. Memory control -------------------------------------------------------
ALTER TABLE public.agent_memories
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'chat',
  ADD COLUMN IF NOT EXISTS confidence integer NOT NULL DEFAULT 80;

CREATE TABLE IF NOT EXISTS public.memory_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  auto_save boolean NOT NULL DEFAULT true,
  require_approval boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.memory_settings TO authenticated;
GRANT ALL ON public.memory_settings TO service_role;
ALTER TABLE public.memory_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own memory settings" ON public.memory_settings
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER memory_settings_updated_at BEFORE UPDATE ON public.memory_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. AI team projects ------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  goal text,
  status text NOT NULL DEFAULT 'active',
  progress integer NOT NULL DEFAULT 0,
  due_date timestamptz,
  shared_knowledge text,
  final_output jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_projects TO authenticated;
GRANT ALL ON public.ai_projects TO service_role;
ALTER TABLE public.ai_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own projects" ON public.ai_projects
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER ai_projects_updated_at BEFORE UPDATE ON public.ai_projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.ai_project_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.ai_projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.ai_employees(id) ON DELETE CASCADE,
  project_role text NOT NULL DEFAULT 'contributor',
  contribution jsonb,
  status text NOT NULL DEFAULT 'assigned',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, employee_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_project_members TO authenticated;
GRANT ALL ON public.ai_project_members TO service_role;
ALTER TABLE public.ai_project_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own project members" ON public.ai_project_members
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.ai_project_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.ai_projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES public.ai_employees(id) ON DELETE SET NULL,
  author text NOT NULL DEFAULT 'agent',
  kind text NOT NULL DEFAULT 'update',
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_project_messages TO authenticated;
GRANT ALL ON public.ai_project_messages TO service_role;
ALTER TABLE public.ai_project_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own project messages" ON public.ai_project_messages
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS ai_project_members_project_idx ON public.ai_project_members(project_id);
CREATE INDEX IF NOT EXISTS ai_project_messages_project_idx ON public.ai_project_messages(project_id, created_at);

-- 3. Tool registry ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.employee_tool_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.ai_employees(id) ON DELETE CASCADE,
  tool_id text NOT NULL,
  permission text NOT NULL DEFAULT 'approval',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, employee_id, tool_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_tool_permissions TO authenticated;
GRANT ALL ON public.employee_tool_permissions TO service_role;
ALTER TABLE public.employee_tool_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tool permissions" ON public.employee_tool_permissions
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER employee_tool_permissions_updated_at BEFORE UPDATE ON public.employee_tool_permissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.tool_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES public.ai_employees(id) ON DELETE SET NULL,
  task_id uuid REFERENCES public.ai_tasks(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.ai_projects(id) ON DELETE SET NULL,
  tool_id text NOT NULL,
  action text NOT NULL,
  outcome text NOT NULL DEFAULT 'allowed',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tool_activity_logs TO authenticated;
GRANT ALL ON public.tool_activity_logs TO service_role;
ALTER TABLE public.tool_activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tool logs" ON public.tool_activity_logs
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS tool_activity_logs_user_idx ON public.tool_activity_logs(user_id, created_at DESC);

-- 4. Workflow automation ---------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  trigger_type text NOT NULL DEFAULT 'manual',
  trigger_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'active',
  run_count integer NOT NULL DEFAULT 0,
  last_run_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workflows TO authenticated;
GRANT ALL ON public.workflows TO service_role;
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own workflows" ON public.workflows
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER workflows_updated_at BEFORE UPDATE ON public.workflows
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.workflow_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'running',
  log jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workflow_runs TO authenticated;
GRANT ALL ON public.workflow_runs TO service_role;
ALTER TABLE public.workflow_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own workflow runs" ON public.workflow_runs
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5. Structured task execution --------------------------------------------
ALTER TABLE public.ai_tasks
  ADD COLUMN IF NOT EXISTS steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS tools_used text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS requires_approval boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.ai_projects(id) ON DELETE SET NULL;