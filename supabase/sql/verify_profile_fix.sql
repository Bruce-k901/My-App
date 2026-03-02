-- ============================================================================
-- Verify Profile 406 Fix
-- ============================================================================
-- This script verifies that the profile 406 error fix is working correctly
-- Run this after applying fix_missing_profile.sql
-- ============================================================================

-- Test 1: Check if user exists
SELECT 
  'Test 1: User exists' as test_name,
  CASE 
    WHEN EXISTS(SELECT 1 FROM auth.users WHERE id = '232039a6-614f-4c66-97b5-447dd5968fb4')
    THEN '✅ PASS - User exists'
    ELSE '❌ FAIL - User does not exist'
  END as result;

-- Test 2: Check if profile exists
SELECT 
  'Test 2: Profile exists' as test_name,
  CASE 
    WHEN EXISTS(SELECT 1 FROM public.profiles WHERE id = '232039a6-614f-4c66-97b5-447dd5968fb4')
    THEN '✅ PASS - Profile exists'
    ELSE '❌ FAIL - Profile does not exist (run fix_missing_profile.sql)'
  END as result;

-- Test 3: Check profile has required fields
SELECT 
  'Test 3: Profile has required fields' as test_name,
  CASE 
    WHEN EXISTS(
      SELECT 1 FROM public.profiles 
      WHERE id = '232039a6-614f-4c66-97b5-447dd5968fb4'
        AND email IS NOT NULL
        AND app_role IS NOT NULL
    )
    THEN '✅ PASS - Profile has required fields'
    ELSE '❌ FAIL - Profile missing required fields'
  END as result;

-- Test 4: Check RLS is enabled
SELECT 
  'Test 4: RLS is enabled' as test_name,
  CASE 
    WHEN EXISTS(
      SELECT 1 FROM pg_tables 
      WHERE schemaname = 'public' 
        AND tablename = 'profiles' 
        AND rowsecurity = true
    )
    THEN '✅ PASS - RLS is enabled'
    ELSE '❌ FAIL - RLS is not enabled'
  END as result;

-- Test 5: Check RLS policies exist
SELECT 
  'Test 5: RLS policies exist' as test_name,
  CASE 
    WHEN (
      SELECT COUNT(*) FROM pg_policies 
      WHERE tablename = 'profiles' 
        AND policyname IN ('profiles_select_own', 'profiles_insert_own', 'profiles_update_own')
    ) = 3
    THEN '✅ PASS - All RLS policies exist'
    ELSE '❌ FAIL - Missing RLS policies (run rls_policies_authoritative.sql)'
  END as result;

-- Test 6: Show profile details (if exists)
SELECT 
  'Test 6: Profile details' as test_name,
  id,
  email,
  full_name,
  app_role,
  company_id,
  CASE 
    WHEN company_id IS NULL THEN '⚠️ WARNING - Profile missing company_id (user needs to complete onboarding)'
    ELSE '✅ OK - Profile has company_id'
  END as company_status
FROM public.profiles
WHERE id = '232039a6-614f-4c66-97b5-447dd5968fb4';

-- Summary
SELECT 
  '=== SUMMARY ===' as summary,
  CASE 
    WHEN EXISTS(SELECT 1 FROM public.profiles WHERE id = '232039a6-614f-4c66-97b5-447dd5968fb4')
      AND EXISTS(SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles_select_own')
    THEN '✅ Profile 406 fix is working correctly'
    ELSE '❌ Profile 406 fix needs attention - run fix_missing_profile.sql'
  END as status;


