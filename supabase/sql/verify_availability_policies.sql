-- Quick verification script for staff_availability_patterns RLS policies
-- Run this to check if policies are correctly configured

-- 1. Check policies exist and their structure
SELECT 
  tablename,
  policyname,
  cmd as operation,
  qual as using_clause,
  with_check as with_check_clause
FROM pg_policies 
WHERE tablename IN ('staff_availability_patterns', 'staff_availability_overrides')
ORDER BY tablename, policyname, cmd;

-- 2. Check if RLS is enabled
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('staff_availability_patterns', 'staff_availability_overrides');

-- 3. Check permissions
SELECT 
  grantee,
  table_name,
  privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
AND table_name IN ('staff_availability_patterns', 'staff_availability_overrides')
AND grantee IN ('authenticated', 'public')
ORDER BY table_name, grantee, privilege_type;

