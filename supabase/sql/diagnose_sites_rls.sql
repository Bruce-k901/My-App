-- Diagnose Sites RLS Issue
-- Run this as the authenticated user experiencing the issue

-- 1. Check current auth user
SELECT 
  auth.uid() as current_auth_user_id,
  auth.email() as current_auth_email;

-- 2. Check user's profile and company_id
SELECT 
  id,
  full_name,
  email,
  company_id,
  app_role,
  auth_user_id
FROM profiles
WHERE id = auth.uid() OR auth_user_id = auth.uid()
LIMIT 1;

-- 3. Check if sites are accessible via direct query
SELECT 
  id,
  name,
  company_id
FROM sites
WHERE company_id = (
  SELECT company_id 
  FROM profiles 
  WHERE id = auth.uid() OR auth_user_id = auth.uid()
  LIMIT 1
)
LIMIT 10;

-- 4. Check all RLS policies on sites table
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
WHERE tablename = 'sites';

-- 5. Check if RLS is enabled on sites
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'sites';

-- 6. Test query that should work (if RLS allows)
SELECT COUNT(*) as accessible_sites_count
FROM sites
WHERE company_id IN (
  SELECT company_id 
  FROM profiles 
  WHERE id = auth.uid() OR auth_user_id = auth.uid()
);

