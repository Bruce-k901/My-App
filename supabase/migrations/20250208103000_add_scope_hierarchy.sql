-- ============================================================================
-- Migration: 20250208103000_add_scope_hierarchy.sql
-- Description: Region/area hierarchy and unified scope assignments
-- ============================================================================

set check_function_bodies = off;

-------------------------------------------------------------------------------
-- Hierarchy tables
-------------------------------------------------------------------------------

create table if not exists public.company_regions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null,
  code text,
  description text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id)
);

create index if not exists company_regions_company_idx
  on public.company_regions (company_id, lower(name));

create table if not exists public.company_areas (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  region_id uuid references public.company_regions (id) on delete set null,
  name text not null,
  code text,
  description text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id)
);

create index if not exists company_areas_company_idx
  on public.company_areas (company_id, lower(name));

alter table public.sites
  add column if not exists region_id uuid references public.company_regions (id) on delete set null,
  add column if not exists area_id uuid references public.company_areas (id) on delete set null;

-------------------------------------------------------------------------------
-- Unified scope assignments
-------------------------------------------------------------------------------

create table if not exists public.user_scope_assignments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  scope_type text not null check (scope_type in ('tenant', 'region', 'area', 'site')),
  scope_id uuid not null,
  auth_user_id uuid not null references auth.users (id) on delete cascade,
  profile_id uuid references public.profiles (id),
  role text default 'member',
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  unique (auth_user_id, scope_type, scope_id)
);

create index if not exists user_scope_assignments_company_idx
  on public.user_scope_assignments (company_id, scope_type, scope_id);

create index if not exists user_scope_assignments_user_idx
  on public.user_scope_assignments (auth_user_id);

-------------------------------------------------------------------------------
-- Backfill existing assignments
-------------------------------------------------------------------------------

insert into public.user_scope_assignments (
  company_id,
  scope_type,
  scope_id,
  auth_user_id,
  profile_id,
  role
)
select distinct
  usa.company_id,
  'site' as scope_type,
  usa.site_id as scope_id,
  usa.auth_user_id,
  usa.profile_id,
  coalesce(nullif(usa.role, ''), 'member') as role
from public.user_site_access usa
where usa.auth_user_id is not null
  and usa.site_id is not null
on conflict do nothing;

insert into public.user_scope_assignments (
  company_id,
  scope_type,
  scope_id,
  auth_user_id,
  profile_id,
  role
)
select distinct
  p.company_id,
  'tenant' as scope_type,
  p.company_id as scope_id,
  coalesce(p.auth_user_id, p.id) as auth_user_id,
  p.id as profile_id,
  lower(coalesce(p.app_role::text, 'member')) as role
from public.profiles p
where p.company_id is not null
  and coalesce(p.auth_user_id, p.id) is not null
  and lower(coalesce(p.app_role::text, '')) in (
    'owner',
    'admin',
    'area_manager',
    'general_manager',
    'ops_director',
    'operations_director',
    'regional_manager'
  )
on conflict do nothing;

-------------------------------------------------------------------------------
-- Helper function update
-------------------------------------------------------------------------------

create or replace function public.has_site_access(target_site uuid)
returns boolean
language sql
stable
as $$
  with site_ctx as (
    select
      s.id,
      s.company_id,
      s.region_id,
      s.area_id
    from public.sites s
    where s.id = target_site
      and matches_current_tenant(s.company_id)
  ),
  assignment_access as (
    select 1
    from site_ctx sc
    join public.user_scope_assignments usa
      on usa.company_id = sc.company_id
     and usa.auth_user_id = auth.uid()
     and (
       (usa.scope_type = 'tenant' and usa.scope_id = sc.company_id)
       or (usa.scope_type = 'region' and sc.region_id is not null and usa.scope_id = sc.region_id)
       or (usa.scope_type = 'area' and sc.area_id is not null and usa.scope_id = sc.area_id)
       or (usa.scope_type = 'site' and usa.scope_id = sc.id)
     )
    limit 1
  ),
  legacy_site as (
    select 1
    from public.user_site_access usa
    where usa.auth_user_id = auth.uid()
      and usa.site_id = target_site
    limit 1
  ),
  legacy_profile as (
    select 1
    from site_ctx sc
    join public.profiles p
      on matches_current_tenant(p.company_id)
     and (
       p.id = auth.uid()
       or p.auth_user_id = auth.uid()
     )
    where
      p.site_id = sc.id
      or p.home_site = sc.id
      or lower(coalesce(p.app_role::text, '')) in (
        'owner',
        'admin',
        'area_manager',
        'general_manager',
        'ops_director',
        'operations_director',
        'regional_manager'
      )
    limit 1
  )
  select
    target_site is null
    or public.is_service_role()
    or exists (select 1 from assignment_access)
    or exists (select 1 from legacy_site)
    or exists (select 1 from legacy_profile);
$$;

-------------------------------------------------------------------------------
-- RLS for user_scope_assignments (read-only to scoped managers)
-------------------------------------------------------------------------------

alter table public.user_scope_assignments enable row level security;

drop policy if exists tenant_select_user_scope_assignments on public.user_scope_assignments;
create policy tenant_select_user_scope_assignments
  on public.user_scope_assignments
  for select
  using (
    public.is_service_role()
    or (
      matches_current_tenant(company_id)
      and (
        auth.uid() = auth_user_id
        or exists (
          select 1
          from public.profiles p
          where matches_current_tenant(p.company_id)
            and (
              p.id = auth.uid()
              or p.auth_user_id = auth.uid()
            )
            and lower(coalesce(p.app_role::text, '')) in (
              'owner',
              'admin',
              'area_manager',
              'general_manager',
              'ops_director',
              'operations_director',
              'regional_manager'
            )
        )
      )
    )
  );

drop policy if exists tenant_modify_user_scope_assignments on public.user_scope_assignments;
create policy tenant_modify_user_scope_assignments
  on public.user_scope_assignments
  for all
  using (public.is_service_role())
  with check (public.is_service_role());

-- End of migration -----------------------------------------------------------

