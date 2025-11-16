-- ============================================================================
-- Migration: Test Conversation Insert Policy
-- Description: Temporary permissive policy to test conversation creation
-- ============================================================================

BEGIN;

-- Drop all existing INSERT policies
DROP POLICY IF EXISTS conversations_insert_company ON public.conversations;
DROP POLICY IF EXISTS conversations_insert_debug ON public.conversations;

-- Create a very simple policy that just checks authentication
-- This will help us determine if the issue is with the policy logic or something else
CREATE POLICY conversations_insert_company
  ON public.conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
  );

-- Verify it was created
SELECT 
  'Test policy created: ' || policyname as status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'conversations'
  AND cmd = 'INSERT';

COMMIT;

