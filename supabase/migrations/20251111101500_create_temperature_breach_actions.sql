-- ============================================================================
-- Migration: 20251111101500_create_temperature_breach_actions.sql
-- Description: Creates temperature breach actions table for monitor/callout workflow
-- ============================================================================

create table if not exists public.temperature_breach_actions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  site_id uuid not null references public.sites(id) on delete cascade,
  temperature_log_id uuid not null references public.temperature_logs(id) on delete cascade,
  action_type text not null check (action_type in ('monitor', 'callout')),
  status text not null default 'pending' check (status in ('pending', 'acknowledged', 'completed', 'cancelled')),
  due_at timestamptz,
  completed_at timestamptz,
  assigned_to uuid references public.profiles(id) on delete set null,
  notes text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (temperature_log_id, action_type)
);

create index if not exists idx_temperature_breach_actions_company_status
  on public.temperature_breach_actions (company_id, status, created_at desc);

create index if not exists idx_temperature_breach_actions_site
  on public.temperature_breach_actions (site_id, created_at desc);

create index if not exists idx_temperature_breach_actions_due
  on public.temperature_breach_actions (status, due_at);

alter table public.temperature_breach_actions enable row level security;

drop policy if exists tenant_select_temperature_breach_actions on public.temperature_breach_actions;
create policy tenant_select_temperature_breach_actions
  on public.temperature_breach_actions
  for select
  using (
    company_id = public.current_tenant()
    or public.is_service_role()
  );

drop policy if exists tenant_modify_temperature_breach_actions on public.temperature_breach_actions;
create policy tenant_modify_temperature_breach_actions
  on public.temperature_breach_actions
  for all
  using (
    company_id = public.current_tenant()
    or public.is_service_role()
  )
  with check (
    company_id = public.current_tenant()
    or public.is_service_role()
  );


