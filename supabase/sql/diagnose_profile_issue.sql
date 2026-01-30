-- Comprehensive Profile Diagnosis
-- Run this in Supabase SQL Editor to see what's wrong with your profile

-- Check ALL profiles (bypassing RLS with SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.diagnose_my_profile()
RETURNS TABLE (
  profile_id UUID,
  auth_user_id UUID,
  full_name TEXT,
  email TEXT,
  app_role TEXT,
  company_id UUID,
  current_auth_uid UUID,
  matches_auth_user BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as profile_id,
    p.auth_user_id,
    p.full_name,
    p.email,
    p.app_role::TEXT as app_role,
    p.company_id,
    auth.uid() as current_auth_uid,
    (p.id = auth.uid() OR p.auth_user_id = auth.uid()) as matches_auth_user
  FROM public.profiles p
  WHERE p.id = auth.uid() 
     OR p.auth_user_id = auth.uid()
     OR p.email = (SELECT email FROM auth.users WHERE id = auth.uid());
END;
$$;

-- Run the diagnosis
SELECT * FROM public.diagnose_my_profile();

-- Also check auth.users directly
SELECT 
  id as auth_user_id,
  email,
  raw_user_meta_data
FROM auth.users
WHERE id = auth.uid();

-- Check if there are any companies
SELECT 
  id,
  name,
  created_at
FROM companies
ORDER BY created_at DESC
LIMIT 5;










