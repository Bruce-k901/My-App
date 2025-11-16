-- ============================================================================
-- Test the check_user_company_match function directly
-- This will show us exactly what the function returns
-- ============================================================================

-- Get your user ID and company_id
SELECT 
  '=== YOUR INFO ===' as section,
  auth.uid() as your_user_id,
  (SELECT company_id FROM public.profiles WHERE id = auth.uid()) as your_company_id;

-- Test 1: Function with NULL (should return TRUE)
SELECT 
  '=== TEST 1: NULL company_id ===' as section,
  public.check_user_company_match(auth.uid(), NULL::UUID) as result,
  'Expected: TRUE' as expected;

-- Test 2: Function with your actual company_id (should return TRUE)
SELECT 
  '=== TEST 2: Your company_id ===' as section,
  public.check_user_company_match(
    auth.uid(),
    (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  ) as result,
  (SELECT company_id FROM public.profiles WHERE id = auth.uid()) as company_id_used,
  'Expected: TRUE' as expected;

-- Test 3: Function with wrong company_id (should return FALSE)
SELECT 
  '=== TEST 3: Wrong company_id ===' as section,
  public.check_user_company_match(
    auth.uid(),
    '00000000-0000-0000-0000-000000000000'::UUID
  ) as result,
  'Expected: FALSE' as expected;

-- Test 4: Simulate what happens during INSERT
-- This simulates the exact policy check
SELECT 
  '=== TEST 4: Policy Simulation ===' as section,
  auth.uid() as created_by_check,
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
    THEN '✓ Policy SHOULD ALLOW INSERT'
    ELSE '✗ Policy WILL BLOCK INSERT'
  END as policy_result;

-- Test 5: Check if there are multiple INSERT policies (conflict?)
SELECT 
  '=== TEST 5: All INSERT Policies ===' as section,
  policyname,
  cmd,
  roles,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'conversations'
  AND cmd = 'INSERT';

-- Test 6: Check RLS is enabled
SELECT 
  '=== TEST 6: RLS Status ===' as section,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'conversations';

