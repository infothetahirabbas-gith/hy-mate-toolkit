-- P0.2: AI Employee Job Role & Designation System
-- Additive, non-destructive schema changes only. Does not touch existing
-- marketplace, hiring, task or billing tables beyond adding new columns.

-- 1. Structured job-role fields on the shared catalog (ai_employees).
--    These describe the ROLE/DESIGNATION that is the same for every
--    business that hires this seat (e.g. every "AI SEO Strategist").
alter table public.ai_employees
  add column if not exists designation text,
  add column if not exists seniority_level text not null default 'specialist',
  add column if not exists authority_level smallint not null default 2,
  add column if not exists reports_to_role_slug text,
  add column if not exists primary_mission text,
  add column if not exists own_responsibilities text[] not null default '{}',
  add column if not exists support_responsibilities text[] not null default '{}',
  add column if not exists escalate_responsibilities text[] not null default '{}',
  add column if not exists role_kpis jsonb not null default '[]'::jsonb,
  add column if not exists capability_slugs text[] not null default '{}';

update public.ai_employees set designation = role_title where designation is null;
alter table public.ai_employees alter column designation set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'ai_employees_seniority_level_check'
  ) then
    alter table public.ai_employees
      add constraint ai_employees_seniority_level_check
      check (seniority_level in ('assistant','specialist','senior_specialist','manager','ai_manager'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'ai_employees_authority_level_check'
  ) then
    alter table public.ai_employees
      add constraint ai_employees_authority_level_check
      check (authority_level between 1 and 5);
  end if;
end $$;

comment on column public.ai_employees.seniority_level is
  'Level 1 assistant, 2 specialist, 3 senior_specialist, 4 manager, 5 ai_manager';
comment on column public.ai_employees.authority_level is
  '1 Research/recommend only, 2 Execute approved tasks, 3 Operational decisions within limits, 4 Assign work to department, 5 Coordinate departments and goals';

-- 2. Centralized capability registry (shared reference data, foundation only).
--    Real execution of each capability is a later phase; this only defines
--    the architecture and which roles are allowed to hold a capability.
create table if not exists public.ai_capabilities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  department_slug text,
  required_tools text[] not null default '{}',
  required_permissions text[] not null default '{}',
  allowed_seniority_levels text[] not null default '{}',
  input_schema jsonb not null default '{}'::jsonb,
  output_schema jsonb not null default '{}'::jsonb,
  validation_rules jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ai_capabilities enable row level security;

drop policy if exists "Anyone can view capabilities" on public.ai_capabilities;
create policy "Anyone can view capabilities" on public.ai_capabilities
  for select using (true);

insert into public.ai_capabilities (slug, name, description, department_slug, allowed_seniority_levels)
values
  ('keyword_research','Keyword Research','Identify high-value search terms and clustering opportunities.','marketing','{specialist,senior_specialist,manager}'),
  ('competitor_analysis','Competitor Analysis','Analyze competitor positioning, pricing and content gaps.','marketing','{specialist,senior_specialist,manager,ai_manager}'),
  ('serp_analysis','SERP Analysis','Evaluate search result rankings and ranking factors.','marketing','{specialist,senior_specialist}'),
  ('seo_audit','SEO Audit','Full technical and content SEO health review.','marketing','{specialist,senior_specialist,manager}'),
  ('content_strategy','Content Strategy','Plan editorial calendars and content roadmaps.','marketing','{specialist,senior_specialist,manager}'),
  ('ticket_management','Ticket Management','Triage and resolve customer support tickets.','customer-support','{assistant,specialist}'),
  ('faq_answering','FAQ Answering','Answer common customer questions from the knowledge base.','customer-support','{assistant,specialist}'),
  ('customer_lookup','Customer Lookup','Retrieve customer account and order details.','customer-support','{assistant,specialist}'),
  ('lead_qualification','Lead Qualification','Score and qualify inbound leads.','sales','{specialist,senior_specialist}'),
  ('resume_analysis','Resume Analysis','Screen resumes against role requirements.','hr','{assistant,specialist}'),
  ('job_matching','Job Matching','Match candidates to open roles.','hr','{specialist,senior_specialist}')
on conflict (slug) do nothing;

-- 3. Reporting relationship for HIRED instances. Kept on user_subscriptions
--    (the per-workspace/per-user roster row), never on the shared catalog,
--    so Workspace A's manager links can never point at Workspace B's hires.
alter table public.user_subscriptions
  add column if not exists reporting_manager_subscription_id uuid
    references public.user_subscriptions(id) on delete set null;

-- 4. Safe, idempotent backfill for existing real catalog rows only.
--    No new/fake catalog rows are created here — only real, already-listed
--    employees are annotated based on their existing role_title.
update public.ai_employees set
  seniority_level = 'manager',
  authority_level = greatest(authority_level, 4),
  primary_mission = coalesce(primary_mission, 'Coordinate department strategy and oversee specialist output.')
where (role_title ilike '%manager%' or name ilike '%manager%');

update public.ai_employees set
  own_responsibilities = array['Keyword research','SEO strategy','SERP analysis'],
  support_responsibilities = array['Content strategy','Web development'],
  escalate_responsibilities = array['Major technical issues','Paid advertising budget changes'],
  capability_slugs = array['keyword_research','competitor_analysis','serp_analysis','seo_audit'],
  primary_mission = coalesce(primary_mission, 'Grow organic search visibility and traffic.')
where role_title ilike '%seo%';

update public.ai_employees set
  own_responsibilities = array['Ticket triage','Customer replies','Issue resolution'],
  escalate_responsibilities = array['Refunds above policy limit','Legal complaints'],
  capability_slugs = array['ticket_management','faq_answering','customer_lookup'],
  primary_mission = coalesce(primary_mission, 'Resolve customer issues quickly and maintain satisfaction.')
where role_title ilike '%support%' or role_title ilike '%customer success%';

update public.ai_employees set
  own_responsibilities = array['Lead qualification','Outbound prospecting','Pipeline updates'],
  escalate_responsibilities = array['Contract terms','Custom pricing'],
  capability_slugs = array['lead_qualification'],
  primary_mission = coalesce(primary_mission, 'Generate and qualify pipeline for the sales team.')
where role_title ilike '%sales%' or role_title ilike '%sdr%' or role_title ilike '%business development%';

update public.ai_employees set
  own_responsibilities = array['Ad campaign management','Budget pacing','Bid optimization'],
  escalate_responsibilities = array['Budget increases above threshold'],
  capability_slugs = array['competitor_analysis'],
  primary_mission = coalesce(primary_mission, 'Maximize paid acquisition performance within budget.')
where role_title ilike '%ppc%' or role_title ilike '%paid ad%' or role_title ilike '%paid media%';

update public.ai_employees set
  own_responsibilities = array['Editorial calendar','Content briefs','Content quality review'],
  support_responsibilities = array['SEO strategist','Social media specialist'],
  capability_slugs = array['content_strategy'],
  primary_mission = coalesce(primary_mission, 'Plan and produce content that supports business goals.')
where role_title ilike '%content%';
