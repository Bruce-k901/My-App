-- ============================================================================
-- Check Current User Profile and Company
-- Run this while logged in to see what the RLS policy sees
-- ============================================================================

-- 1. Check your auth user
SELECT 
  '=== AUTH USER ===' as section,
  id as auth_user_id,
  email as auth_email,
  created_at as auth_created_at
FROM auth.users
WHERE id = auth.uid();

-- 2. Check your profile
SELECT 
  '=== PROFILE ===' as section,
  id as profile_id,
  email as profile_email,
  full_name,
  company_id,
  site_id,
  app_role,
  CASE 
    WHEN id = auth.uid() THEN '✓ Profile ID matches auth.uid()'
    ELSE '✗ Profile ID does NOT match auth.uid()'
  END as id_match_status
FROM public.profiles
WHERE id = auth.uid();

-- 3. Test the function directly
SELECT 
  '=== FUNCTION TEST ===' as section,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.routines 
      WHERE routine_name = 'check_user_company_match'
    ) THEN
      public.check_user_company_match(
        auth.uid(),
        (SELECT company_id FROM public.profiles WHERE id = auth.uid())
      )
    ELSE NULL
  END as function_returns,
  (SELECT company_id FROM public.profiles WHERE id = auth.uid()) as your_company_id;

-- 4. Test what the policy would check
SELECT 
  '=== POLICY CHECK SIMULATION ===' as section,
  auth.uid() = auth.uid() as created_by_check,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND company_id IS NOT NULL
    ) THEN '✓ Profile has company_id'
    ELSE '✗ Profile missing company_id'
  END as company_id_status;

