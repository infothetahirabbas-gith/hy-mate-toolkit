-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins read all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Timestamp helper
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- Profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text,
  email text,
  company text,
  industry text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own profile" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins read all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, company)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'name', NEW.email, NEW.raw_user_meta_data ->> 'company')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- AI employees catalog
CREATE TABLE public.ai_employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  role_title text NOT NULL,
  category text NOT NULL,
  tagline text NOT NULL,
  description text NOT NULL,
  features text[] NOT NULL DEFAULT '{}',
  skills text[] NOT NULL DEFAULT '{}',
  persona text NOT NULL,
  price_monthly integer NOT NULL,
  accent text NOT NULL DEFAULT 'primary',
  workspace_input_label text NOT NULL DEFAULT 'Website URL',
  workspace_input_placeholder text NOT NULL DEFAULT 'https://yourcompany.com',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ai_employees TO anon;
GRANT SELECT ON public.ai_employees TO authenticated;
GRANT ALL ON public.ai_employees TO service_role;
ALTER TABLE public.ai_employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can browse active AI employees" ON public.ai_employees FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "Admins manage AI employees" ON public.ai_employees FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER ai_employees_updated_at BEFORE UPDATE ON public.ai_employees FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Subscriptions
CREATE TABLE public.user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.ai_employees(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active',
  plan text NOT NULL DEFAULT 'starter',
  price_monthly integer NOT NULL DEFAULT 0,
  subscription_date timestamptz NOT NULL DEFAULT now(),
  cancelled_at timestamptz,
  UNIQUE (user_id, employee_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_subscriptions TO authenticated;
GRANT ALL ON public.user_subscriptions TO service_role;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own subscriptions" ON public.user_subscriptions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins read all subscriptions" ON public.user_subscriptions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Business profile (onboarding)
CREATE TABLE public.business_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name text,
  website text,
  industry text,
  target_customer text,
  country text,
  goals text,
  brand_info text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_profiles TO authenticated;
GRANT ALL ON public.business_profiles TO service_role;
ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own business profile" ON public.business_profiles FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER business_profiles_updated_at BEFORE UPDATE ON public.business_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- AI tasks
CREATE TABLE public.ai_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.ai_employees(id) ON DELETE CASCADE,
  task_name text NOT NULL,
  input text,
  status text NOT NULL DEFAULT 'pending',
  result jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_tasks TO authenticated;
GRANT ALL ON public.ai_tasks TO service_role;
ALTER TABLE public.ai_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own tasks" ON public.ai_tasks FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins read all tasks" ON public.ai_tasks FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX ai_tasks_user_created_idx ON public.ai_tasks (user_id, created_at DESC);

-- Reports
CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES public.ai_employees(id) ON DELETE SET NULL,
  task_id uuid REFERENCES public.ai_tasks(id) ON DELETE SET NULL,
  type text NOT NULL,
  title text NOT NULL,
  summary text,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own reports" ON public.reports FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins read all reports" ON public.reports FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX reports_user_created_idx ON public.reports (user_id, created_at DESC);

-- Seed catalog
INSERT INTO public.ai_employees (slug, name, role_title, category, tagline, description, features, skills, persona, price_monthly, accent, workspace_input_label, workspace_input_placeholder, sort_order) VALUES
('ai-seo-employee', 'Sarah', 'AI SEO Manager', 'Marketing', 'Audits your site and finds the keywords worth winning.', 'Your AI SEO specialist that audits websites, finds keywords, analyzes competitors, and creates growth recommendations.', ARRAY['Website SEO audit','Keyword research','Competitor analysis','Content opportunities','Monthly reports'], ARRAY['technical_audit','keyword_research','competitor_analysis','content_planning'], 'You are Sarah, an expert SEO manager helping businesses grow through search. You are precise, data-driven and always tie findings to revenue impact.', 99, 'primary', 'Website URL', 'https://yourcompany.com', 1),
('ai-content-employee', 'Leo', 'AI Content Marketing Manager', 'Marketing', 'Plans, writes and schedules content that compounds.', 'Your AI content marketer that builds editorial calendars, writes briefs, and turns your positioning into publish-ready content.', ARRAY['Content strategy','Editorial calendar','Blog & landing page briefs','Social repurposing','Performance reporting'], ARRAY['content_strategy','copywriting','editorial_planning','repurposing'], 'You are Leo, a senior content marketing manager. You write with clarity and a strong point of view, never filler.', 89, 'accent', 'Topic or product to plan content for', 'AI onboarding software for HR teams', 2),
('ai-ads-employee', 'Mia', 'AI Performance Ads Manager', 'Marketing', 'Builds ad angles and budget plans that convert.', 'Your AI ads specialist that researches angles, drafts ad copy, structures campaigns and forecasts spend efficiency.', ARRAY['Campaign structure','Ad copy variations','Audience targeting','Budget allocation','Creative testing plan'], ARRAY['paid_media','copywriting','audience_research','budget_planning'], 'You are Mia, a performance marketing manager obsessed with CAC, hooks and creative testing velocity.', 129, 'primary', 'Product or offer to advertise', 'Project management SaaS, $29/mo', 3),
('ai-sales-employee', 'Noah', 'AI Sales Development Rep', 'Sales', 'Researches accounts and writes outbound that gets replies.', 'Your AI sales rep that qualifies accounts, writes personalized sequences and prepares your team for every call.', ARRAY['Account research','Cold email sequences','Objection handling','Call prep briefs','Pipeline summaries'], ARRAY['prospect_research','outbound_writing','qualification','call_prep'], 'You are Noah, a top-performing SDR. You are direct, specific and allergic to generic sales language.', 119, 'accent', 'Target company or ICP', 'Series A fintech companies in Germany', 4),
('ai-lead-gen-employee', 'Ava', 'AI Lead Generation Specialist', 'Sales', 'Builds your ideal customer list and the routes to reach them.', 'Your AI lead gen specialist that defines ICPs, maps buying signals and builds prioritized target lists with outreach angles.', ARRAY['ICP definition','Target list building','Buying signal mapping','Channel strategy','Weekly lead reports'], ARRAY['icp_modelling','list_building','signal_detection','channel_strategy'], 'You are Ava, a lead generation specialist who thinks in segments, signals and repeatable pipelines.', 109, 'primary', 'Describe your ideal customer', 'Ecommerce brands doing $1M-$10M/yr', 5),
('ai-support-employee', 'Kai', 'AI Customer Support Lead', 'Support', 'Answers customers and turns tickets into product insight.', 'Your AI support lead that drafts on-brand replies, builds help center articles and surfaces recurring issues from your tickets.', ARRAY['Instant reply drafting','Help center articles','Macro & tone library','Escalation rules','Ticket trend reports'], ARRAY['support_writing','knowledge_base','triage','trend_analysis'], 'You are Kai, a calm and empathetic customer support lead. You resolve issues clearly and never over-promise.', 79, 'accent', 'Customer question or support scenario', 'A customer wants a refund after 40 days', 6);