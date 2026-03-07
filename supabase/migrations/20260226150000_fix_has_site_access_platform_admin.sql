-- ============================================================================
-- Migration: 20260226150000_fix_has_site_access_platform_admin.sql
-- Description: Fix has_site_access() to allow platform admins full site access.
--              Previously, matches_current_tenant() had a platform admin bypass
--              but has_site_access() did not, causing RLS violations (42501)
--              when platform admins tried to create or update sites.
--              Also adds 'super admin' to the recognised admin roles.
-- ============================================================================

create or replace function public.has_site_access(target_site uuid)
returns boolean
language sql
stable
as $$
  select
    target_site is null
    or public.is_service_role()
    -- Platform admin bypass: allow full access to all sites
    or exists (
      select 1 from public.profiles
      where (id = auth.uid() or auth_user_id = auth.uid())
        and is_platform_admin = true
    )
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
          or lower(coalesce(p.app_role::text, '')) in ('owner', 'admin', 'super admin', 'area_manager', 'general_manager')
        )
    );
$$;
