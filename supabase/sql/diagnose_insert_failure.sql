-- ============================================================================
-- Diagnose INSERT Failure
-- This will show us exactly why the INSERT is failing
-- ============================================================================

-- Step 1: Check what values we have
SELECT 
  '=== CURRENT VALUES ===' as section,
  auth.uid() as auth_uid,
  (SELECT company_id FROM public.profiles WHERE id = auth.uid()) as profile_company_id,
  (SELECT id FROM public.profiles WHERE id = auth.uid()) as profile_id;

-- Step 2: Test the function with the exact values
SELECT 
  '=== FUNCTION TEST ===' as section,
  public.check_user_company_match(
    auth.uid(),
    (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  ) as function_result;

-- Step 3: Test each part of the policy
SELECT 
  '=== POLICY PARTS ===' as section,
  auth.uid() as auth_uid_value,
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
  ) as full_policy_result;

-- Step 4: Try to INSERT and catch the error
DO $$
DECLARE
  test_user_id UUID;
  test_company_id UUID;
  insert_id UUID;
  policy_result BOOLEAN;
BEGIN
  test_user_id := auth.uid();
  test_company_id := (SELECT company_id FROM public.profiles WHERE id = test_user_id);
  
  RAISE NOTICE '=== ATTEMPTING INSERT ===';
  RAISE NOTICE 'User ID: %', test_user_id;
  RAISE NOTICE 'Company ID: %', test_company_id;
  RAISE NOTICE 'Created by check: %', (test_user_id = auth.uid());
  RAISE NOTICE 'Company match check: %', public.check_user_company_match(test_user_id, test_company_id);
  
  policy_result := (
    (test_user_id = auth.uid())
    AND
    public.check_user_company_match(test_user_id, test_company_id)
  );
  
  RAISE NOTICE 'Full policy result: %', policy_result;
  
  IF NOT policy_result THEN
    RAISE NOTICE '✗ Policy check FAILED - INSERT will be blocked';
    RAISE NOTICE 'Created by match: %', (test_user_id = auth.uid());
    RAISE NOTICE 'Company match: %', public.check_user_company_match(test_user_id, test_company_id);
    RETURN;
  END IF;
  
  BEGIN
    INSERT INTO public.conversations (
      type,
      company_id,
      created_by
    ) VALUES (
      'direct',
      test_company_id,
      test_user_id
    ) RETURNING id INTO insert_id;
    
    RAISE NOTICE '✓ INSERT SUCCEEDED! Conversation ID: %', insert_id;
    
    -- Clean up
    DELETE FROM public.conversations WHERE id = insert_id;
    RAISE NOTICE 'Test conversation deleted';
    
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✗ INSERT FAILED with error: %', SQLERRM;
    RAISE NOTICE 'Error code: %', SQLSTATE;
  END;
END $$;

