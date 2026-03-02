-- ============================================================================
-- Migration: 20260226160000_platform_admin_bypass_rpc_functions.sql
-- Description: Add platform admin bypass to RPC functions that have hardcoded
--              company_id checks. Previously only matches_current_tenant() and
--              has_site_access() had the bypass, but SECURITY DEFINER functions
--              like get_company_profiles() and stockly.stockly_company_access()
--              enforce their own company checks independently of RLS.
-- ============================================================================

-- 1. Fix get_company_profiles() — allow platform admins to query any company
DROP FUNCTION IF EXISTS public.get_company_profiles(UUID);

CREATE FUNCTION public.get_company_profiles(p_company_id UUID)
RETURNS TABLE (
  profile_id UUID,
  full_name TEXT,
  email TEXT,
  phone_number TEXT,
  avatar_url TEXT,
  position_title TEXT,
  department TEXT,
  home_site UUID,
  status TEXT,
  start_date DATE,
  app_role TEXT,
  company_id UUID,
  contract_type TEXT,
  reports_to UUID,
  auth_user_id UUID,
  nationality TEXT,
  address_line_1 TEXT,
  address_line_2 TEXT,
  city TEXT,
  county TEXT,
  postcode TEXT,
  country TEXT,
  emergency_contacts JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $func$
DECLARE
  v_user_company_id UUID;
  v_is_platform_admin BOOLEAN := false;
BEGIN
  -- Check user's company_id and platform admin status
  SELECT p_check.company_id, COALESCE(p_check.is_platform_admin, false)
  INTO v_user_company_id, v_is_platform_admin
  FROM public.profiles p_check
  WHERE p_check.id = auth.uid() OR p_check.auth_user_id = auth.uid()
  LIMIT 1;

  IF p_company_id IS NULL THEN
    RAISE NOTICE 'get_company_profiles called with NULL company_id - returning empty result';
    RETURN;
  END IF;

  -- Platform admins can access any company
  IF v_is_platform_admin THEN
    -- allowed
  ELSIF v_user_company_id IS NULL THEN
    RAISE NOTICE 'User % has no company_id - allowing access to company %', auth.uid(), p_company_id;
  ELSIF v_user_company_id != p_company_id THEN
    RAISE EXCEPTION 'Access denied: user belongs to company %, requested company %', v_user_company_id, p_company_id;
  END IF;

  RETURN QUERY
  SELECT
    p.id AS profile_id,
    p.full_name,
    p.email,
    p.phone_number,
    p.avatar_url,
    p.position_title,
    p.department,
    p.home_site,
    p.status,
    p.start_date,
    p.app_role::TEXT,
    p.company_id,
    p.contract_type,
    p.reports_to,
    p.auth_user_id,
    p.nationality,
    p.address_line_1,
    p.address_line_2,
    p.city,
    p.county,
    p.postcode,
    p.country,
    p.emergency_contacts
  FROM public.profiles p
  WHERE p.company_id = p_company_id;
END;
$func$;

GRANT EXECUTE ON FUNCTION public.get_company_profiles(UUID) TO authenticated;

-- 2. Fix stockly.stockly_company_access() — allow platform admins full access
CREATE OR REPLACE FUNCTION stockly.stockly_company_access(p_company_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
          AND (p.company_id = p_company_id OR p.is_platform_admin = true)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
