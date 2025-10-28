-- Verify RLS Policies for All Library Tables
-- Run this in Supabase SQL Editor to check if RLS is properly configured

-- Check RLS status for all library tables
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename IN (
  'ingredients_library',
  'ppe_library',
  'chemicals_library',
  'drinks_library',
  'disposables_library'
)
ORDER BY tablename;

-- List all policies for library tables
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN (
  'ingredients_library',
  'ppe_library',
  'chemicals_library',
  'drinks_library',
  'disposables_library'
)
ORDER BY tablename, policyname;

-- Count policies per table
SELECT 
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE tablename IN (
  'ingredients_library',
  'ppe_library',
  'chemicals_library',
  'drinks_library',
  'disposables_library'
)
GROUP BY tablename
ORDER BY tablename;

