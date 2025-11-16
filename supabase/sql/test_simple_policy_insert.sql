-- ============================================================================
-- Test INSERT with Simple Policy
-- The simple policy should work - let's see why it's not
-- ============================================================================

-- Check current user
SELECT 
  '=== CURRENT USER ===' as section,
  auth.uid() as auth_uid,
  (SELECT email FROM auth.users WHERE id = auth.uid()) as email;

-- Check if the policy check would pass
SELECT 
  '=== POLICY CHECK SIMULATION ===' as section,
  auth.uid() as auth_uid_value,
  (auth.uid() = auth.uid()) as policy_check_result,
  CASE 
    WHEN auth.uid() = auth.uid() 
    THEN '✓ Policy SHOULD allow INSERT'
    ELSE '✗ Policy will BLOCK INSERT'
  END as interpretation;

-- Check current policy
SELECT 
  '=== CURRENT POLICY ===' as section,
  policyname,
  cmd,
  roles,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'conversations'
  AND cmd = 'INSERT';

-- Check table permissions
SELECT 
  '=== TABLE PERMISSIONS ===' as section,
  grantee,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name = 'conversations'
  AND grantee = 'authenticated';

-- Try the INSERT
DO $$
DECLARE
  test_user_id UUID;
  insert_id UUID;
BEGIN
  test_user_id := auth.uid();
  
  RAISE NOTICE '=== ATTEMPTING INSERT WITH SIMPLE POLICY ===';
  RAISE NOTICE 'User ID: %', test_user_id;
  RAISE NOTICE 'Policy check (created_by = auth.uid()): %', (test_user_id = auth.uid());
  
  BEGIN
    INSERT INTO public.conversations (
      type,
      company_id,
      created_by
    ) VALUES (
      'direct',
      (SELECT company_id FROM public.profiles WHERE id = test_user_id),
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
  END;
END $$;

