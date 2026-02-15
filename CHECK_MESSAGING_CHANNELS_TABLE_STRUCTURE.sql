-- Check if messaging_channels table structure matches what the code expects

-- 1. Check if table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'messaging_channels'
) as table_exists;

-- 2. Show all columns
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'messaging_channels'
ORDER BY ordinal_position;

-- 3. Check if created_by column exists and its type
SELECT 
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_name = 'messaging_channels'
AND column_name = 'created_by';

-- 4. Check if company_id column exists
SELECT 
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_name = 'messaging_channels'
AND column_name = 'company_id';

-- 5. Check if channel_type column exists
SELECT 
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_name = 'messaging_channels'
AND column_name = 'channel_type';

-- 6. Try a test insert (this will fail with RLS but shows if structure is correct)
-- Replace with your actual user ID
/*
INSERT INTO messaging_channels (channel_type, company_id, created_by)
VALUES ('direct', 'fae1b377-859d-4ba6-bce2-d8aaf0044517'::uuid, auth.uid())
RETURNING *;
*/

