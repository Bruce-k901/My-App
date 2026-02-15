-- Direct test queries to debug leave balances access
-- Run these as your logged-in user

-- 1. Check your profile and role
SELECT 
  id,
  email,
  app_role,
  company_id,
  CASE 
    WHEN id = auth.uid() THEN 'id matches auth.uid()'
    WHEN auth_user_id = auth.uid() THEN 'auth_user_id matches auth.uid()'
    ELSE 'no match'
  END as auth_match
FROM profiles
WHERE id = auth.uid() OR auth_user_id = auth.uid();

-- 2. Test helper functions
SELECT 
  public.get_user_company_id_safe() as my_company_id,
  public.is_user_manager_or_above() as is_manager;

-- 3. Check what leave balances exist in your company
SELECT COUNT(*) as total_balances_in_company
FROM leave_balances
WHERE company_id = public.get_user_company_id_safe();

-- 4. Test the manager policy directly
SELECT 
  lb.id,
  lb.profile_id,
  p.full_name,
  p.email,
  p.app_role as employee_role
FROM leave_balances lb
JOIN profiles p ON p.id = lb.profile_id
WHERE lb.company_id = public.get_user_company_id_safe()
  AND public.is_user_manager_or_above() = TRUE
LIMIT 10;

-- 5. Test the view directly
SELECT 
  profile_id,
  full_name,
  email,
  company_id,
  employee_type
FROM leave_balances_enhanced_view
LIMIT 10;

-- 6. Check profiles accessible via RLS
SELECT COUNT(*) as accessible_profiles
FROM profiles
WHERE company_id = public.get_user_company_id_safe();

