-- ============================================================================
-- Migration: 20260218100000_platform_admin_rls_bypass.sql
-- Description: Allow platform admins to bypass tenant RLS for "View As" feature
-- ============================================================================

-- Update matches_current_tenant() to also return true for platform admins.
-- This gives platform admins access to all company data across all tables
-- that use this function in their RLS policies (sites, profiles, assets, etc.)
create or replace function public.matches_current_tenant(target uuid)
returns boolean
language sql
stable
as $$
  select
    target is not distinct from public.current_tenant()
    or exists (
      select 1 from public.profiles
      where id = auth.uid()
        and is_platform_admin = true
    );
$$;
