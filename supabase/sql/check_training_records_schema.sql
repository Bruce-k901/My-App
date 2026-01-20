-- Check what columns actually exist in training_records table
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'training_records'
ORDER BY ordinal_position;

