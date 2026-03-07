-- Test INSERT into staff_availability_patterns
-- This simulates what happens when a staff member tries to save their availability
-- Run this as the actual user (not in SQL Editor - use the Supabase client or API)

-- First, check what auth.uid() returns
SELECT auth.uid() as current_user_id;

-- Check if your profile exists and matches auth.uid()
SELECT 
  id,
  company_id,
  auth_user_id,
  CASE WHEN id = auth.uid() THEN '✅ ID matches auth.uid()' ELSE '❌ ID does not match' END as id_match,
  CASE WHEN auth_user_id = auth.uid() THEN '✅ auth_user_id matches' ELSE '❌ auth_user_id does not match or is NULL' END as auth_user_id_match
FROM profiles
WHERE id = auth.uid() OR auth_user_id = auth.uid()
LIMIT 1;

-- Try to test the policy by checking if you can "see" yourself
-- This should return 1 row if the policy works
SELECT COUNT(*) as can_see_own_profile
FROM profiles
WHERE id IN (SELECT id FROM profiles WHERE id = auth.uid());

-- Test the INSERT policy check manually
-- This shows what the WITH CHECK clause evaluates to
SELECT 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid()
  ) as profile_id_check,
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid()
    AND company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  ) as company_id_check;

