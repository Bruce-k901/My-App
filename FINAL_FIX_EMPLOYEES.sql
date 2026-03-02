-- ============================================================================
-- FINAL FIX FOR EMPLOYEES PAGE
-- This will fix the get_company_profiles function once and for all
-- Run this ENTIRE script in Supabase SQL Editor
-- ============================================================================

BEGIN;

-- Step 1: Drop the function completely (all overloads)
DROP FUNCTION IF EXISTS public.get_company_profiles(UUID) CASCADE;

-- Step 2: Check what type app_role actually is
DO $$
DECLARE
  v_type_name TEXT;
BEGIN
  SELECT data_type INTO v_type_name
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'app_role';
  
  RAISE NOTICE 'app_role column type: %', v_type_name;
END $$;

-- Step 3: Recreate the function with proper casting
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
  auth_user_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_user_company_id UUID;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  -- Get user's company_id (SECURITY DEFINER bypasses RLS)
  SELECT p_check.company_id INTO v_user_company_id
  FROM public.profiles p_check
  WHERE p_check.id = v_user_id
  LIMIT 1;
  
  -- Handle NULL company_id
  IF p_company_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Check company access
  IF v_user_company_id IS NOT NULL AND v_user_company_id != p_company_id THEN
    RAISE EXCEPTION 'Access denied: user belongs to company %, requested company %', v_user_company_id, p_company_id;
  END IF;
  
  -- Return profiles - CAST app_role to TEXT (handles enum, varchar, text)
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
    COALESCE(p.app_role::TEXT, '') AS app_role,  -- Cast enum/varchar to TEXT
    p.company_id,
    p.contract_type,
    p.reports_to,
    p.auth_user_id
  FROM public.profiles p
  WHERE p.company_id = p_company_id;
END;
$$;

-- Step 4: Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_company_profiles(UUID) TO authenticated;

-- Step 5: Verify function exists
SELECT 
  p.proname as function_name,
  CASE WHEN p.prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END as security_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'get_company_profiles';

COMMIT;

-- Step 6: Test the function
SELECT * FROM get_company_profiles(
  (SELECT company_id FROM profiles WHERE id = auth.uid() LIMIT 1)
) LIMIT 5;

