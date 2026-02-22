-- Diagnose why view returns 0 rows when data exists
-- Run this to see where the JOIN is failing

-- Step 1: Check if leave_balances has data
SELECT 
  'Step 1: leave_balances table' as test,
  COUNT(*) as total_rows,
  COUNT(DISTINCT company_id) as unique_companies,
  COUNT(DISTINCT profile_id) as unique_employees,
  MIN(year) as min_year,
  MAX(year) as max_year
FROM leave_balances;

-- Step 2: Check if leave_balances has data for your company
SELECT 
  'Step 2: leave_balances for your company' as test,
  COUNT(*) as total_rows,
  COUNT(DISTINCT profile_id) as unique_employees,
  MIN(year) as min_year,
  MAX(year) as max_year
FROM leave_balances
WHERE company_id = public.get_user_company_id_safe();

-- Step 3: Check if leave_balances has data for current year
SELECT 
  'Step 3: leave_balances for current year' as test,
  COUNT(*) as total_rows,
  COUNT(DISTINCT profile_id) as unique_employees
FROM leave_balances
WHERE company_id = public.get_user_company_id_safe()
  AND year = EXTRACT(YEAR FROM CURRENT_DATE);

-- Step 4: Check if profiles JOIN works
SELECT 
  'Step 4: leave_balances JOIN profiles' as test,
  COUNT(*) as joined_rows
FROM leave_balances lb
JOIN profiles p ON p.id = lb.profile_id
WHERE lb.company_id = public.get_user_company_id_safe()
  AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE);

-- Step 5: Check if leave_types JOIN works
SELECT 
  'Step 5: leave_balances JOIN profiles JOIN leave_types' as test,
  COUNT(*) as joined_rows
FROM leave_balances lb
JOIN profiles p ON p.id = lb.profile_id
JOIN leave_types lt ON lt.id = lb.leave_type_id
WHERE lb.company_id = public.get_user_company_id_safe()
  AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE);

-- Step 6: Check if profiles are accessible
SELECT 
  'Step 6: Profiles accessible' as test,
  COUNT(*) as accessible_profiles
FROM profiles
WHERE company_id = public.get_user_company_id_safe();

-- Step 7: Check if leave_types are accessible
SELECT 
  'Step 7: Leave types accessible' as test,
  COUNT(*) as accessible_types
FROM leave_types
WHERE company_id = public.get_user_company_id_safe()
   OR company_id IS NULL;

-- Step 8: Show sample leave_balances data
SELECT 
  'Step 8: Sample leave_balances' as test,
  lb.id,
  lb.company_id,
  lb.profile_id,
  lb.leave_type_id,
  lb.year,
  lb.entitled_days
FROM leave_balances lb
WHERE lb.company_id = public.get_user_company_id_safe()
LIMIT 5;

-- Step 9: Check if profiles exist for those profile_ids
SELECT 
  'Step 9: Profiles for leave_balances' as test,
  COUNT(*) as matching_profiles
FROM leave_balances lb
JOIN profiles p ON p.id = lb.profile_id
WHERE lb.company_id = public.get_user_company_id_safe()
  AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE);

-- Step 10: Check if leave_types exist for those leave_type_ids
SELECT 
  'Step 10: Leave types for leave_balances' as test,
  COUNT(*) as matching_types
FROM leave_balances lb
JOIN leave_types lt ON lt.id = lb.leave_type_id
WHERE lb.company_id = public.get_user_company_id_safe()
  AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE);

