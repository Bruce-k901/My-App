-- ============================================================================
-- Check the actual policy definitions to see what they're checking
-- ============================================================================

-- messaging_messages INSERT policy (the one that's blocking)
SELECT 
  'messaging_messages INSERT policy' as policy_type,
  policyname,
  cmd,
  qual as using_clause,
  with_check
FROM pg_policies
WHERE tablename = 'messaging_messages'
  AND cmd = 'INSERT';

-- typing_indicators ALL policy (the one that's blocking)
SELECT 
  'typing_indicators ALL policy' as policy_type,
  policyname,
  cmd,
  qual as using_clause,
  with_check
FROM pg_policies
WHERE tablename = 'typing_indicators'
  AND cmd = 'ALL';

-- Also check if there are any conflicting policies
SELECT 
  'All messaging_messages policies' as info,
  policyname,
  cmd,
  qual as using_clause,
  with_check
FROM pg_policies
WHERE tablename = 'messaging_messages'
ORDER BY cmd, policyname;
