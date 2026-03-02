-- Simple Direct Test - Run this first
-- This bypasses RLS to see what's actually in your profile

-- Check what auth.uid() returns
SELECT auth.uid() as current_auth_user_id;

-- Check your profile directly (bypassing RLS with SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.test_get_my_profile()
RETURNS TABLE (
  profile_id UUID,
  auth_user_id UUID,
  email TEXT,
  company_id UUID,
  app_role TEXT,
  id_matches BOOLEAN,
  auth_user_id_matches BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.auth_user_id,
    p.email,
    p.company_id,
    p.app_role::TEXT,
    (p.id = auth.uid()) as id_matches,
    (p.auth_user_id = auth.uid()) as auth_user_id_matches
  FROM public.profiles p
  WHERE p.email = (SELECT email FROM auth.users WHERE id = auth.uid())
     OR p.id = auth.uid()
     OR p.auth_user_id = auth.uid();
END;
$$;

-- Run the test
SELECT * FROM public.test_get_my_profile();

-- Check current policies
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'profiles';










