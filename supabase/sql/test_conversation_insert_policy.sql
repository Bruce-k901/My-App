-- ============================================================================
-- Test Conversation INSERT Policy
-- This script tests if the RLS policy is working correctly
-- ============================================================================

-- First, check current user and profile
SELECT 
  'Current User' as section,
  auth.uid() as user_id,
  (SELECT email FROM auth.users WHERE id = auth.uid()) as email;

SELECT 
  'Profile Check' as section,
  id,
  email,
  company_id,
  full_name
FROM public.profiles
WHERE id = auth.uid();

-- Test the check_user_company_match function
SELECT 
  'Function Test' as section,
  public.check_user_company_match(
    auth.uid(),
    (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  ) as function_result,
  (SELECT company_id FROM public.profiles WHERE id = auth.uid()) as user_company_id;

-- Test INSERT policy simulation
-- This simulates what happens when you try to INSERT
SELECT 
  'Policy Simulation' as section,
  auth.uid() = auth.uid() as created_by_check,
  public.check_user_company_match(
    auth.uid(),
    (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  ) as company_match_check,
  CASE 
    WHEN auth.uid() = auth.uid() 
      AND public.check_user_company_match(
        auth.uid(),
        (SELECT company_id FROM public.profiles WHERE id = auth.uid())
      )
    THEN '✓ Policy should allow INSERT'
    ELSE '✗ Policy will block INSERT'
  END as policy_result;

-- Check if the policy exists
SELECT 
  'Policy Check' as section,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'conversations'
  AND cmd = 'INSERT';

