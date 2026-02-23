-- ============================================================================
-- Migration: 20260222100000_add_assets_rls_policy.sql
-- Description: Add missing RLS policy for the assets table.
--              RLS was enabled on this table but no SELECT/INSERT/UPDATE/DELETE
--              policies were created, causing all client-side queries to return
--              empty results.
--              Uses profile-based fallback since custom JWT hook is disabled.
-- ============================================================================

-- Ensure RLS is enabled (idempotent)
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to avoid conflicts
DROP POLICY IF EXISTS assets_company ON public.assets;
DROP POLICY IF EXISTS tenant_select_assets ON public.assets;
DROP POLICY IF EXISTS tenant_modify_assets ON public.assets;

-- SELECT: service role, JWT tenant match, OR profile company_id match
CREATE POLICY tenant_select_assets
  ON public.assets
  FOR SELECT
  USING (
    public.is_service_role()
    OR public.matches_current_tenant(company_id)
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
        AND p.company_id = assets.company_id
    )
  );

-- INSERT/UPDATE/DELETE: same three-tier check
CREATE POLICY tenant_modify_assets
  ON public.assets
  FOR ALL
  USING (
    public.is_service_role()
    OR public.matches_current_tenant(company_id)
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
        AND p.company_id = assets.company_id
    )
  )
  WITH CHECK (
    public.is_service_role()
    OR public.matches_current_tenant(company_id)
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
        AND p.company_id = assets.company_id
    )
  );
