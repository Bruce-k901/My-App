-- ============================================================================
-- Migration: 20260228200000_staff_attendance_platform_admin_bypass.sql
-- Description: Add matches_current_tenant() policies to staff_attendance
--              so platform admins can view attendance for any company (View As mode).
--              Existing policies (own records, manager/admin company access) remain
--              intact. These new policies add tenant-scoped + platform admin bypass.
-- ============================================================================

-- SELECT: tenant match (includes platform admin bypass)
drop policy if exists staff_attendance_tenant_select on public.staff_attendance;
create policy staff_attendance_tenant_select
  on public.staff_attendance for select
  using (
    public.is_service_role()
    or public.matches_current_tenant(company_id)
  );

-- INSERT: tenant match
drop policy if exists staff_attendance_tenant_insert on public.staff_attendance;
create policy staff_attendance_tenant_insert
  on public.staff_attendance for insert
  with check (
    public.is_service_role()
    or public.matches_current_tenant(company_id)
  );

-- UPDATE: tenant match
drop policy if exists staff_attendance_tenant_update on public.staff_attendance;
create policy staff_attendance_tenant_update
  on public.staff_attendance for update
  using (
    public.is_service_role()
    or public.matches_current_tenant(company_id)
  );

-- DELETE: tenant match
drop policy if exists staff_attendance_tenant_delete on public.staff_attendance;
create policy staff_attendance_tenant_delete
  on public.staff_attendance for delete
  using (
    public.is_service_role()
    or public.matches_current_tenant(company_id)
  );
