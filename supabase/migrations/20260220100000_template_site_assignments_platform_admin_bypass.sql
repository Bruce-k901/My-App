-- ============================================================================
-- Migration: 20260220100000_template_site_assignments_platform_admin_bypass.sql
-- Description: Update template_site_assignments RLS to use matches_current_tenant()
--              so platform admins can manage templates for any company (View As mode)
-- ============================================================================

-- Drop existing policies that use direct company_id comparison
drop policy if exists "Users can view template assignments for their company" on template_site_assignments;
drop policy if exists "Users can create template assignments for their company" on template_site_assignments;
drop policy if exists "Users can update template assignments for their company" on template_site_assignments;
drop policy if exists "Users can delete template assignments for their company" on template_site_assignments;

-- Recreate with matches_current_tenant() which includes platform admin bypass
create policy "Users can view template assignments for their company"
  on template_site_assignments for select
  using (
    public.is_service_role()
    or matches_current_tenant(company_id)
  );

create policy "Users can create template assignments for their company"
  on template_site_assignments for insert
  with check (
    public.is_service_role()
    or matches_current_tenant(company_id)
  );

create policy "Users can update template assignments for their company"
  on template_site_assignments for update
  using (
    public.is_service_role()
    or matches_current_tenant(company_id)
  );

create policy "Users can delete template assignments for their company"
  on template_site_assignments for delete
  using (
    public.is_service_role()
    or matches_current_tenant(company_id)
  );
