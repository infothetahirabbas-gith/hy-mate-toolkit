-- P0.2 Phase 3: AI Manager real role / capability / authority dispatch.
-- Additive, non-destructive schema changes only. Does not touch existing
-- marketplace, hiring, billing or execution-engine tables beyond adding
-- new nullable/defaulted columns.

-- 1. Structured dispatch requirements + audit trail on goal steps.
alter table public.company_goal_steps
add column if not exists required_capability_slug text,
add column if not exists min_seniority_level text,
add column if not exists min_authority_level smallint,
add column if not exists complexity text not null default 'standard',
add column if not exists dispatch_reason text,
add column if not exists dispatch_alternatives jsonb not null default '[]'::jsonb,
add column if not exists blocked_reason text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'company_goal_steps_complexity_check'
  ) then
    alter table public.company_goal_steps
    add constraint company_goal_steps_complexity_check
    check (complexity in ('simple','standard','complex'));
  end if;
end $$;

comment on column public.company_goal_steps.required_capability_slug is
  'References ai_capabilities.slug. Set by the AI Manager planner and validated server-side before any employee is assigned.';
comment on column public.company_goal_steps.dispatch_reason is
  'Human-readable explanation of why this employee was assigned (or why none qualified), generated from real backend data only.';

-- 2. Trace real tasks back to the goal / step / capability that created
-- them, so execution can be audited end to end.
alter table public.ai_tasks
add column if not exists goal_id uuid references public.company_goals(id) on delete set null,
add column if not exists goal_step_id uuid references public.company_goal_steps(id) on delete set null,
add column if not exists required_capability_slug text;

create index if not exists ai_tasks_goal_step_idx on public.ai_tasks(goal_step_id);

-- 3. Declare which real tools each existing P0.2 capability actually
-- needs, so dispatch can check tool / permission / integration
-- availability before assigning work. Safe, idempotent — only touches
-- the 11 capabilities already seeded in the P0.2 migration.
update public.ai_capabilities set required_tools = array['search-console','seo-api'] where slug = 'keyword_research';
update public.ai_capabilities set required_tools = array['seo-api'] where slug = 'competitor_analysis';
update public.ai_capabilities set required_tools = array['search-console'] where slug = 'serp_analysis';
update public.ai_capabilities set required_tools = array['website-crawler','search-console'] where slug = 'seo_audit';
update public.ai_capabilities set required_tools = array['crm'] where slug = 'lead_qualification';
update public.ai_capabilities set required_tools = array['email'] where slug = 'ticket_management';
update public.ai_capabilities set required_tools = array['crm'] where slug = 'customer_lookup';
