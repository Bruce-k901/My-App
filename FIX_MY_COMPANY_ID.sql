-- ============================================================================
-- Fix Your Company ID
-- Run this in Supabase SQL Editor to fix your profile's company_id
-- ============================================================================

-- Step 1: Check your current profile (using RPC to bypass RLS)
SELECT * FROM get_own_profile();

-- Alternative: Direct query (may be blocked by RLS)
-- SELECT 
--   id,
--   full_name,
--   email,
--   company_id,
--   status,
--   created_at
-- FROM profiles
-- WHERE id = auth.uid();

-- Step 2: Find available companies
SELECT 
  id,
  name,
  created_at
FROM companies
ORDER BY created_at DESC
LIMIT 10;

-- Step 3: Fix your company_id
-- Replace 'YOUR_COMPANY_UUID_HERE' with the UUID from Step 2
-- Example: SELECT fix_user_company_id(auth.uid(), 'f99510bc-b290-47c6-8f12-282bea67bd91');

-- Option A: Use the helper function (recommended)
-- SELECT fix_user_company_id(auth.uid(), 'YOUR_COMPANY_UUID_HERE');

-- Option B: Direct update (if you're sure)
-- UPDATE profiles 
-- SET company_id = 'YOUR_COMPANY_UUID_HERE', updated_at = NOW()
-- WHERE id = auth.uid();

-- Step 4: Verify the fix
SELECT 
  id,
  full_name,
  email,
  company_id,
  status
FROM profiles
WHERE id = auth.uid();

-- Step 5: Test the RPC function
SELECT * FROM get_company_profiles(
  (SELECT company_id FROM profiles WHERE id = auth.uid() LIMIT 1)
);

