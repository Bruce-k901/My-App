-- ============================================================================
-- Fix SELECT Policy to Allow Returning Newly Created Conversations
-- The SELECT policy was blocking INSERT with .select() because you're not a participant yet
-- ============================================================================

BEGIN;

-- Drop existing SELECT policy
DROP POLICY IF EXISTS conversations_select_participant ON public.conversations;

-- Create SELECT policy that allows:
-- 1. Conversations where user is a participant
-- 2. Conversations created by the user (so INSERT with .select() works)
CREATE POLICY conversations_select_participant
  ON public.conversations
  FOR SELECT
  USING (
    -- Allow if user is a participant
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = conversations.id
        AND cp.user_id = auth.uid()
        AND cp.left_at IS NULL
    )
    OR
    -- OR allow if user created the conversation (for INSERT with .select())
    created_by = auth.uid()
  );

-- Verify
SELECT 
  '=== SELECT POLICY CREATED ===' as section,
  policyname,
  cmd,
  roles,
  qual as using_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'conversations'
  AND cmd = 'SELECT';

COMMIT;

