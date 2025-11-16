-- ============================================================================
-- Debug Conversation INSERT Policy
-- Run this to see exactly what's happening with the INSERT policy
-- ============================================================================

-- Step 1: Check current user
SELECT 
  '=== CURRENT USER ===' as section,
  auth.uid() as user_id,
  (SELECT email FROM auth.users WHERE id = auth.uid()) as email;

-- Step 2: Check user's profile and company_id
SELECT 
  '=== USER PROFILE ===' as section,
  id,
  email,
  company_id,
  full_name,
  CASE 
    WHEN company_id IS NULL THEN '✗ Profile missing company_id'
    ELSE '✓ Profile has company_id'
  END as status
FROM public.profiles
WHERE id = auth.uid();

-- Step 3: Test the check_user_company_match function
-- Test with NULL company_id (should return TRUE)
SELECT 
  '=== FUNCTION TEST (NULL company_id) ===' as section,
  public.check_user_company_match(auth.uid(), NULL::UUID) as result,
  'Should be TRUE (allows conversations without company restriction)' as expected;

-- Test with user's actual company_id
SELECT 
  '=== FUNCTION TEST (user company_id) ===' as section,
  public.check_user_company_match(
    auth.uid(),
    (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  ) as result,
  (SELECT company_id FROM public.profiles WHERE id = auth.uid()) as user_company_id,
  'Should be TRUE (user matches their own company)' as expected;

-- Test with wrong company_id
SELECT 
  '=== FUNCTION TEST (wrong company_id) ===' as section,
  public.check_user_company_match(
    auth.uid(),
    '00000000-0000-0000-0000-000000000000'::UUID
  ) as result,
  'Should be FALSE (user does not match wrong company)' as expected;

-- Step 4: Simulate the INSERT policy check
SELECT 
  '=== POLICY SIMULATION ===' as section,
  auth.uid() as created_by,
  (SELECT company_id FROM public.profiles WHERE id = auth.uid()) as company_id_to_insert,
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
    THEN '✓ Policy SHOULD allow INSERT'
    ELSE '✗ Policy will BLOCK INSERT'
  END as final_result;

-- Step 5: Check the actual policy definition
SELECT 
  '=== POLICY DEFINITION ===' as section,
  policyname,
  cmd as command,
  roles,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'conversations'
  AND cmd = 'INSERT';

-- Step 6: Check function permissions
SELECT 
  '=== FUNCTION PERMISSIONS ===' as section,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  p.prosecdef as is_security_definer,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'check_user_company_match';

-- Step 7: Try a test INSERT (this will fail if policy blocks it)
-- Uncomment to test actual INSERT:
/*
INSERT INTO public.conversations (
  type,
  company_id,
  created_by
) VALUES (
  'direct',
  (SELECT company_id FROM public.profiles WHERE id = auth.uid()),
  auth.uid()
) RETURNING id, type, company_id, created_by;
*/

