-- Debug Profile Lookup Issue
-- Run this in Supabase SQL Editor to see why the functions aren't finding your profile

-- Check what auth.uid() returns
SELECT auth.uid() as current_auth_user_id;

-- Check your profile with all possible matching fields
SELECT 
  id as profile_id,
  auth_user_id,
  email,
  app_role,
  app_role::TEXT as app_role_text,
  company_id,
  position_title,
  -- Check if any of these match auth.uid()
  (id = auth.uid()) as id_matches_auth_uid,
  (auth_user_id = auth.uid()) as auth_user_id_matches_auth_uid,
  (id = auth.uid() OR auth_user_id = auth.uid()) as either_matches
FROM profiles
WHERE email = 'bruce@e-a-g.co'
   OR id = auth.uid()
   OR auth_user_id = auth.uid();

-- Check what get_user_company_id() is actually doing
-- Let's see the function definition
SELECT 
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'get_user_company_id';

-- Test the function manually with your email
SELECT 
  company_id,
  id,
  auth_user_id,
  email
FROM profiles
WHERE email = 'bruce@e-a-g.co'
LIMIT 1;

-- Check if app_role is set correctly
SELECT 
  id,
  email,
  app_role,
  app_role::TEXT as app_role_text,
  LOWER(app_role::TEXT) as app_role_lowercase,
  CASE 
    WHEN LOWER(app_role::TEXT) IN ('admin', 'manager', 'owner', 'general_manager') OR
         app_role::TEXT IN ('Admin', 'Manager', 'Owner', 'General Manager', 'General_Manager')
    THEN TRUE
    ELSE FALSE
  END as should_be_admin
FROM profiles
WHERE email = 'bruce@e-a-g.co';










