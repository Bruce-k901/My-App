-- ============================================================================
-- Migration: 20260228100000_site_checklists_platform_admin_bypass.sql
-- Description: Update site_checklists RLS to use matches_current_tenant()
--              so platform admins can manage checklists for any company (View As mode).
--              Previous policies used direct profiles.company_id comparison which
--              blocks platform admins whose profile belongs to a different company.
-- ============================================================================

-- Drop existing policies
drop policy if exists "Users view site_checklists for their site or all if Owner/Admin" on site_checklists;
drop policy if exists "Users insert site_checklists for their site or all if Owner/Admin" on site_checklists;
drop policy if exists "Users update site_checklists for their site" on site_checklists;
drop policy if exists "Users delete site_checklists for their site" on site_checklists;

-- SELECT: platform admin bypass OR company match (Owner/Admin see all, staff see own site)
create policy "Users view site_checklists for their company"
  on site_checklists for select
  using (
    public.is_service_role()
    or public.matches_current_tenant(company_id)
    or exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and (
        profiles.site_id = site_checklists.site_id
        or profiles.home_site = site_checklists.site_id
      )
    )
  );

-- INSERT: platform admin bypass OR company Owner/Admin OR own site
create policy "Users insert site_checklists for their company"
  on site_checklists for insert
  with check (
    public.is_service_role()
    or public.matches_current_tenant(company_id)
    or exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.site_id = site_checklists.site_id
    )
  );

-- UPDATE: platform admin bypass OR company match OR own site
create policy "Users update site_checklists for their company"
  on site_checklists for update
  using (
    public.is_service_role()
    or public.matches_current_tenant(company_id)
    or exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and (
        profiles.site_id = site_checklists.site_id
        or profiles.home_site = site_checklists.site_id
      )
    )
  );

-- DELETE: platform admin bypass OR company match OR own site
create policy "Users delete site_checklists for their company"
  on site_checklists for delete
  using (
    public.is_service_role()
    or public.matches_current_tenant(company_id)
    or exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and (
        profiles.site_id = site_checklists.site_id
        or profiles.home_site = site_checklists.site_id
      )
    )
  );
