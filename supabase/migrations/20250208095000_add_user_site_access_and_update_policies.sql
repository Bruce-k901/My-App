-- ============================================================================
-- Migration: 20250208095000_add_user_site_access_and_update_policies.sql
-- Description: Introduce user/site junction and tighten site-scoped RLS
-- ============================================================================

set check_function_bodies = off;

-------------------------------------------------------------------------------
-- User/site access junction
-------------------------------------------------------------------------------

create table if not exists public.user_site_access (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  site_id uuid not null references public.sites (id) on delete cascade,
  auth_user_id uuid not null references auth.users (id) on delete cascade,
  profile_id uuid references public.profiles (id),
  role text default 'member',
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  unique (auth_user_id, site_id)
);

comment on table public.user_site_access is 'Junction table granting users access to specific sites within a tenant.';
comment on column public.user_site_access.role is 'Optional role/label for the membership (e.g. member, manager).';

create index if not exists user_site_access_auth_user_idx
  on public.user_site_access (auth_user_id);

create index if not exists user_site_access_site_idx
  on public.user_site_access (site_id);

-------------------------------------------------------------------------------
-- Backfill from existing sources (site memberships, profiles)
-------------------------------------------------------------------------------

insert into public.user_site_access (
  company_id,
  site_id,
  auth_user_id,
  profile_id,
  role
)
select distinct
  s.company_id,
  sm.site_id,
  sm.auth_user_id,
  coalesce(p.id, p2.id) as profile_id,
  'member'
from public.site_memberships sm
join public.sites s on s.id = sm.site_id
left join public.profiles p on p.auth_user_id = sm.auth_user_id
left join public.profiles p2 on p2.id = sm.auth_user_id
join auth.users au on au.id = sm.auth_user_id
where sm.auth_user_id is not null
on conflict (auth_user_id, site_id) do nothing;

insert into public.user_site_access (
  company_id,
  site_id,
  auth_user_id,
  profile_id,
  role
)
select distinct
  s.company_id,
  sm.site_id,
  coalesce(p.auth_user_id, p.id) as auth_user_id,
  p.id,
  'member'
from public.site_members sm
join public.sites s on s.id = sm.site_id
join public.profiles p on p.id = sm.user_id
join auth.users au on au.id = coalesce(p.auth_user_id, p.id)
where coalesce(p.auth_user_id, p.id) is not null
on conflict (auth_user_id, site_id) do nothing;

insert into public.user_site_access (
  company_id,
  site_id,
  auth_user_id,
  profile_id,
  role
)
select distinct
  s.company_id,
  s.id as site_id,
  coalesce(p.auth_user_id, p.id) as auth_user_id,
  p.id,
  case
    when lower(coalesce(p.app_role::text, '')) in ('owner', 'admin', 'area_manager', 'general_manager')
      then 'manager'
    else 'member'
  end as role
from public.profiles p
join public.sites s on s.id = coalesce(p.site_id, p.home_site)
join auth.users au on au.id = coalesce(p.auth_user_id, p.id)
where coalesce(p.site_id, p.home_site) is not null
  and coalesce(p.auth_user_id, p.id) is not null
on conflict (auth_user_id, site_id) do nothing;

insert into public.user_site_access (
  company_id,
  site_id,
  auth_user_id,
  profile_id,
  role
)
select distinct
  s.company_id,
  s.id as site_id,
  coalesce(p.auth_user_id, p.id) as auth_user_id,
  p.id,
  'manager'
from public.profiles p
join public.sites s on s.company_id = p.company_id
join auth.users au on au.id = coalesce(p.auth_user_id, p.id)
where p.company_id is not null
  and coalesce(p.auth_user_id, p.id) is not null
  and lower(coalesce(p.app_role::text, '')) in ('owner', 'admin', 'area_manager')
on conflict (auth_user_id, site_id) do nothing;

-------------------------------------------------------------------------------
-- Helper function for site access checks
-------------------------------------------------------------------------------

create or replace function public.has_site_access(target_site uuid)
returns boolean
language sql
stable
as $$
  select
    target_site is null
    or public.is_service_role()
    or exists (
      select 1
      from public.user_site_access usa
      join public.sites s on s.id = usa.site_id
      where usa.auth_user_id = auth.uid()
        and usa.site_id = target_site
        and matches_current_tenant(s.company_id)
    )
    or exists (
      select 1
      from public.profiles p
      join public.sites s on s.id = target_site
      where matches_current_tenant(s.company_id)
        and matches_current_tenant(p.company_id)
        and (
          p.id = auth.uid()
          or p.auth_user_id = auth.uid()
        )
        and (
          p.site_id = target_site
          or p.home_site = target_site
        or lower(coalesce(p.app_role::text, '')) in ('owner', 'admin', 'area_manager', 'general_manager')
        )
    );
$$;

comment on function public.has_site_access(uuid)
  is 'Returns true when the current user has access to the supplied site within their tenant.';

-------------------------------------------------------------------------------
-- RLS for user_site_access
-------------------------------------------------------------------------------

alter table public.user_site_access enable row level security;

drop policy if exists tenant_select_user_site_access on public.user_site_access;
create policy tenant_select_user_site_access
  on public.user_site_access
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
            and lower(coalesce(p.app_role::text, '')) in ('owner', 'admin', 'area_manager', 'general_manager')
        )
      )
    )
  );

drop policy if exists tenant_modify_user_site_access on public.user_site_access;
create policy tenant_modify_user_site_access
  on public.user_site_access
  for all
  using (
    public.is_service_role()
  )
  with check (
    public.is_service_role()
  );

-------------------------------------------------------------------------------
-- Refresh policies to use has_site_access helper
-------------------------------------------------------------------------------

-- Sites ----------------------------------------------------------------------
drop policy if exists tenant_select_sites on public.sites;
create policy tenant_select_sites
  on public.sites
  for select
  using (
    public.is_service_role()
    or (
      matches_current_tenant(company_id)
      and public.has_site_access(id)
    )
  );

drop policy if exists tenant_modify_sites on public.sites;
create policy tenant_modify_sites
  on public.sites
  for all
  using (
    public.is_service_role()
    or (
      matches_current_tenant(company_id)
      and public.has_site_access(id)
    )
  )
  with check (
    public.is_service_role()
    or (
      matches_current_tenant(company_id)
      and public.has_site_access(id)
    )
  );

-- Site profiles --------------------------------------------------------------
drop policy if exists tenant_select_site_profiles on public.site_profiles;
create policy tenant_select_site_profiles
  on public.site_profiles
  for select
  using (
    public.is_service_role()
    or (
      matches_current_tenant(company_id)
      and public.has_site_access(site_id)
    )
  );

drop policy if exists tenant_modify_site_profiles on public.site_profiles;
create policy tenant_modify_site_profiles
  on public.site_profiles
  for all
  using (
    public.is_service_role()
    or (
      matches_current_tenant(company_id)
      and public.has_site_access(site_id)
    )
  )
  with check (
    public.is_service_role()
    or (
      matches_current_tenant(company_id)
      and public.has_site_access(site_id)
    )
  );

-- Site memberships (auth_user junction) --------------------------------------
drop policy if exists tenant_select_site_memberships on public.site_memberships;
create policy tenant_select_site_memberships
  on public.site_memberships
  for select
  using (
    public.is_service_role()
    or public.has_site_access(site_memberships.site_id)
  );

drop policy if exists tenant_modify_site_memberships on public.site_memberships;
create policy tenant_modify_site_memberships
  on public.site_memberships
  for all
  using (
    public.is_service_role()
    or public.has_site_access(site_memberships.site_id)
  )
  with check (
    public.is_service_role()
    or public.has_site_access(site_memberships.site_id)
  );

-- Site members (profile junction) -------------------------------------------
drop policy if exists tenant_select_site_members on public.site_members;
create policy tenant_select_site_members
  on public.site_members
  for select
  using (
    public.is_service_role()
    or public.has_site_access(site_members.site_id)
  );

drop policy if exists tenant_modify_site_members on public.site_members;
create policy tenant_modify_site_members
  on public.site_members
  for all
  using (
    public.is_service_role()
    or public.has_site_access(site_members.site_id)
  )
  with check (
    public.is_service_role()
    or public.has_site_access(site_members.site_id)
  );

-- Tasks ----------------------------------------------------------------------
drop policy if exists tenant_select_tasks on public.tasks;
create policy tenant_select_tasks
  on public.tasks
  for select
  using (
    public.is_service_role()
    or (
      matches_current_tenant(company_id)
      and (
        site_id is null
        or public.has_site_access(site_id)
      )
    )
  );

drop policy if exists tenant_modify_tasks on public.tasks;
create policy tenant_modify_tasks
  on public.tasks
  for all
  using (
    public.is_service_role()
    or (
      matches_current_tenant(company_id)
      and (
        site_id is null
        or public.has_site_access(site_id)
      )
    )
  )
  with check (
    public.is_service_role()
    or (
      matches_current_tenant(company_id)
      and (
        site_id is null
        or public.has_site_access(site_id)
      )
    )
  );

-- Temperature logs -----------------------------------------------------------
drop policy if exists tenant_select_temperature_logs on public.temperature_logs;
create policy tenant_select_temperature_logs
  on public.temperature_logs
  for select
  using (
    public.is_service_role()
    or (
      matches_current_tenant(company_id)
      and public.has_site_access(site_id)
    )
  );

drop policy if exists tenant_modify_temperature_logs on public.temperature_logs;
create policy tenant_modify_temperature_logs
  on public.temperature_logs
  for all
  using (
    public.is_service_role()
    or (
      matches_current_tenant(company_id)
      and public.has_site_access(site_id)
    )
  )
  with check (
    public.is_service_role()
    or (
      matches_current_tenant(company_id)
      and public.has_site_access(site_id)
    )
  );

-- Incidents ------------------------------------------------------------------
drop policy if exists tenant_select_incidents on public.incidents;
create policy tenant_select_incidents
  on public.incidents
  for select
  using (
    public.is_service_role()
    or public.has_site_access(incidents.site_id)
  );

drop policy if exists tenant_modify_incidents on public.incidents;
create policy tenant_modify_incidents
  on public.incidents
  for all
  using (
    public.is_service_role()
    or public.has_site_access(incidents.site_id)
  )
  with check (
    public.is_service_role()
    or public.has_site_access(incidents.site_id)
  );

-- Licences -------------------------------------------------------------------
drop policy if exists tenant_select_licences on public.licences;
create policy tenant_select_licences
  on public.licences
  for select
  using (
    public.is_service_role()
    or public.has_site_access(licences.site_id)
  );

drop policy if exists tenant_modify_licences on public.licences;
create policy tenant_modify_licences
  on public.licences
  for all
  using (
    public.is_service_role()
    or public.has_site_access(licences.site_id)
  )
  with check (
    public.is_service_role()
    or public.has_site_access(licences.site_id)
  );

-- Temperature breach actions -------------------------------------------------
do $policy$
declare
  breach_table regclass := to_regclass('public.temperature_breach_actions');
begin
  if breach_table is not null then
    execute 'alter table public.temperature_breach_actions enable row level security';

    execute 'drop policy if exists tenant_select_temperature_breach_actions on public.temperature_breach_actions';
    execute '
      create policy tenant_select_temperature_breach_actions
        on public.temperature_breach_actions
        for select
        using (
          public.is_service_role()
          or (
            matches_current_tenant(company_id)
            and public.has_site_access(site_id)
          )
        )';

    execute 'drop policy if exists tenant_modify_temperature_breach_actions on public.temperature_breach_actions';
    execute '
      create policy tenant_modify_temperature_breach_actions
        on public.temperature_breach_actions
        for all
        using (
          public.is_service_role()
          or (
            matches_current_tenant(company_id)
            and public.has_site_access(site_id)
          )
        )
        with check (
          public.is_service_role()
          or (
            matches_current_tenant(company_id)
            and public.has_site_access(site_id)
          )
        )';
  end if;
end
$policy$;

-- End of migration -----------------------------------------------------------

