-- Test script to diagnose task_completion_records RLS issue

-- 1. Check if the function exists
SELECT 
  proname as function_name,
  pg_get_functiondef(oid) as function_definition
FROM pg_proc 
WHERE proname = 'get_user_company_id';

-- 2. Check current policies on task_completion_records
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
WHERE tablename = 'task_completion_records';

-- 3. Test the function (will show NULL if user not found)
SELECT public.get_user_company_id() as user_company_id;

-- 4. Check if user profile exists
SELECT 
  id,
  auth_user_id,
  company_id,
  app_role
FROM public.profiles
WHERE id = auth.uid() OR auth_user_id = auth.uid();

-- 5. Check current tenant
SELECT public.current_tenant() as current_tenant;

