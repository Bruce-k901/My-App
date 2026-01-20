-- ============================================================================
-- Test RPC Function: get_company_profiles
-- Run this in Supabase SQL Editor to test if the function works
-- ============================================================================

-- First, check if the function exists
SELECT 
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'get_company_profiles';

-- Test the function with your company_id
-- Replace 'YOUR_COMPANY_ID' with your actual company_id
-- You can get it by running: SELECT company_id FROM profiles WHERE id = auth.uid();

-- Example test (replace with your company_id):
-- SELECT * FROM get_company_profiles('YOUR_COMPANY_ID_HERE');

-- Or test with your own company_id:
SELECT * FROM get_company_profiles(
  (SELECT company_id FROM profiles WHERE id = auth.uid() LIMIT 1)
);

-- Check your profile's company_id
SELECT id, full_name, email, company_id, status 
FROM profiles 
WHERE id = auth.uid();

-- Check how many profiles exist in your company (if you have one)
SELECT 
  COUNT(*) as total_profiles,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as active_profiles,
  company_id
FROM profiles
WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid() LIMIT 1)
GROUP BY company_id;

-- If your company_id is NULL, find available companies:
SELECT id, name FROM companies LIMIT 10;

-- To fix your company_id, run:
-- UPDATE profiles SET company_id = 'YOUR_COMPANY_UUID_HERE' WHERE id = auth.uid();
-- 
-- Or use the helper function (after running migration 20250311000008):
-- SELECT fix_profile_company(auth.uid(), 'YOUR_COMPANY_UUID_HERE');

