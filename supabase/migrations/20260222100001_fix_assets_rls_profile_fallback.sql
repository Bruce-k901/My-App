-- ============================================================================
-- Migration: 20260222100001_fix_assets_rls_profile_fallback.sql
-- Description: Fix assets RLS policies to include profile-based fallback.
--              The JWT hook is disabled so matches_current_tenant() alone
--              is insufficient. Add profile company_id check as fallback.
-- ============================================================================

-- Drop the policies created by the previous migration
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
