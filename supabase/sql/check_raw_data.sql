-- Check raw data without any RLS or JOINs
-- This will show us what actually exists

-- Step 1: Check your company_id
SELECT 
  'Your company_id' as step,
  public.get_user_company_id_safe() as company_id;

-- Step 2: Check ALL leave_balances (no filters)
SELECT 
  'All leave_balances' as step,
  COUNT(*) as total_count,
  COUNT(DISTINCT company_id) as unique_companies,
  COUNT(DISTINCT profile_id) as unique_employees,
  MIN(year) as min_year,
  MAX(year) as max_year,
  EXTRACT(YEAR FROM CURRENT_DATE) as current_year
FROM leave_balances;

-- Step 3: Check leave_balances for your company (no year filter)
SELECT 
  'leave_balances for your company' as step,
  COUNT(*) as count,
  COUNT(DISTINCT profile_id) as unique_employees,
  MIN(year) as min_year,
  MAX(year) as max_year
FROM leave_balances
WHERE company_id = public.get_user_company_id_safe();

-- Step 4: Check leave_balances for current year (no company filter)
SELECT 
  'leave_balances for current year' as step,
  COUNT(*) as count,
  COUNT(DISTINCT company_id) as unique_companies
FROM leave_balances
WHERE year = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;

-- Step 5: Check leave_balances for your company AND current year
SELECT 
  'leave_balances for your company AND current year' as step,
  COUNT(*) as count,
  COUNT(DISTINCT profile_id) as unique_employees
FROM leave_balances
WHERE company_id = public.get_user_company_id_safe()
  AND year = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;

-- Step 6: Show sample leave_balances
SELECT 
  'Sample leave_balances' as step,
  id,
  company_id,
  profile_id,
  leave_type_id,
  year,
  entitled_days
FROM leave_balances
WHERE company_id = public.get_user_company_id_safe()
ORDER BY year DESC, profile_id
LIMIT 10;

-- Step 7: Check if profiles exist for those profile_ids
SELECT 
  'Profiles for leave_balances' as step,
  COUNT(DISTINCT p.id) as matching_profiles
FROM leave_balances lb
JOIN profiles p ON p.id = lb.profile_id
WHERE lb.company_id = public.get_user_company_id_safe()
  AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;

-- Step 8: Check if leave_types exist for those leave_type_ids
SELECT 
  'Leave types for leave_balances' as step,
  COUNT(DISTINCT lt.id) as matching_types
FROM leave_balances lb
JOIN leave_types lt ON lt.id = lb.leave_type_id
WHERE lb.company_id = public.get_user_company_id_safe()
  AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;

