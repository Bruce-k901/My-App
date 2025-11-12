-- ============================================================================
-- Migration: 20251111132000_create_temperature_logs.sql
-- Description: Ensures temperature_logs table exists for breach tracking
-- ============================================================================

create table if not exists public.temperature_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  site_id uuid references public.sites(id) on delete set null,
  asset_id uuid references public.assets(id) on delete set null,
  reading numeric not null,
  unit text default 'celsius',
  recorded_at timestamptz not null default now(),
  recorded_by uuid references public.profiles(id) on delete set null,
  status text default 'ok',
  source text,
  meta jsonb,
  created_at timestamptz not null default now()
);

create index if not exists temperature_logs_company_idx
  on public.temperature_logs (company_id, recorded_at desc);

create index if not exists temperature_logs_site_idx
  on public.temperature_logs (site_id, recorded_at desc);

alter table public.temperature_logs enable row level security;

drop policy if exists tenant_select_temperature_logs on public.temperature_logs;
create policy tenant_select_temperature_logs
  on public.temperature_logs
  for select
  using (
    public.is_service_role()
    or matches_current_tenant(company_id)
  );

drop policy if exists tenant_modify_temperature_logs on public.temperature_logs;
create policy tenant_modify_temperature_logs
  on public.temperature_logs
  for all
  using (
    public.is_service_role()
    or matches_current_tenant(company_id)
  )
  with check (
    public.is_service_role()
    or matches_current_tenant(company_id)
  );
