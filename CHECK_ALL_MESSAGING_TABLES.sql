-- Check all three messaging tables to see their actual structure

-- 1. messaging_messages columns
SELECT 
  'messaging_messages' as table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'messaging_messages'
ORDER BY ordinal_position;

-- 2. typing_indicators columns
SELECT 
  'typing_indicators' as table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'typing_indicators'
ORDER BY ordinal_position;

-- 3. messaging_channel_members columns (already confirmed, but showing for completeness)
SELECT 
  'messaging_channel_members' as table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'messaging_channel_members'
ORDER BY ordinal_position;
