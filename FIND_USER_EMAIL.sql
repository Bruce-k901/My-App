-- Quick script to find a user's email
-- Use this to find the email before running CHECK_USER_PROFILE_AND_ACCESS.sql

-- Show all users with their emails
SELECT 
  email,
  full_name,
  company_id,
  app_role,
  status,
  created_at
FROM public.profiles
ORDER BY created_at DESC
LIMIT 50;

-- Or search by partial email/name
-- Uncomment and modify:
/*
SELECT 
  email,
  full_name,
  company_id,
  app_role
FROM public.profiles
WHERE 
  email ILIKE '%search_term%'
  OR full_name ILIKE '%search_term%'
ORDER BY created_at DESC;
*/
