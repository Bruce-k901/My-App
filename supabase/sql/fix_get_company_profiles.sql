-- Fix get_company_profiles to ensure it returns ALL company employees
-- This function bypasses RLS completely using SECURITY DEFINER
-- NO company_id checks - just returns all profiles for the requested company

DROP FUNCTION IF EXISTS public.get_company_profiles(UUID);

CREATE OR REPLACE FUNCTION public.get_company_profiles(p_company_id UUID)
RETURNS TABLE (
  profile_id UUID,
  full_name TEXT,
  email TEXT,
  phone_number TEXT,
  position_title TEXT,
  department TEXT,
  app_role TEXT,
  status TEXT,
  avatar_url TEXT,
  home_site UUID,
  start_date DATE,
  contract_type TEXT,
  company_id UUID,
  reports_to UUID,
  auth_user_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  -- SECURITY DEFINER bypasses RLS completely
  -- Return ALL profiles for the company, NO user company_id checks
  
  IF p_company_id IS NULL THEN
    RAISE NOTICE 'get_company_profiles called with NULL company_id - returning empty result';
    RETURN;
  END IF;
  
  -- Direct query - SECURITY DEFINER bypasses all RLS policies
  RETURN QUERY
  SELECT 
    p.id as profile_id,
    p.full_name,
    p.email,
    p.phone_number,
    p.position_title,
    p.department,
    p.app_role::TEXT,
    p.status,
    p.avatar_url,
    p.home_site,
    p.start_date,
    p.contract_type,
    p.company_id,
    p.reports_to,
    p.auth_user_id
  FROM public.profiles p
  WHERE p.company_id = p_company_id
  ORDER BY p.full_name ASC;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_company_profiles(UUID) TO authenticated;

-- Test the function
-- Replace 'YOUR_COMPANY_ID' with your actual company_id UUID
-- SELECT * FROM public.get_company_profiles('YOUR_COMPANY_ID'::UUID);

-- Verify it was created
SELECT 
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'get_company_profiles';

