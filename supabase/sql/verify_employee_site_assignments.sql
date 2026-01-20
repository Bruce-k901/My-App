-- Verify employee_site_assignments table and RLS policies
-- Run this to check if the migration has been applied correctly

-- Check if table exists
SELECT 
  'Table exists: ' || CASE WHEN EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'employee_site_assignments'
  ) THEN 'YES ✅' ELSE 'NO ❌' END as table_status;

-- Check if RLS is enabled
SELECT 
  'RLS enabled: ' || CASE WHEN relrowsecurity THEN 'YES ✅' ELSE 'NO ❌' END as rls_status
FROM pg_class
WHERE relname = 'employee_site_assignments';

-- List all policies
SELECT 
  'Policy: ' || polname as policy_name,
  CASE polcmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE'
    WHEN 'd' THEN 'DELETE'
    ELSE 'ALL'
  END as command
FROM pg_policy
WHERE polrelid = 'public.employee_site_assignments'::regclass
ORDER BY polname;

-- Check indexes
SELECT 
  indexname as index_name,
  indexdef as definition
FROM pg_indexes
WHERE tablename = 'employee_site_assignments'
ORDER BY indexname;

-- Test: Try to query the table (this will fail if RLS blocks you)
SELECT 
  COUNT(*) as total_assignments,
  COUNT(CASE WHEN is_active THEN 1 END) as active_assignments
FROM public.employee_site_assignments;

-- Show sample data if any exists
SELECT 
  id,
  profile_id,
  borrowed_site_id,
  start_date,
  end_date,
  is_active,
  created_at
FROM public.employee_site_assignments
ORDER BY created_at DESC
LIMIT 5;

