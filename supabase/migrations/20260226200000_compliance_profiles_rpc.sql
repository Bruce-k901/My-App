-- ============================================================================
-- Migration: 20260226200000_compliance_profiles_rpc.sql
-- Description: SECURITY DEFINER RPC to fetch compliance-relevant profile fields.
--              Direct .from('profiles') is blocked by RLS, so the compliance page
--              needs a dedicated RPC (same pattern as get_company_profiles).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_compliance_profiles(p_company_id UUID)
RETURNS TABLE (
  profile_id UUID,
  full_name TEXT,
  avatar_url TEXT,
  employee_number TEXT,
  department TEXT,
  start_date DATE,
  probation_end_date DATE,
  contract_type TEXT,
  home_site UUID,
  app_role TEXT,
  right_to_work_status TEXT,
  right_to_work_expiry DATE,
  right_to_work_document_type TEXT,
  dbs_status TEXT,
  dbs_certificate_number TEXT,
  dbs_check_date DATE,
  dbs_update_service_registered BOOLEAN,
  national_insurance_number TEXT,
  pension_enrolled BOOLEAN,
  termination_date DATE
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
    RETURN;
  END IF;

  -- Platform admins can access any company
  IF v_is_platform_admin THEN
    -- allowed
  ELSIF v_user_company_id IS NULL THEN
    RAISE NOTICE 'User % has no company_id', auth.uid();
  ELSIF v_user_company_id != p_company_id THEN
    RAISE EXCEPTION 'Access denied: user belongs to company %, requested company %', v_user_company_id, p_company_id;
  END IF;

  RETURN QUERY
  SELECT
    p.id AS profile_id,
    p.full_name,
    p.avatar_url,
    p.employee_number,
    p.department,
    p.start_date,
    p.probation_end_date,
    p.contract_type,
    p.home_site,
    p.app_role::TEXT,
    p.right_to_work_status,
    p.right_to_work_expiry,
    p.right_to_work_document_type,
    p.dbs_status,
    p.dbs_certificate_number,
    p.dbs_check_date,
    p.dbs_update_service_registered,
    p.national_insurance_number,
    p.pension_enrolled,
    p.termination_date
  FROM public.profiles p
  WHERE p.company_id = p_company_id
  ORDER BY p.full_name ASC;
END;
$func$;

GRANT EXECUTE ON FUNCTION public.get_compliance_profiles(UUID) TO authenticated;
