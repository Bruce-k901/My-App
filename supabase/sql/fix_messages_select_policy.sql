-- ============================================================================
-- Fix Messages SELECT Policy
-- The policy might be blocking message loading for newly created conversations
-- ============================================================================

BEGIN;

-- Drop existing SELECT policy
DROP POLICY IF EXISTS messages_select_participant ON public.messages;

-- Create SELECT policy that allows messages in conversations where user is a participant
-- Use a simpler check that doesn't rely on complex joins
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



