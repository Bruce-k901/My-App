-- Diagnostic script to check messaging_channels RLS policies
-- Run this to see what policies exist and why inserts might be failing

-- 1. Check if the table exists and RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'messaging_channels';

-- 2. List all policies on messaging_channels
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE tablename = 'messaging_channels'
ORDER BY cmd, policyname;

-- 3. Check if check_user_company_match function exists
SELECT 
  n.nspname as schema,
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname = 'check_user_company_match';

-- 4. Test the function with current user (if you're logged in)
-- This will show if the function works correctly
SELECT 
  auth.uid() as current_user_id,
  public.check_user_company_match(auth.uid(), 'fae1b377-859d-4ba6-bce2-d8aaf0044517'::uuid) as function_result;

-- 5. Check user's profile and company_id
SELECT 
  id,
  company_id,
  full_name,
  email
FROM public.profiles
WHERE id = auth.uid();

-- 6. Show what data would be inserted (for testing)
-- Replace with actual values you're trying to insert
SELECT 
  'fae1b377-859d-4ba6-bce2-d8aaf0044517'::uuid as company_id,
  auth.uid() as created_by,
  'direct' as channel_type,
  auth.uid() = auth.uid() as created_by_check,
  public.check_user_company_match(auth.uid(), 'fae1b377-859d-4ba6-bce2-d8aaf0044517'::uuid) as company_match_check;

