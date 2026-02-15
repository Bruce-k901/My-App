-- Debug Why Functions Aren't Finding Your Profile
-- Run this in Supabase SQL Editor to see what's wrong

-- Check what auth.uid() returns
SELECT auth.uid() as current_auth_user_id;

-- Check your profile with ALL possible matching fields
SELECT 
  id as profile_id,
  auth_user_id,
  email,
  app_role,
  app_role::TEXT as app_role_text,
  company_id,
  position_title,
  -- Check if any of these match auth.uid()
  (id = auth.uid()) as id_matches_auth_uid,
  (auth_user_id = auth.uid()) as auth_user_id_matches_auth_uid,
  (id = auth.uid() OR auth_user_id = auth.uid()) as either_matches,
  -- Check email match
  (email = (SELECT email FROM auth.users WHERE id = auth.uid())) as email_matches
FROM profiles
WHERE email = 'bruce@e-a-g.co'
   OR id = auth.uid()
   OR auth_user_id = auth.uid()
ORDER BY 
  CASE WHEN id = auth.uid() THEN 1 
       WHEN auth_user_id = auth.uid() THEN 2 
       WHEN email = (SELECT email FROM auth.users WHERE id = auth.uid()) THEN 3 
       ELSE 4 END;

-- Check what the function is actually doing
SELECT 
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname IN ('get_user_company_id', 'is_user_admin_or_manager');

-- Test the function manually step by step
SELECT 
  'Step 1: Check by id' as step,
  company_id,
  app_role::TEXT as role,
  id,
  auth_user_id,
  email
FROM profiles
WHERE id = auth.uid()
LIMIT 1;

SELECT 
  'Step 2: Check by auth_user_id' as step,
  company_id,
  app_role::TEXT as role,
  id,
  auth_user_id,
  email
FROM profiles
WHERE auth_user_id = auth.uid()
LIMIT 1;

SELECT 
  'Step 3: Check by email' as step,
  company_id,
  app_role::TEXT as role,
  id,
  auth_user_id,
  email
FROM profiles
WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
LIMIT 1;

-- Check if RLS is blocking the query
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

