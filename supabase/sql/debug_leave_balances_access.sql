-- Debug script to check why managers can't see all employees
-- Run this as the logged-in manager/admin user

-- 1. Check current user's profile
SELECT 
  id,
  auth_user_id,
  email,
  app_role,
  company_id
FROM profiles
WHERE id = auth.uid() OR auth_user_id = auth.uid();

-- 2. Check what leave balances exist in the company
SELECT 
  lb.id,
  lb.profile_id,
  lb.company_id,
  p.full_name,
  p.email,
  p.app_role as employee_role
FROM leave_balances lb
JOIN profiles p ON p.id = lb.profile_id
WHERE lb.company_id = (
  SELECT company_id FROM profiles 
  WHERE id = auth.uid() OR auth_user_id = auth.uid() 
  LIMIT 1
)
LIMIT 20;

-- 3. Test the view directly
SELECT 
  profile_id,
  full_name,
  email,
  company_id,
  employee_type
FROM leave_balances_enhanced_view
LIMIT 20;

-- 4. Check if helper function works
SELECT public.get_user_company_id_safe() as my_company_id;

-- 5. Check profiles RLS - see what profiles are accessible
SELECT 
  id,
  email,
  full_name,
  app_role,
  company_id
FROM profiles
LIMIT 20;

-- 6. Test the manager policy logic
SELECT 
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
      AND p.company_id = (SELECT company_id FROM profiles WHERE id = auth.uid() OR auth_user_id = auth.uid() LIMIT 1)
      AND LOWER(COALESCE(p.app_role::TEXT, '')) IN ('admin', 'owner', 'manager')
  ) as is_manager_in_company;

