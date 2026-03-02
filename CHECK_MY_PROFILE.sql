-- ============================================================================
-- Quick Diagnostic: Check Your Profile and Company Link
-- Run this in Supabase SQL Editor to check if your profile is linked to a company
-- ============================================================================

-- Check your profile status
SELECT 
  id,
  full_name,
  email,
  company_id,
  app_role,
  status,
  created_at,
  updated_at
FROM profiles
WHERE id = auth.uid();

-- Check if your company_id exists in companies table
SELECT 
  p.id as profile_id,
  p.full_name,
  p.email,
  p.company_id,
  c.id as company_exists,
  c.name as company_name
FROM profiles p
LEFT JOIN companies c ON c.id = p.company_id
WHERE p.id = auth.uid();

-- If company_id is NULL, you can fix it by running:
-- UPDATE profiles SET company_id = 'YOUR_COMPANY_UUID_HERE' WHERE id = auth.uid();
-- 
-- To find your company UUID, run:
-- SELECT id, name FROM companies LIMIT 10;

