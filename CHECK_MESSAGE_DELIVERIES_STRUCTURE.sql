-- ============================================================================
-- CHECK: Verify message_deliveries and message_reads table structure
-- Run this to see what the actual structure is
-- ============================================================================

-- Check columns
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name IN ('message_deliveries', 'message_reads')
ORDER BY table_name, ordinal_position;

-- Check primary key constraints
SELECT 
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  STRING_AGG(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) as key_columns
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
WHERE tc.table_schema = 'public'
  AND tc.table_name IN ('message_deliveries', 'message_reads')
  AND tc.constraint_type IN ('PRIMARY KEY', 'UNIQUE')
GROUP BY tc.table_name, tc.constraint_name, tc.constraint_type;

-- Check if there are any records
SELECT 
  'message_deliveries' as table_name,
  COUNT(*) as record_count,
  COUNT(DISTINCT message_id) as unique_messages,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'message_deliveries' AND column_name = 'profile_id') 
    THEN COUNT(DISTINCT profile_id)
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'message_deliveries' AND column_name = 'user_id')
    THEN COUNT(DISTINCT user_id)
    ELSE 0
  END as unique_users
FROM message_deliveries
UNION ALL
SELECT 
  'message_reads' as table_name,
  COUNT(*) as record_count,
  COUNT(DISTINCT message_id) as unique_messages,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'message_reads' AND column_name = 'profile_id') 
    THEN COUNT(DISTINCT profile_id)
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'message_reads' AND column_name = 'user_id')
    THEN COUNT(DISTINCT user_id)
    ELSE 0
  END as unique_users
FROM message_reads;
