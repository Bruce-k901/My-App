-- ============================================================================
-- Verify RLS policies are correct
-- ============================================================================

-- Check typing_indicators policies
SELECT 
  'typing_indicators policies' as check_type,
  policyname,
  cmd,
  qual as using_clause,
  with_check
FROM pg_policies
WHERE tablename = 'typing_indicators'
ORDER BY policyname;

-- Check messaging_messages policies
SELECT 
  'messaging_messages policies' as check_type,
  policyname,
  cmd,
  qual as using_clause,
  with_check
FROM pg_policies
WHERE tablename = 'messaging_messages'
ORDER BY policyname;

-- Check messaging_channel_members policies
SELECT 
  'messaging_channel_members policies' as check_type,
  policyname,
  cmd,
  qual as using_clause,
  with_check
FROM pg_policies
WHERE tablename = 'messaging_channel_members'
ORDER BY policyname;
