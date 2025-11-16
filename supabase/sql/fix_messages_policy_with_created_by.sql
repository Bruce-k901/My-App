-- ============================================================================
-- Fix Messages SELECT Policy to Also Allow Messages in Conversations You Created
-- Similar to the conversations SELECT policy fix
-- ============================================================================

BEGIN;

-- Drop existing SELECT policy
DROP POLICY IF EXISTS messages_select_participant ON public.messages;

-- Create SELECT policy that allows messages in conversations where:
-- 1. User is a participant
-- 2. OR user created the conversation (for newly created conversations)
CREATE POLICY messages_select_participant
  ON public.messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id
        AND cp.user_id = auth.uid()
        AND cp.left_at IS NULL
    )
    OR
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND c.created_by = auth.uid()
    )
  );

-- Verify
SELECT 
  '=== MESSAGES SELECT POLICY CREATED ===' as section,
  policyname,
  cmd,
  roles,
  qual as using_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'messages'
  AND cmd = 'SELECT';

COMMIT;


