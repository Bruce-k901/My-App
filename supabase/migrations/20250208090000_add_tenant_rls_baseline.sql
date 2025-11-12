-- ============================================================================
-- Migration: 20250208090000_add_tenant_rls_baseline.sql
-- Description: Establish tenant helper functions and baseline RLS policies
-- ============================================================================

set check_function_bodies = off;

-- ----------------------------------------------------------------------------
-- Helper Functions
-- ----------------------------------------------------------------------------

drop function if exists public.current_tenant();

create or replace function public.current_tenant()
returns uuid
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.tenant_id', true), ''),
    nullif(current_setting('request.jwt.claim.company_id', true), '')
  )::uuid;
$$;

create or replace function public.is_service_role()
returns boolean
language sql
stable
as $$
  select auth.role() = 'service_role';
$$;

-- Allow null-safe comparison against tenant scope.
create or replace function public.matches_current_tenant(target uuid)
returns boolean
language sql
stable
as $$
  select
    target is not distinct from public.current_tenant();
$$;

-- ----------------------------------------------------------------------------
-- Tenant-Scoped Table Policies
-- ----------------------------------------------------------------------------

-- Companies -----------------------------------------------------------------
alter table public.companies enable row level security;

drop policy if exists tenant_select_companies on public.companies;
create policy tenant_select_companies
  on public.companies
  for select
  using (
    public.is_service_role()
    or matches_current_tenant(id)
  );

drop policy if exists tenant_modify_companies on public.companies;
create policy tenant_modify_companies
  on public.companies
  for all
  using (
    public.is_service_role()
    or matches_current_tenant(id)
  )
  with check (
    public.is_service_role()
    or matches_current_tenant(id)
  );

-- Profiles ------------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists tenant_select_profiles on public.profiles;
create policy tenant_select_profiles
  on public.profiles
  for select
  using (
    public.is_service_role()
    or matches_current_tenant(company_id)
    or id = auth.uid()
  );

drop policy if exists tenant_modify_profiles on public.profiles;
create policy tenant_modify_profiles
  on public.profiles
  for all
  using (
    public.is_service_role()
    or matches_current_tenant(company_id)
    or id = auth.uid()
  )
  with check (
    public.is_service_role()
    or matches_current_tenant(company_id)
    or id = auth.uid()
  );

-- Sites ---------------------------------------------------------------------
alter table public.sites enable row level security;

drop policy if exists tenant_select_sites on public.sites;
create policy tenant_select_sites
  on public.sites
  for select
  using (
    public.is_service_role()
    or matches_current_tenant(company_id)
  );

drop policy if exists tenant_modify_sites on public.sites;
create policy tenant_modify_sites
  on public.sites
  for all
  using (
    public.is_service_role()
    or matches_current_tenant(company_id)
  )
  with check (
    public.is_service_role()
    or matches_current_tenant(company_id)
  );

-- Site Memberships ----------------------------------------------------------
alter table public.site_memberships enable row level security;

drop policy if exists tenant_select_site_memberships on public.site_memberships;
create policy tenant_select_site_memberships
  on public.site_memberships
  for select
  using (
    public.is_service_role()
    or exists (
      select 1
      from public.sites s
      where s.id = site_memberships.site_id
        and matches_current_tenant(s.company_id)
    )
  );

drop policy if exists tenant_modify_site_memberships on public.site_memberships;
create policy tenant_modify_site_memberships
  on public.site_memberships
  for all
  using (
    public.is_service_role()
    or exists (
      select 1
      from public.sites s
      where s.id = site_memberships.site_id
        and matches_current_tenant(s.company_id)
    )
  )
  with check (
    public.is_service_role()
    or exists (
      select 1
      from public.sites s
      where s.id = site_memberships.site_id
        and matches_current_tenant(s.company_id)
    )
  );

-- Site Members --------------------------------------------------------------
alter table public.site_members enable row level security;

drop policy if exists tenant_select_site_members on public.site_members;
create policy tenant_select_site_members
  on public.site_members
  for select
  using (
    public.is_service_role()
    or exists (
      select 1
      from public.sites s
      where s.id = site_members.site_id
        and matches_current_tenant(s.company_id)
    )
  );

drop policy if exists tenant_modify_site_members on public.site_members;
create policy tenant_modify_site_members
  on public.site_members
  for all
  using (
    public.is_service_role()
    or exists (
      select 1
      from public.sites s
      where s.id = site_members.site_id
        and matches_current_tenant(s.company_id)
    )
  )
  with check (
    public.is_service_role()
    or exists (
      select 1
      from public.sites s
      where s.id = site_members.site_id
        and matches_current_tenant(s.company_id)
    )
  );

-- Site Profiles -------------------------------------------------------------
alter table public.site_profiles enable row level security;

drop policy if exists tenant_select_site_profiles on public.site_profiles;
create policy tenant_select_site_profiles
  on public.site_profiles
  for select
  using (
    public.is_service_role()
    or matches_current_tenant(company_id)
  );

drop policy if exists tenant_modify_site_profiles on public.site_profiles;
create policy tenant_modify_site_profiles
  on public.site_profiles
  for all
  using (
    public.is_service_role()
    or matches_current_tenant(company_id)
  )
  with check (
    public.is_service_role()
    or matches_current_tenant(company_id)
  );

-- Task Templates ------------------------------------------------------------
alter table public.task_templates enable row level security;

drop policy if exists tenant_select_task_templates on public.task_templates;
create policy tenant_select_task_templates
  on public.task_templates
  for select
  using (
    public.is_service_role()
    or matches_current_tenant(company_id)
    or company_id is null
  );

drop policy if exists tenant_modify_task_templates on public.task_templates;
create policy tenant_modify_task_templates
  on public.task_templates
  for all
  using (
    public.is_service_role()
    or matches_current_tenant(company_id)
  )
  with check (
    public.is_service_role()
    or matches_current_tenant(company_id)
  );

-- Tasks ---------------------------------------------------------------------
alter table public.tasks enable row level security;

drop policy if exists tenant_select_tasks on public.tasks;
create policy tenant_select_tasks
  on public.tasks
  for select
  using (
    public.is_service_role()
    or matches_current_tenant(company_id)
  );

drop policy if exists tenant_modify_tasks on public.tasks;
create policy tenant_modify_tasks
  on public.tasks
  for all
  using (
    public.is_service_role()
    or matches_current_tenant(company_id)
  )
  with check (
    public.is_service_role()
    or matches_current_tenant(company_id)
  );

-- Temperature Logs ----------------------------------------------------------
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

-- Incidents -----------------------------------------------------------------
alter table public.incidents enable row level security;

drop policy if exists tenant_select_incidents on public.incidents;
create policy tenant_select_incidents
  on public.incidents
  for select
  using (
    public.is_service_role()
    or exists (
      select 1
      from public.sites s
      where s.id = incidents.site_id
        and matches_current_tenant(s.company_id)
    )
  );

drop policy if exists tenant_modify_incidents on public.incidents;
create policy tenant_modify_incidents
  on public.incidents
  for all
  using (
    public.is_service_role()
    or exists (
      select 1
      from public.sites s
      where s.id = incidents.site_id
        and matches_current_tenant(s.company_id)
    )
  )
  with check (
    public.is_service_role()
    or exists (
      select 1
      from public.sites s
      where s.id = incidents.site_id
        and matches_current_tenant(s.company_id)
    )
  );

-- Global Documents ----------------------------------------------------------
alter table public.global_documents enable row level security;

drop policy if exists tenant_select_global_documents on public.global_documents;
create policy tenant_select_global_documents
  on public.global_documents
  for select
  using (
    public.is_service_role()
    or matches_current_tenant(company_id)
    or company_id is null
  );

drop policy if exists tenant_modify_global_documents on public.global_documents;
create policy tenant_modify_global_documents
  on public.global_documents
  for all
  using (
    public.is_service_role()
    or matches_current_tenant(company_id)
  )
  with check (
    public.is_service_role()
    or matches_current_tenant(company_id)
  );

-- Training Records ----------------------------------------------------------
alter table public.training_records enable row level security;

drop policy if exists tenant_select_training_records on public.training_records;
create policy tenant_select_training_records
  on public.training_records
  for select
  using (
    public.is_service_role()
    or exists (
      select 1
      from public.profiles p
      where p.id = training_records.user_id
        and (
          matches_current_tenant(p.company_id)
          or p.id = auth.uid()
        )
    )
  );

drop policy if exists tenant_modify_training_records on public.training_records;
create policy tenant_modify_training_records
  on public.training_records
  for all
  using (
    public.is_service_role()
    or exists (
      select 1
      from public.profiles p
      where p.id = training_records.user_id
        and matches_current_tenant(p.company_id)
    )
  )
  with check (
    public.is_service_role()
    or exists (
      select 1
      from public.profiles p
      where p.id = training_records.user_id
        and matches_current_tenant(p.company_id)
    )
  );

-- Licences ------------------------------------------------------------------
alter table public.licences enable row level security;

drop policy if exists tenant_select_licences on public.licences;
create policy tenant_select_licences
  on public.licences
  for select
  using (
    public.is_service_role()
    or exists (
      select 1
      from public.sites s
      where s.id = licences.site_id
        and matches_current_tenant(s.company_id)
    )
  );

drop policy if exists tenant_modify_licences on public.licences;
create policy tenant_modify_licences
  on public.licences
  for all
  using (
    public.is_service_role()
    or exists (
      select 1
      from public.sites s
      where s.id = licences.site_id
        and matches_current_tenant(s.company_id)
    )
  )
  with check (
    public.is_service_role()
    or exists (
      select 1
      from public.sites s
      where s.id = licences.site_id
        and matches_current_tenant(s.company_id)
    )
  );

-- Temperature Breach Actions (if present) -----------------------------------
alter table if exists public.temperature_breach_actions enable row level security;

drop policy if exists tenant_select_temperature_breach_actions on public.temperature_breach_actions;
create policy tenant_select_temperature_breach_actions
  on public.temperature_breach_actions
  for select
  using (
    public.is_service_role()
    or matches_current_tenant(company_id)
  );

drop policy if exists tenant_modify_temperature_breach_actions on public.temperature_breach_actions;
create policy tenant_modify_temperature_breach_actions
  on public.temperature_breach_actions
  for all
  using (
    public.is_service_role()
    or matches_current_tenant(company_id)
  )
  with check (
    public.is_service_role()
    or matches_current_tenant(company_id)
  );

-- ----------------------------------------------------------------------------
-- End of migration
-- ----------------------------------------------------------------------------

