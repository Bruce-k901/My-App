-- ============================================================================
-- Test Actual INSERT to See What's Happening
-- This will show us exactly why the policy is blocking
-- ============================================================================

-- First, let's see what we're trying to insert
SELECT 
  '=== WHAT WE WANT TO INSERT ===' as section,
  'direct' as type,
  (SELECT company_id FROM public.profiles WHERE id = auth.uid()) as company_id,
  auth.uid() as created_by;

-- Test the function with the exact values we'll insert
SELECT 
  '=== FUNCTION TEST WITH INSERT VALUES ===' as section,
  auth.uid() as user_id,
  (SELECT company_id FROM public.profiles WHERE id = auth.uid()) as company_id_to_check,
  public.check_user_company_match(
    auth.uid(),
    (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  ) as function_result,
  CASE 
    WHEN public.check_user_company_match(
      auth.uid(),
      (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    )
    THEN '✓ Function returns TRUE - should allow INSERT'
    ELSE '✗ Function returns FALSE - will block INSERT'
  END as interpretation;

-- Test the full policy check
SELECT 
  '=== FULL POLICY CHECK ===' as section,
  auth.uid() = auth.uid() as created_by_check,
  public.check_user_company_match(
    auth.uid(),
    (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  ) as company_match_check,
  (auth.uid() = auth.uid() 
    AND public.check_user_company_match(
      auth.uid(),
      (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    )
  ) as policy_result,
  CASE 
    WHEN (auth.uid() = auth.uid() 
      AND public.check_user_company_match(
        auth.uid(),
        (SELECT company_id FROM public.profiles WHERE id = auth.uid())
      )
    )
    THEN '✓ Policy SHOULD ALLOW'
    ELSE '✗ Policy WILL BLOCK'
  END as final_result;

-- Now let's try the actual INSERT and see what error we get
-- This will help us understand what's failing
DO $$
DECLARE
  test_company_id UUID;
  test_user_id UUID;
  function_result BOOLEAN;
  insert_result RECORD;
BEGIN
  test_user_id := auth.uid();
  test_company_id := (SELECT company_id FROM public.profiles WHERE id = test_user_id);
  
  RAISE NOTICE '=== ATTEMPTING INSERT ===';
  RAISE NOTICE 'User ID: %', test_user_id;
  RAISE NOTICE 'Company ID: %', test_company_id;
  
  -- Test the function
  function_result := public.check_user_company_match(test_user_id, test_company_id);
  RAISE NOTICE 'Function result: %', function_result;
  
  -- Try the INSERT
  BEGIN
    INSERT INTO public.conversations (
      type,
      company_id,
      created_by
    ) VALUES (
      'direct',
      test_company_id,
      test_user_id
    ) RETURNING id, type, company_id, created_by INTO insert_result;
    
    RAISE NOTICE '✓ INSERT SUCCEEDED!';
    RAISE NOTICE 'Inserted conversation ID: %', insert_result.id;
    
    -- Clean up
    DELETE FROM public.conversations WHERE id = insert_result.id;
    
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✗ INSERT FAILED';
    RAISE NOTICE 'Error: %', SQLERRM;
    RAISE NOTICE 'Error Code: %', SQLSTATE;
  END;
END $$;

-- Check current policies one more time
SELECT 
  '=== CURRENT POLICIES ===' as section,
  policyname,
  cmd,
  roles,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'conversations'
  AND cmd = 'INSERT';

