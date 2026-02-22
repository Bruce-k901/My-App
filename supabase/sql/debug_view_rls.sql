-- Debug: Check what's blocking the view
-- Run this while logged in as your user in the app

-- Step 1: Check your profile and role
SELECT 
  id,
  email,
  full_name,
  app_role,
  company_id,
  CASE 
    WHEN id = auth.uid() THEN '✅ id matches'
    WHEN auth_user_id = auth.uid() THEN '✅ auth_user_id matches'
    ELSE '❌ NO MATCH'
  END as match_status
FROM profiles
WHERE id = auth.uid() OR auth_user_id = auth.uid();

-- Step 2: Check helper functions
SELECT 
  public.get_user_company_id_safe() as company_id,
  public.is_user_manager_or_above() as is_manager;

-- Step 3: Check if you can see leave_balances directly
SELECT 
  COUNT(*) as leave_balances_count,
  COUNT(DISTINCT profile_id) as unique_employees
FROM leave_balances
WHERE company_id = public.get_user_company_id_safe();

-- Step 4: Check if you can see profiles in your company
SELECT 
  COUNT(*) as profiles_count,
  COUNT(DISTINCT id) as unique_profiles
FROM profiles
WHERE company_id = public.get_user_company_id_safe();

-- Step 5: Check if you can see leave_types
SELECT 
  COUNT(*) as leave_types_count
FROM leave_types
WHERE company_id = public.get_user_company_id_safe()
   OR company_id IS NULL;

-- Step 6: Try the view query (this is what frontend does)
SELECT 
  COUNT(*) as view_count,
  COUNT(DISTINCT profile_id) as unique_employees_in_view
FROM leave_balances_enhanced_view
WHERE company_id = public.get_user_company_id_safe()
  AND year = EXTRACT(YEAR FROM CURRENT_DATE);

-- Step 7: Show sample from view
SELECT 
  profile_id,
  full_name,
  company_id,
  year,
  entitled_days,
  employee_type
FROM leave_balances_enhanced_view
WHERE company_id = public.get_user_company_id_safe()
  AND year = EXTRACT(YEAR FROM CURRENT_DATE)
LIMIT 5;

-- Step 8: Check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd as command,
  qual as using_expression
FROM pg_policies
WHERE tablename IN ('leave_balances', 'profiles', 'leave_types')
ORDER BY tablename, policyname;

