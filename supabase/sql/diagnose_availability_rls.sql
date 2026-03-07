-- Diagnostic queries to check staff_availability_patterns RLS policies
-- Run these to verify the policies are set up correctly

-- 1. Check if tables exist
SELECT 
  table_name,
  CASE WHEN table_name IN ('staff_availability_patterns', 'staff_availability_overrides') 
    THEN '✅ EXISTS' 
    ELSE '❌ MISSING' 
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('staff_availability_patterns', 'staff_availability_overrides')
ORDER BY table_name;

-- 2. Check RLS is enabled
SELECT 
  tablename,
  CASE WHEN rowsecurity THEN '✅ ENABLED' ELSE '❌ DISABLED' END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('staff_availability_patterns', 'staff_availability_overrides');

-- 3. List all policies on these tables
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd as operation,
  CASE 
    WHEN qual IS NOT NULL THEN substring(qual::text, 1, 200) 
    ELSE 'NULL' 
  END as using_clause,
  CASE 
    WHEN with_check IS NOT NULL THEN substring(with_check::text, 1, 200)
    ELSE 'NULL'
  END as with_check_clause
FROM pg_policies 
WHERE tablename IN ('staff_availability_patterns', 'staff_availability_overrides')
ORDER BY tablename, policyname;

-- 4. Check table structure (to verify columns exist)
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN ('staff_availability_patterns', 'staff_availability_overrides')
ORDER BY table_name, ordinal_position;

-- 5. Check current user's profile (to test the policy)
SELECT 
  id,
  company_id,
  CASE WHEN id = auth.uid() THEN '✅ Matches auth.uid()' ELSE '❌ Does not match' END as auth_match,
  CASE WHEN auth_user_id IS NOT NULL THEN 'Has auth_user_id' ELSE 'No auth_user_id (staff profile)' END as profile_type
FROM profiles
WHERE id = auth.uid()
LIMIT 1;

-- 6. Test policy query (simulate what the policy checks)
SELECT 
  'Policy Check Test' as test_name,
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid()
  ) as user_profile_exists,
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid()
    AND company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  ) as company_id_check;

