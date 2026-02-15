-- Debug query to check staff member status and rota-related fields
-- Run this to see what's preventing a staff member from appearing in the rota

-- Replace 'STAFF_MEMBER_ID' with the actual staff member's ID
-- Replace 'COMPANY_ID' with the company ID

-- Check the staff member's profile data
SELECT 
  id,
  full_name,
  email,
  status,
  home_site,
  company_id,
  app_role,
  created_at
FROM profiles
WHERE id = 'STAFF_MEMBER_ID'  -- Replace with actual ID
  AND company_id = 'COMPANY_ID';  -- Replace with actual company ID

-- Check if they appear in get_company_profiles RPC
SELECT * FROM get_company_profiles('COMPANY_ID')  -- Replace with actual company ID
WHERE profile_id = 'STAFF_MEMBER_ID';  -- Replace with actual ID

-- Check all active staff for the company
SELECT 
  profile_id,
  full_name,
  status,
  home_site
FROM get_company_profiles('COMPANY_ID')  -- Replace with actual company ID
ORDER BY full_name;

-- Check sites available
SELECT id, name 
FROM sites 
WHERE company_id = 'COMPANY_ID'  -- Replace with actual company ID
ORDER BY name;


