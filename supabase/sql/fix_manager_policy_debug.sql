-- Debug and fix manager policy for leave_balances
-- The issue is that managers aren't seeing all company balances

-- Step 1: Check if the helper function recognizes Owner role
SELECT 
  'Step 1: Check helper function' as step,
  public.get_user_app_role_safe() as app_role,
  public.is_user_manager_or_above_safe() as is_manager,
  LOWER(public.get_user_app_role_safe()) IN ('admin', 'owner', 'manager') as manual_check;

-- Step 2: Check what leave_balances RLS allows
-- This simulates what the frontend query sees
SELECT 
  'Step 2: What RLS allows' as step,
  COUNT(*) as visible_balances,
  COUNT(DISTINCT profile_id) as unique_employees,
  ARRAY_AGG(DISTINCT profile_id ORDER BY profile_id) as profile_ids
FROM leave_balances
WHERE company_id = public.get_user_company_id_safe()
AND year = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;

-- Step 3: Check total balances in company (bypassing RLS)
SET LOCAL role = 'postgres';
SELECT 
  'Step 3: Total balances (bypassing RLS)' as step,
  COUNT(*) as total_balances,
  COUNT(DISTINCT profile_id) as unique_employees
FROM leave_balances
WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid() LIMIT 1)
AND year = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
RESET role;

-- Step 4: Verify the RLS policies exist
SELECT 
  'Step 4: RLS Policies' as step,
  policyname,
  cmd,
  qual as using_clause
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'leave_balances'
ORDER BY policyname;

-- Step 5: Test the manager policy condition directly
SELECT 
  'Step 5: Test manager condition' as step,
  public.get_user_company_id_safe() IS NOT NULL as has_company_id,
  public.get_user_company_id_safe() = company_id as company_matches,
  public.is_user_manager_or_above_safe() as is_manager_check,
  COUNT(*) as matching_rows
FROM leave_balances
WHERE company_id = public.get_user_company_id_safe()
AND year = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
GROUP BY company_id;

