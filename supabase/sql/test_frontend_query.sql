-- Test the exact query the frontend makes
-- This simulates what the frontend sees

-- Step 1: Check if helper functions work
SELECT 
  'Helper Functions' as test,
  public.get_user_company_id_safe() as company_id,
  public.is_user_manager_or_above() as is_manager;

-- Step 2: Test direct query to leave_balances (what RLS allows)
SELECT 
  'Direct leave_balances query' as test,
  COUNT(*) as count,
  COUNT(DISTINCT profile_id) as unique_employees
FROM leave_balances;

-- Step 3: Test query to profiles (what RLS allows)
SELECT 
  'Direct profiles query' as test,
  COUNT(*) as count,
  COUNT(DISTINCT company_id) as unique_companies
FROM profiles;

-- Step 4: Test the view query (what frontend uses)
SELECT 
  'View query (frontend simulation)' as test,
  COUNT(*) as count,
  COUNT(DISTINCT profile_id) as unique_employees
FROM leave_balances_enhanced_view;

-- Step 5: Test with company_id filter (what frontend does)
SELECT 
  'View with company_id filter' as test,
  COUNT(*) as count,
  COUNT(DISTINCT profile_id) as unique_employees
FROM leave_balances_enhanced_view
WHERE company_id = public.get_user_company_id_safe();

-- Step 6: Test with year filter (what frontend does)
SELECT 
  'View with company_id and year filter' as test,
  COUNT(*) as count,
  COUNT(DISTINCT profile_id) as unique_employees
FROM leave_balances_enhanced_view
WHERE company_id = public.get_user_company_id_safe()
  AND year = EXTRACT(YEAR FROM CURRENT_DATE);

-- Step 7: Show sample data (if any)
SELECT 
  'Sample data' as test,
  profile_id,
  full_name,
  company_id,
  year,
  entitled_days
FROM leave_balances_enhanced_view
WHERE company_id = public.get_user_company_id_safe()
LIMIT 5;

-- Step 8: Check if profiles join is working
SELECT 
  'Profiles join test' as test,
  COUNT(*) as profiles_accessible,
  COUNT(DISTINCT company_id) as companies_accessible
FROM profiles
WHERE company_id = public.get_user_company_id_safe();

-- Step 9: Check if leave_types join is working
SELECT 
  'Leave types join test' as test,
  COUNT(*) as leave_types_accessible
FROM leave_types
WHERE company_id = public.get_user_company_id_safe()
   OR company_id IS NULL;

