-- Check messaging_messages RLS policies
SELECT 
  'messaging_messages policies' as info,
  policyname,
  cmd as operation,
  qual as using_clause,
  with_check as with_check_clause
FROM pg_policies
WHERE tablename = 'messaging_messages'
AND schemaname = 'public';
