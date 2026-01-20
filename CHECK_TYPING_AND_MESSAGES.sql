-- Check typing_indicators and messaging_messages specifically

-- typing_indicators columns
SELECT 
  'typing_indicators' as table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'typing_indicators'
ORDER BY ordinal_position;

-- messaging_messages columns  
SELECT 
  'messaging_messages' as table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'messaging_messages'
ORDER BY ordinal_position;
