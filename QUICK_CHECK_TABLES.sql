-- Quick check: Do the tables exist and what columns do they have?
-- This will show results even if tables don't exist

-- Check if tables exist
SELECT 
  'table_exists' as check_type,
  table_name,
  CASE WHEN table_name IS NOT NULL THEN 'YES' ELSE 'NO' END as exists
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('messaging_messages', 'typing_indicators', 'messaging_channel_members')
ORDER BY table_name;

-- Check messaging_messages columns
SELECT 
  'messaging_messages' as table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'messaging_messages'
ORDER BY ordinal_position;

-- Check typing_indicators columns
SELECT 
  'typing_indicators' as table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'typing_indicators'
ORDER BY ordinal_position;

-- Check messaging_channel_members columns
SELECT 
  'messaging_channel_members' as table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'messaging_channel_members'
ORDER BY ordinal_position;
