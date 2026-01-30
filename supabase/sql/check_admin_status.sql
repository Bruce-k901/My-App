-- Check Current User's Admin Status
-- Run this in Supabase SQL Editor to verify your role and company_id

-- Check your profile details
SELECT 
  id,
  full_name,
  email,
  app_role,
  app_role::TEXT as role_as_text,
  company_id,
  LOWER(app_role::TEXT) as role_lowercase,
  CASE 
    WHEN LOWER(app_role::TEXT) IN ('admin', 'manager', 'owner', 'general_manager') OR
         app_role::TEXT IN ('Admin', 'Manager', 'Owner', 'General Manager', 'General_Manager')
    THEN 'YES' 
    ELSE 'NO' 
  END as is_admin_or_manager,
  auth.uid() as current_user_id
FROM profiles
WHERE id = auth.uid() OR auth_user_id = auth.uid();

-- Check if the helper functions work
SELECT 
  public.get_user_company_id() as your_company_id,
  public.is_user_admin_or_manager() as is_admin_or_manager_function_result;

-- Check existing INSERT policies
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  with_check
FROM pg_policies
WHERE tablename = 'profiles'
  AND cmd = 'INSERT';

-- Test the INSERT policy directly
-- This will show what the policy evaluates to for your user
SELECT 
  auth.uid() = auth.uid() as can_insert_own_profile,
  public.get_user_company_id() IS NOT NULL as has_company_id,
  public.is_user_admin_or_manager() as is_admin_or_manager_check;
