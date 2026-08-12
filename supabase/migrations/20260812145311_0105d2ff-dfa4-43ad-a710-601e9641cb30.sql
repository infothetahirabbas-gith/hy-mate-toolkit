-- 1. task actions
CREATE TABLE public.task_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id uuid REFERENCES public.ai_tasks(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES public.ai_employees(id) ON DELETE SET NULL,
  sequence integer NOT NULL DEFAULT 0,
  title text NOT NULL,
  description text,
  tool_id text,
  connector_id text,
  operation text NOT NULL DEFAULT 'analyze',
  risk text NOT NULL DEFAULT 'low',
  params jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'planned',
  requires_approval boolean NOT NULL DEFAULT false,
  result jsonb,
  error text,
  attempts integer NOT NULL DEFAULT 0,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_actions TO authenticated;
GRANT ALL ON public.task_actions TO service_role;
ALTER TABLE public.task_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own task actions" ON public.task_actions FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX task_actions_task_idx ON public.task_actions(task_id, sequence);
CREATE INDEX task_actions_user_status_idx ON public.task_actions(user_id, status);
CREATE TRIGGER task_actions_updated_at BEFORE UPDATE ON public.task_actions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. approvals
CREATE TABLE public.approval_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_id uuid REFERENCES public.task_actions(id) ON DELETE CASCADE,
  task_id uuid REFERENCES public.ai_tasks(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES public.ai_employees(id) ON DELETE SET NULL,
  title text NOT NULL,
  reason text,
  data_used text,
  expected_result text,
  risk text NOT NULL DEFAULT 'medium',
  tool_id text,
  target text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  decision_note text,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.approval_requests TO authenticated;
GRANT ALL ON public.approval_requests TO service_role;
ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own approvals" ON public.approval_requests FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX approval_requests_user_status_idx ON public.approval_requests(user_id, status, created_at DESC);
CREATE TRIGGER approval_requests_updated_at BEFORE UPDATE ON public.approval_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. risk policies
CREATE TABLE public.action_risk_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type text NOT NULL DEFAULT 'risk',
  target_key text NOT NULL,
  requires_approval boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, target_type, target_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.action_risk_policies TO authenticated;
GRANT ALL ON public.action_risk_policies TO service_role;
ALTER TABLE public.action_risk_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own risk policies" ON public.action_risk_policies FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER action_risk_policies_updated_at BEFORE UPDATE ON public.action_risk_policies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. audit log
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_type text NOT NULL DEFAULT 'user',
  actor_label text,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text,
  previous_value jsonb,
  new_value jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  result text NOT NULL DEFAULT 'success',
  risk text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own audit log" ON public.audit_logs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "write own audit log" ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE INDEX audit_logs_user_created_idx ON public.audit_logs(user_id, created_at DESC);

-- 5. encrypted app-user connector keys (server only)
CREATE TABLE public.app_user_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connector_id text NOT NULL,
  connection_key_ciphertext text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, connector_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_user_connections TO service_role;
ALTER TABLE public.app_user_connections ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER app_user_connections_updated_at BEFORE UPDATE ON public.app_user_connections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6. richer connection metadata on the user-visible integrations table
ALTER TABLE public.user_integrations
  ADD COLUMN IF NOT EXISTS connector_id text,
  ADD COLUMN IF NOT EXISTS scopes text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS last_sync_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_error text,
  ADD COLUMN IF NOT EXISTS permission_level text NOT NULL DEFAULT 'read_write';