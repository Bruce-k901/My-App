-- Check if policies exist for all messaging tables
SELECT 
  tablename,
  policyname,
  cmd,
  CASE 
    WHEN tablename = 'messaging_messages' AND cmd = 'INSERT' THEN '✅ Required for sending messages'
    WHEN tablename = 'messaging_messages' AND cmd = 'SELECT' THEN '✅ Required for reading messages'
    WHEN tablename = 'typing_indicators' AND cmd = 'ALL' THEN '✅ Required for typing indicators'
    WHEN tablename = 'typing_indicators' AND cmd = 'SELECT' THEN '✅ Required for seeing typing indicators'
    ELSE 'Other'
  END as importance
FROM pg_policies
WHERE tablename IN ('messaging_messages', 'typing_indicators', 'messaging_channel_members')
ORDER BY 
  CASE tablename 
    WHEN 'messaging_messages' THEN 1
    WHEN 'typing_indicators' THEN 2
    WHEN 'messaging_channel_members' THEN 3
  END,
  cmd;
