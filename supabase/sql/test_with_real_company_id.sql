-- ============================================================================
-- Test Function with Real Company ID
-- This tests the function with actual values that will be used in INSERT
-- ============================================================================

-- First, get your actual user ID and company_id
SELECT 
  '=== YOUR ACTUAL VALUES ===' as section,
  auth.uid() as your_user_id,
  (SELECT company_id FROM public.profiles WHERE id = auth.uid()) as your_company_id;

-- Test the function with your actual company_id (not NULL)
SELECT 
  '=== FUNCTION TEST WITH REAL COMPANY_ID ===' as section,
  auth.uid() as user_id,
  (SELECT company_id FROM public.profiles WHERE id = auth.uid()) as company_id_to_test,
  public.check_user_company_match(
    auth.uid(),
    (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  ) as function_result,
  CASE 
    WHEN public.check_user_company_match(
      auth.uid(),
      (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    ) = TRUE
    THEN '✓ Function returns TRUE - INSERT should work'
    WHEN public.check_user_company_match(
      auth.uid(),
      (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    ) = FALSE
    THEN '✗ Function returns FALSE - INSERT will be blocked'
    ELSE '⚠ Function returns NULL - INSERT will be blocked'
  END as interpretation;

-- Test with detailed step-by-step check
SELECT 
  '=== DETAILED CHECK ===' as section,
  'Step 1: User ID' as step,
  auth.uid()::TEXT as value,
  CASE WHEN auth.uid() IS NOT NULL THEN '✓' ELSE '✗' END as status
UNION ALL
SELECT 
  '=== DETAILED CHECK ===' as section,
  'Step 2: Company ID from profile' as step,
  (SELECT company_id::TEXT FROM public.profiles WHERE id = auth.uid()) as value,
  CASE WHEN (SELECT company_id FROM public.profiles WHERE id = auth.uid()) IS NOT NULL THEN '✓' ELSE '✗' END as status
UNION ALL
SELECT 
  '=== DETAILED CHECK ===' as section,
  'Step 3: Function result' as step,
  public.check_user_company_match(
    auth.uid(),
    (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  )::TEXT as value,
  CASE WHEN public.check_user_company_match(
    auth.uid(),
    (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  ) = TRUE THEN '✓ TRUE' ELSE '✗ FALSE or NULL' END as status;

-- Simulate the exact policy check
SELECT 
  '=== POLICY SIMULATION ===' as section,
  auth.uid() as created_by_value,
  (SELECT company_id FROM public.profiles WHERE id = auth.uid()) as company_id_value,
  (auth.uid() = auth.uid()) as created_by_check,
  public.check_user_company_match(
    auth.uid(),
    (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  ) as company_match_check,
  (
    (auth.uid() = auth.uid())
    AND 
    public.check_user_company_match(
      auth.uid(),
      (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    )
  ) as final_policy_result;

