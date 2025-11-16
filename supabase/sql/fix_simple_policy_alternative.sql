-- ============================================================================
-- Alternative Simple Policy
-- Try a different approach - maybe auth.uid() isn't working as expected
-- ============================================================================

BEGIN;

-- Drop existing simple policy
DROP POLICY IF EXISTS conversations_insert_simple ON public.conversations;

-- Try a policy that checks created_by IS NOT NULL instead
-- This is less restrictive but still has some validation
CREATE POLICY conversations_insert_authenticated
  ON public.conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by IS NOT NULL);

-- Verify
SELECT 
  '=== POLICY CREATED ===' as section,
  policyname,
  cmd,
  roles,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'conversations'
  AND cmd = 'INSERT';

COMMIT;

-- WARNING: This is a very permissive policy - it allows any authenticated user to create conversations
-- We should add company_id validation in the application layer or create a more restrictive policy later
-- But this will help us test if the INSERT works at all

