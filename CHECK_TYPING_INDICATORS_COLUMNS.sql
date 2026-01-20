-- Check typing_indicators table structure specifically
SELECT 
  'typing_indicators' as table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'typing_indicators'
ORDER BY ordinal_position;

-- Check typing_indicators constraints
SELECT 
  'typing_indicators constraints' as info,
  constraint_name,
  constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'typing_indicators'
AND table_schema = 'public';

-- Check typing_indicators RLS policies
SELECT 
  'typing_indicators policies' as info,
  policyname,
  cmd as operation,
  qual as using_clause,
  with_check as with_check_clause
FROM pg_policies
WHERE tablename = 'typing_indicators'
AND schemaname = 'public';
