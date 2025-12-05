-- ============================================================================
-- DIAGNOSE SHELLY'S PROFILE 406 ERROR
-- ============================================================================
-- This script checks if Shelly's profile exists and if RLS is blocking access
-- ============================================================================

-- Step 1: Find Shelly's auth user ID
SELECT 
  '=== SHELLY AUTH USER ===' AS section,
  id AS auth_user_id,
  email,
  email_confirmed_at,
  created_at,
  last_sign_in_at
FROM auth.users
WHERE email = 'lee@e-a-g.co'
LIMIT 1;

-- Step 2: Find Shelly's profile
SELECT 
  '=== SHELLY PROFILE ===' AS section,
  id AS profile_id,
  email,
  full_name,
  company_id,
  site_id,
  app_role,
  created_at
FROM public.profiles
WHERE email = 'lee@e-a-g.co'
LIMIT 1;

-- Step 3: Check if profile ID matches auth user ID
SELECT 
  '=== ID MATCH CHECK ===' AS section,
  au.id AS auth_user_id,
  p.id AS profile_id,
  au.id = p.id AS ids_match,
  au.email AS auth_email,
  p.email AS profile_email,
  p.company_id,
  p.app_role
FROM auth.users au
LEFT JOIN public.profiles p ON p.email = au.email
WHERE au.email = 'lee@e-a-g.co';

-- Step 4: Check RLS status on profiles table
SELECT 
  '=== RLS STATUS ===' AS section,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'profiles';

-- Step 5: Check existing RLS policies
SELECT 
  '=== RLS POLICIES ===' AS section,
  policyname,
  cmd AS command,
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'profiles'
ORDER BY policyname;

-- Step 6: Test if profile can be accessed (this will show what RLS sees)
-- Note: This needs to be run as the actual user, but we can check the policy
SELECT 
  '=== POLICY TEST ===' AS section,
  'Run this query as the user to test: SELECT * FROM public.profiles WHERE id = auth.uid();' AS instruction,
  'If this returns no rows, RLS is blocking access' AS note;

-- Step 7: Check if profile exists for the specific user ID from error
SELECT 
  '=== PROFILE FOR ERROR USER ID ===' AS section,
  id,
  email,
  full_name,
  company_id,
  app_role
FROM public.profiles
WHERE id = 'b7e28f87-fee8-4ca9-bad2-b5ac003acb62';

-- Step 8: Check auth user for that ID
SELECT 
  '=== AUTH USER FOR ERROR ID ===' AS section,
  id,
  email,
  email_confirmed_at
FROM auth.users
WHERE id = 'b7e28f87-fee8-4ca9-bad2-b5ac003acb62';
