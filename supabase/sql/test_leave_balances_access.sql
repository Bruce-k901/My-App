-- Test query to check RLS policies
-- Run this as the logged-in user to see what they can access

-- Check current user's profile
SELECT 
  id,
  auth_user_id,
  email,
  app_role,
  company_id
FROM profiles
WHERE id = auth.uid() OR auth_user_id = auth.uid();

-- Check what leave balances exist in the company
SELECT 
  lb.id,
  lb.profile_id,
  lb.company_id,
  p.full_name,
  p.email,
  p.app_role
FROM leave_balances lb
JOIN profiles p ON p.id = lb.profile_id
WHERE lb.company_id = (
  SELECT company_id FROM profiles WHERE id = auth.uid() OR auth_user_id = auth.uid() LIMIT 1
);

-- Test the view
SELECT 
  profile_id,
  full_name,
  email,
  company_id
FROM leave_balances_enhanced_view
LIMIT 10;

