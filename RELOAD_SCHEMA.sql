-- Run this to reload the Supabase schema cache
NOTIFY pgrst, 'reload schema';

-- Also check what columns exist in the tasks table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'tasks'
ORDER BY ordinal_position;
