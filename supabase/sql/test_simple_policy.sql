-- ============================================================================
-- Test Simple Policy First
-- Let's see if the basic created_by check works
-- ============================================================================

BEGIN;

-- Drop all INSERT policies
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'conversations' 
      AND cmd = 'INSERT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.conversations', pol.policyname);
  END LOOP;
END $$;

-- Create a VERY simple policy first - just check created_by
CREATE POLICY conversations_insert_simple
  ON public.conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Verify
SELECT 
  '=== SIMPLE POLICY CREATED ===' as section,
  policyname,
  cmd,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'conversations'
  AND cmd = 'INSERT';

COMMIT;

-- Now try creating a conversation from the frontend
-- If this works, the issue is with the company check
-- If this fails, the issue is with the created_by check

