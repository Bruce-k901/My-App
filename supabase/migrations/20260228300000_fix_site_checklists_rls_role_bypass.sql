-- ============================================================================
-- Migration: 20260228300000_fix_site_checklists_rls_role_bypass.sql
-- Description: Restore Owner/Admin/Manager company-level bypass in site_checklists
--              RLS. The previous migration (20260228100000) removed the role check
--              and relied on matches_current_tenant() which requires JWT claims
--              that regular users don't have. This adds back company-scoped role
--              access alongside the platform admin and site-level access.
-- ============================================================================

-- Drop the policies created by the previous migration
drop policy if exists "Users view site_checklists for their company" on site_checklists;
drop policy if exists "Users insert site_checklists for their company" on site_checklists;
drop policy if exists "Users update site_checklists for their company" on site_checklists;
drop policy if exists "Users delete site_checklists for their company" on site_checklists;

-- SELECT: service role OR platform admin OR company role bypass OR site match
create policy "Users view site_checklists for their company"
  on site_checklists for select
  using (
    public.is_service_role()
    or public.matches_current_tenant(company_id)
    or exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.company_id = site_checklists.company_id
      and profiles.app_role in ('Owner', 'Admin', 'Manager', 'General Manager')
    )
    or exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and (
        profiles.site_id = site_checklists.site_id
        or profiles.home_site = site_checklists.site_id
      )
    )
  );

-- INSERT: service role OR platform admin OR company role bypass OR own site
create policy "Users insert site_checklists for their company"
  on site_checklists for insert
  with check (
    public.is_service_role()
    or public.matches_current_tenant(company_id)
    or exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.company_id = site_checklists.company_id
      and profiles.app_role in ('Owner', 'Admin', 'Manager', 'General Manager')
    )
    or exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.site_id = site_checklists.site_id
    )
  );

-- UPDATE: service role OR platform admin OR company role bypass OR site match
create policy "Users update site_checklists for their company"
  on site_checklists for update
  using (
    public.is_service_role()
    or public.matches_current_tenant(company_id)
    or exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.company_id = site_checklists.company_id
      and profiles.app_role in ('Owner', 'Admin', 'Manager', 'General Manager')
    )
    or exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and (
        profiles.site_id = site_checklists.site_id
        or profiles.home_site = site_checklists.site_id
      )
    )
  );

-- DELETE: service role OR platform admin OR company role bypass OR site match
create policy "Users delete site_checklists for their company"
  on site_checklists for delete
  using (
    public.is_service_role()
    or public.matches_current_tenant(company_id)
    or exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.company_id = site_checklists.company_id
      and profiles.app_role in ('Owner', 'Admin', 'Manager', 'General Manager')
    )
    or exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and (
        profiles.site_id = site_checklists.site_id
        or profiles.home_site = site_checklists.site_id
      )
    )
  );
