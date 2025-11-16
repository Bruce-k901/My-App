-- ============================================================================
-- Check Conversation Participants INSERT Policy
-- Participants need to be inserted after conversation creation
-- ============================================================================

-- Check SELECT policy for conversation_participants
SELECT 
  '=== PARTICIPANTS SELECT POLICY ===' as section,
  policyname,
  cmd,
  roles,
  qual as using_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'conversation_participants'
  AND cmd = 'SELECT';

-- Check INSERT policy for conversation_participants
SELECT 
  '=== PARTICIPANTS INSERT POLICY ===' as section,
  policyname,
  cmd,
  roles,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'conversation_participants'
  AND cmd = 'INSERT';



