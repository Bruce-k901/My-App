-- ============================================================================
-- Fix Conversation Participants INSERT Policy
-- Participants need to be insertable when creating a conversation
-- ============================================================================

BEGIN;

-- Check current INSERT policy
SELECT 
  '=== CURRENT PARTICIPANTS INSERT POLICY ===' as section,
  policyname,
  cmd,
  roles,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'conversation_participants'
  AND cmd = 'INSERT';

-- Drop existing INSERT policy
DROP POLICY IF EXISTS participants_insert_company ON public.conversation_participants;

-- Create INSERT policy that allows:
-- 1. User can add themselves to a conversation they created
-- 2. User can add others to conversations they created
-- 3. User can add themselves if they're already a participant (for group adds)
CREATE POLICY participants_insert_company
  ON public.conversation_participants
  FOR INSERT
  WITH CHECK (
    -- Allow if user is adding themselves
    user_id = auth.uid()
    OR
    -- OR allow if user created the conversation
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_participants.conversation_id
        AND c.created_by = auth.uid()
    )
  );

-- Verify
SELECT 
  '=== PARTICIPANTS INSERT POLICY CREATED ===' as section,
  policyname,
  cmd,
  roles,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'conversation_participants'
  AND cmd = 'INSERT';

COMMIT;


