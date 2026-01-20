-- ============================================================================
-- CHECK ACTUAL TABLE STRUCTURE
-- This shows what columns actually exist in messaging_channel_members
-- ============================================================================

-- Check columns in messaging_channel_members
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'messaging_channel_members'
ORDER BY ordinal_position;

-- Check foreign key relationships
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'messaging_channel_members'
  AND ccu.table_name = 'profiles';

-- Check if profile_id or user_id exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'messaging_channel_members' 
      AND column_name = 'profile_id'
    ) THEN 'profile_id EXISTS'
    ELSE 'profile_id DOES NOT EXIST'
  END as profile_id_status,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'messaging_channel_members' 
      AND column_name = 'user_id'
    ) THEN 'user_id EXISTS'
    ELSE 'user_id DOES NOT EXIST'
  END as user_id_status;
