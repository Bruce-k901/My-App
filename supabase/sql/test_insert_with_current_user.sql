-- ============================================================================
-- Test INSERT with Current User Context
-- This simulates what happens when the frontend tries to INSERT
-- ============================================================================

-- First, check what we're working with
SELECT 
  '=== CURRENT USER INFO ===' as section,
  auth.uid() as auth_uid,
  (SELECT email FROM auth.users WHERE id = auth.uid()) as email,
  (SELECT company_id FROM public.profiles WHERE id = auth.uid()) as profile_company_id;

-- Test the function
SELECT 
  '=== FUNCTION TEST ===' as section,
  auth.uid() as user_id,
  (SELECT company_id FROM public.profiles WHERE id = auth.uid()) as company_id_to_test,
  public.check_user_company_match(
    auth.uid(),
    (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  ) as function_result;

-- Test the policy parts
SELECT 
  '=== POLICY PARTS TEST ===' as section,
  auth.uid() as auth_uid_value,
  (SELECT company_id FROM public.profiles WHERE id = auth.uid()) as company_id_value,
  (auth.uid() = auth.uid()) as created_by_check,
  public.check_user_company_match(
    auth.uid(),
    (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  ) as company_match_check,
  (
    (auth.uid() = auth.uid())
    AND
    (
      (SELECT company_id FROM public.profiles WHERE id = auth.uid()) IS NULL
      OR
      public.check_user_company_match(
        auth.uid(),
        (SELECT company_id FROM public.profiles WHERE id = auth.uid())
      )
    )
  ) as full_policy_result;

-- Check current policies
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

-- Try the actual INSERT (this will show us the exact error)
DO $$
DECLARE
  test_user_id UUID;
  test_company_id UUID;
  insert_id UUID;
BEGIN
  test_user_id := auth.uid();
  test_company_id := (SELECT company_id FROM public.profiles WHERE id = test_user_id);
  
  RAISE NOTICE '=== ATTEMPTING INSERT ===';
  RAISE NOTICE 'User ID: %', test_user_id;
  RAISE NOTICE 'Company ID: %', test_company_id;
  RAISE NOTICE 'Created by check: %', (test_user_id = auth.uid());
  RAISE NOTICE 'Company match check: %', public.check_user_company_match(test_user_id, test_company_id);
  
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
    RAISE NOTICE '✗ INSERT FAILED';
    RAISE NOTICE 'Error: %', SQLERRM;
    RAISE NOTICE 'Error Code: %', SQLSTATE;
    RAISE NOTICE 'Error Detail: %', SQLERRM;
  END;
END $$;

