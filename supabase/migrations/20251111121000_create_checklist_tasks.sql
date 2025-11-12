-- ============================================================================
-- Migration: 20251111121000_create_checklist_tasks.sql
-- Description: Creates checklist_tasks table used by dashboard and task flows
-- ============================================================================

create table if not exists public.checklist_tasks (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references public.task_templates(id) on delete set null,
  company_id uuid not null references public.companies(id) on delete cascade,
  site_id uuid references public.sites(id) on delete set null,
  custom_name text,
  custom_instructions text,
  due_date date not null,
  due_time text,
  daypart text,
  priority text default 'medium',
  status text default 'pending',
  flagged boolean default false,
  flag_reason text,
  escalated boolean default false,
  escalated_to text,
  escalation_reason text,
  assigned_to_role text,
  assigned_to_user_id uuid references public.profiles(id) on delete set null,
  task_data jsonb,
  generated_at timestamptz default now(),
  expires_at timestamptz,
  completed_at timestamptz,
  completed_by uuid references public.profiles(id) on delete set null,
  completion_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists checklist_tasks_company_status_idx
  on public.checklist_tasks (company_id, status);

create index if not exists checklist_tasks_site_idx
  on public.checklist_tasks (site_id, due_date);

alter table public.checklist_tasks enable row level security;

drop policy if exists tenant_select_checklist_tasks on public.checklist_tasks;
create policy tenant_select_checklist_tasks
  on public.checklist_tasks
  for select
  using (
    public.is_service_role()
    or matches_current_tenant(company_id)
  );

drop policy if exists tenant_modify_checklist_tasks on public.checklist_tasks;
create policy tenant_modify_checklist_tasks
  on public.checklist_tasks
  for all
  using (
    public.is_service_role()
    or matches_current_tenant(company_id)
  )
  with check (
    public.is_service_role()
    or matches_current_tenant(company_id)
  );


