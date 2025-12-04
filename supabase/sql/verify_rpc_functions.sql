-- Verify that the RPC functions exist
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('insert_contractor', 'update_contractor')
ORDER BY routine_name;

-- If the functions don't exist, you'll see no results
-- If they exist, you'll see them listed

