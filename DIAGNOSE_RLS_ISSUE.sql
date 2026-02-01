-- ============================================================================
-- RLS Diagnostic Script
-- Run this in Supabase SQL Editor to diagnose RLS issues
-- ============================================================================

-- Step 1: Check current RLS policies on profiles table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename = 'profiles'
ORDER BY policyname;

-- Step 2: Check if RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'profiles';

-- Step 3: Check your current user ID
SELECT 
  auth.uid() as current_user_id,
  auth.email() as current_email;

-- Step 4: Check your profile directly (should work with RLS)
SELECT 
  id,
  full_name,
  email,
  company_id,
  app_role,
  status
FROM profiles
WHERE id = auth.uid();

-- Step 5: Check what company_id you have
SELECT 
  company_id,
  COUNT(*) as employee_count
FROM profiles
WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid() LIMIT 1)
GROUP BY company_id;

-- Step 6: Test the function's ability to read your company_id
-- This simulates what the function does internally
DO $$
DECLARE
  v_user_company_id UUID;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  -- Try to get company_id (this is what the function does)
  SELECT p_check.company_id INTO v_user_company_id
  FROM public.profiles p_check
  WHERE p_check.id = v_user_id
  LIMIT 1;
  
  RAISE NOTICE 'User ID: %', v_user_id;
  RAISE NOTICE 'Company ID from function check: %', v_user_company_id;
  
  -- Now try to count profiles in that company (this is what the function returns)
  IF v_user_company_id IS NOT NULL THEN
    RAISE NOTICE 'Profiles in company %: %', 
      v_user_company_id,
      (SELECT COUNT(*) FROM public.profiles WHERE company_id = v_user_company_id);
  ELSE
    RAISE NOTICE 'Company ID is NULL - cannot count profiles';
  END IF;
END $$;

-- Step 7: Test the actual function
SELECT * FROM get_company_profiles(
  (SELECT company_id FROM profiles WHERE id = auth.uid() LIMIT 1)
);

-- Step 8: Check function definition and permissions
SELECT 
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'get_company_profiles';

-- Step 9: Check if SECURITY DEFINER is set correctly
SELECT 
  p.proname as function_name,
  CASE 
    WHEN p.prosecdef THEN 'SECURITY DEFINER'
    ELSE 'SECURITY INVOKER'
  END as security_type,
  p.proowner::regrole as owner
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'get_company_profiles';

-- Step 10: Try to bypass RLS by checking what profiles exist (as postgres role)
-- This will show if the data exists but RLS is blocking it
-- Note: This might not work if you're not a superuser, but worth trying
SELECT 
  COUNT(*) as total_profiles_in_db,
  COUNT(DISTINCT company_id) as unique_companies
FROM profiles;

