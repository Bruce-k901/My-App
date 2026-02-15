-- Fix My Admin Role
-- Run this in Supabase SQL Editor to ensure your profile has Admin role
-- Replace 'YOUR_EMAIL@example.com' with your actual email address

-- First, check your current role
SELECT 
  id,
  full_name,
  email,
  app_role,
  app_role::TEXT as role_as_text,
  company_id
FROM profiles
WHERE email = 'YOUR_EMAIL@example.com' OR id = auth.uid();

-- Update your role to Admin (if needed)
-- Uncomment and run this if your role is not 'Admin'
-- UPDATE profiles
-- SET app_role = 'Admin'::app_role
-- WHERE id = auth.uid() OR auth_user_id = auth.uid();

-- Verify the update worked
SELECT 
  id,
  full_name,
  email,
  app_role,
  company_id,
  public.is_user_admin_or_manager() as is_admin_check,
  public.get_user_company_id() as company_id_check
FROM profiles
WHERE id = auth.uid() OR auth_user_id = auth.uid();










