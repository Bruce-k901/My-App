-- Verify and fix get_company_profiles function
-- This script checks if columns exist and creates/updates the function accordingly

-- First, check which columns exist
DO $$
DECLARE
  v_has_probation_end_date BOOLEAN;
  v_has_hourly_rate BOOLEAN;
BEGIN
  -- Check if columns exist
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'probation_end_date'
  ) INTO v_has_probation_end_date;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'hourly_rate'
  ) INTO v_has_hourly_rate;

  RAISE NOTICE 'probation_end_date exists: %', v_has_probation_end_date;
  RAISE NOTICE 'hourly_rate exists: %', v_has_hourly_rate;
END $$;

-- Drop and recreate the function
DROP FUNCTION IF EXISTS public.get_company_profiles(UUID);

CREATE OR REPLACE FUNCTION public.get_company_profiles(p_company_id UUID)
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
  emergency_contacts JSONB,
  employee_number TEXT,
  contracted_hours_per_week DECIMAL(5,2),
  probation_end_date DATE,
  hourly_rate INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $func$
DECLARE
  v_user_company_id UUID;
BEGIN
  -- User company_id may be NULL during setup
  SELECT p_check.company_id INTO v_user_company_id
  FROM public.profiles p_check
  WHERE p_check.id = auth.uid() OR p_check.auth_user_id = auth.uid()
  LIMIT 1;

  IF p_company_id IS NULL THEN
    RAISE NOTICE 'get_company_profiles called with NULL company_id - returning empty result';
    RETURN;
  END IF;

  IF v_user_company_id IS NULL THEN
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
    p.emergency_contacts,
    p.employee_number,
    p.contracted_hours_per_week,
    p.probation_end_date,
    p.hourly_rate
  FROM public.profiles p
  WHERE p.company_id = p_company_id
  ORDER BY p.full_name ASC;
END;
$func$;

GRANT EXECUTE ON FUNCTION public.get_company_profiles(UUID) TO authenticated;

-- Test the function with a sample company_id (replace with actual ID to test)
-- SELECT * FROM public.get_company_profiles('YOUR_COMPANY_ID'::UUID) LIMIT 1;


