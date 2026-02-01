-- Test leave_balances RLS policies
-- This script helps diagnose why managers aren't seeing all company balances

-- Test 1: Check if helper functions work
SELECT 
  'Test 1: Helper Functions' as test,
  public.get_user_company_id_safe() as company_id,
  public.get_user_app_role_safe() as app_role,
  public.is_user_manager_or_above_safe() as is_manager;

-- Test 2: Check how many leave_balances exist for the company
SELECT 
  'Test 2: Total balances in company' as test,
  COUNT(*) as total_balances,
  COUNT(DISTINCT profile_id) as unique_employees
FROM leave_balances
WHERE company_id = public.get_user_company_id_safe()
AND year = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;

-- Test 3: Check what RLS allows us to see
SELECT 
  'Test 3: What RLS allows' as test,
  COUNT(*) as visible_balances,
  COUNT(DISTINCT profile_id) as visible_employees,
  ARRAY_AGG(DISTINCT profile_id) as profile_ids
FROM leave_balances
WHERE company_id = public.get_user_company_id_safe()
AND year = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;

-- Test 4: Check if profiles JOIN works
SELECT 
  'Test 4: Profiles JOIN' as test,
  COUNT(*) as joined_rows
FROM leave_balances lb
LEFT JOIN profiles p ON p.id = lb.profile_id
WHERE lb.company_id = public.get_user_company_id_safe()
AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;

-- Test 5: Check current user's profile
SELECT 
  'Test 5: Current user profile' as test,
  id,
  email,
  full_name,
  app_role,
  company_id
FROM profiles
WHERE id = auth.uid() OR auth_user_id = auth.uid();

-- Test 6: Check all profiles in company (bypassing RLS with function)
SELECT 
  'Test 6: All profiles in company (via function)' as test,
  COUNT(*) as total_profiles
FROM profiles
WHERE company_id = public.get_user_company_id_safe();

-- Test 7: Check what profiles RLS allows us to see
SELECT 
  'Test 7: Profiles visible via RLS' as test,
  COUNT(*) as visible_profiles,
  ARRAY_AGG(id) as profile_ids
FROM profiles
WHERE company_id = public.get_user_company_id_safe();

