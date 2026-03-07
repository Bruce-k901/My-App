-- Comprehensive diagnostic to find why managers can't see employees
-- Run this as your logged-in user

-- Step 1: Check your auth user ID
SELECT 
  auth.uid() as current_auth_uid,
  'Check if this matches your profile' as note;

-- Step 2: Check your profile - see how it's linked
SELECT 
  id as profile_id,
  auth_user_id,
  email,
  app_role,
  company_id,
  CASE 
    WHEN id = auth.uid() THEN '✅ id matches auth.uid()'
    WHEN auth_user_id = auth.uid() THEN '✅ auth_user_id matches auth.uid()'
    ELSE '❌ NO MATCH - This is the problem!'
  END as auth_match_status
FROM profiles
WHERE id = auth.uid() OR auth_user_id = auth.uid();

-- Step 3: Test helper functions
SELECT 
  public.get_user_company_id_safe() as my_company_id,
  public.is_user_manager_or_above() as is_manager,
  CASE 
    WHEN public.get_user_company_id_safe() IS NULL THEN '❌ Company ID is NULL'
    ELSE '✅ Company ID found'
  END as company_status,
  CASE 
    WHEN public.is_user_manager_or_above() = TRUE THEN '✅ You are a manager'
    ELSE '❌ You are NOT a manager'
  END as manager_status;

-- Step 4: Check if leave_balances exist at all
SELECT 
  COUNT(*) as total_leave_balances,
  COUNT(DISTINCT profile_id) as unique_employees_with_balances,
  COUNT(DISTINCT company_id) as unique_companies
FROM leave_balances;

-- Step 5: Check leave_balances in your company
SELECT 
  COUNT(*) as balances_in_my_company
FROM leave_balances
WHERE company_id = public.get_user_company_id_safe();

-- Step 6: Check what profiles exist in your company
SELECT 
  COUNT(*) as profiles_in_my_company,
  COUNT(CASE WHEN LOWER(COALESCE(app_role::TEXT, '')) IN ('admin', 'owner', 'manager') THEN 1 END) as managers_in_company
FROM profiles
WHERE company_id = public.get_user_company_id_safe();

-- Step 7: Test if you can see profiles via RLS
SELECT 
  COUNT(*) as accessible_profiles_via_rls
FROM profiles;

-- Step 8: Test if you can see leave_balances via RLS
SELECT 
  COUNT(*) as accessible_balances_via_rls
FROM leave_balances;

-- Step 9: Try direct query with your company_id
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
  SELECT company_id FROM profiles 
  WHERE id = auth.uid() OR auth_user_id = auth.uid() 
  LIMIT 1
)
LIMIT 10;

-- Step 10: Test the view
SELECT 
  COUNT(*) as rows_from_view
FROM leave_balances_enhanced_view;

