-- Test the view after RLS fix
-- Run this while logged into the app to verify it works

-- Step 1: Verify helper functions
SELECT 
  'Helper Functions' as test,
  public.get_user_company_id_safe() as company_id,
  public.is_user_manager_or_above() as is_manager;

-- Step 2: Test direct table access
SELECT 
  'Direct leave_balances' as test,
  COUNT(*) as count
FROM leave_balances
WHERE company_id = public.get_user_company_id_safe()
  AND year = EXTRACT(YEAR FROM CURRENT_DATE);

-- Step 3: Test profiles access
SELECT 
  'Direct profiles' as test,
  COUNT(*) as count
FROM profiles
WHERE company_id = public.get_user_company_id_safe();

-- Step 4: Test leave_types access
SELECT 
  'Direct leave_types' as test,
  COUNT(*) as count
FROM leave_types
WHERE company_id = public.get_user_company_id_safe()
   OR company_id IS NULL;

-- Step 5: Test the view (this is what frontend uses)
SELECT 
  'View query (frontend)' as test,
  COUNT(*) as total_rows,
  COUNT(DISTINCT profile_id) as unique_employees
FROM leave_balances_enhanced_view
WHERE company_id = public.get_user_company_id_safe()
  AND year = EXTRACT(YEAR FROM CURRENT_DATE);

-- Step 6: Show sample data from view
SELECT 
  profile_id,
  full_name,
  email,
  leave_type_name,
  year,
  entitled_days,
  taken_days,
  pending_days,
  available_days,
  employee_type
FROM leave_balances_enhanced_view
WHERE company_id = public.get_user_company_id_safe()
  AND year = EXTRACT(YEAR FROM CURRENT_DATE)
ORDER BY full_name
LIMIT 10;

