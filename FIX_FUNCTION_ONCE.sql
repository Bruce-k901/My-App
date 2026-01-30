-- ============================================================================
-- FIX THE FUNCTION ONCE AND FOR ALL
-- This drops and recreates get_company_profiles with proper type casting
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Drop the function completely
DROP FUNCTION IF EXISTS public.get_company_profiles(UUID);

-- Recreate with proper enum casting
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
  app_role TEXT,  -- Return as TEXT
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
  IF v_user_company_id IS NULL THEN
    -- Allow access if user has no company_id (setup mode)
    NULL; -- Continue
  ELSIF v_user_company_id != p_company_id THEN
    RAISE EXCEPTION 'Access denied: user belongs to company %, requested company %', v_user_company_id, p_company_id;
  END IF;
  
  -- Return profiles - CAST app_role enum to TEXT
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
    p.app_role::TEXT AS app_role,  -- CAST ENUM TO TEXT
    p.company_id,
    p.contract_type,
    p.reports_to,
    p.auth_user_id
  FROM public.profiles p
  WHERE p.company_id = p_company_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_company_profiles(UUID) TO authenticated;

-- Test it
SELECT * FROM get_company_profiles(
  (SELECT company_id FROM profiles WHERE id = auth.uid() LIMIT 1)
);

