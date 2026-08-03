-- SKILLS LIBRARY
CREATE TABLE public.skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  required_tools text[] NOT NULL DEFAULT '{}',
  difficulty text NOT NULL DEFAULT 'intermediate',
  category text NOT NULL DEFAULT 'General',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.skills TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.skills TO authenticated;
GRANT ALL ON public.skills TO service_role;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can browse skills" ON public.skills FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage skills" ON public.skills FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER skills_updated_at BEFORE UPDATE ON public.skills FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.employee_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.ai_employees(id) ON DELETE CASCADE,
  skill_id uuid NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  proficiency text NOT NULL DEFAULT 'expert',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_id, skill_id)
);
GRANT SELECT ON public.employee_skills TO anon;
GRANT SELECT ON public.employee_skills TO authenticated;
GRANT ALL ON public.employee_skills TO service_role;
ALTER TABLE public.employee_skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can browse employee skills" ON public.employee_skills FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage employee skills" ON public.employee_skills FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- KNOWLEDGE BASE
CREATE TABLE public.knowledge_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES public.ai_employees(id) ON DELETE CASCADE,
  title text NOT NULL,
  doc_type text NOT NULL DEFAULT 'note',
  source_url text,
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.knowledge_documents TO authenticated;
GRANT ALL ON public.knowledge_documents TO service_role;
ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own knowledge" ON public.knowledge_documents FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER knowledge_documents_updated_at BEFORE UPDATE ON public.knowledge_documents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- MEMORY
CREATE TABLE public.agent_memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES public.ai_employees(id) ON DELETE CASCADE,
  memory_type text NOT NULL DEFAULT 'long_term',
  category text NOT NULL DEFAULT 'business',
  content text NOT NULL,
  importance integer NOT NULL DEFAULT 3,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_memories TO authenticated;
GRANT ALL ON public.agent_memories TO service_role;
ALTER TABLE public.agent_memories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own memories" ON public.agent_memories FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER agent_memories_updated_at BEFORE UPDATE ON public.agent_memories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- CHAT WORKSPACE
CREATE TABLE public.agent_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.ai_employees(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'New conversation',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_conversations TO authenticated;
GRANT ALL ON public.agent_conversations TO service_role;
ALTER TABLE public.agent_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own conversations" ON public.agent_conversations FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER agent_conversations_updated_at BEFORE UPDATE ON public.agent_conversations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.agent_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.agent_conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX agent_messages_conversation_idx ON public.agent_messages (conversation_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_messages TO authenticated;
GRANT ALL ON public.agent_messages TO service_role;
ALTER TABLE public.agent_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own messages" ON public.agent_messages FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- FEEDBACK / LEARNING
CREATE TABLE public.task_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.ai_employees(id) ON DELETE CASCADE,
  task_id uuid REFERENCES public.ai_tasks(id) ON DELETE CASCADE,
  rating integer NOT NULL DEFAULT 5,
  correction text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_feedback TO authenticated;
GRANT ALL ON public.task_feedback TO service_role;
ALTER TABLE public.task_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own feedback" ON public.task_feedback FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- PERFORMANCE
CREATE TABLE public.employee_performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.ai_employees(id) ON DELETE CASCADE,
  day date NOT NULL DEFAULT current_date,
  tasks_completed integer NOT NULL DEFAULT 0,
  tasks_failed integer NOT NULL DEFAULT 0,
  reports_generated integer NOT NULL DEFAULT 0,
  minutes_saved integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, employee_id, day)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_performance TO authenticated;
GRANT ALL ON public.employee_performance TO service_role;
ALTER TABLE public.employee_performance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own performance" ON public.employee_performance FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER employee_performance_updated_at BEFORE UPDATE ON public.employee_performance FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();