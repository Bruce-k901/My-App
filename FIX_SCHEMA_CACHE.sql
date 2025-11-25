-- CRITICAL: Run this to fix the schema cache issue
-- This tells PostgREST to reload the database schema

NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

-- Wait a few seconds, then run this to verify the tasks table columns:
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'tasks'
ORDER BY ordinal_position;

-- You should see columns like: id, company_id, site_id, title, description, status, etc.
-- If you see a 'name' column, that's the problem - it shouldn't be there.
