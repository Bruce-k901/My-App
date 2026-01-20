-- Quick check of helper functions
-- Run this to see if functions are working

-- Check your profile
SELECT 
  id,
  auth_user_id,
  email,
  app_role,
  company_id,
  CASE 
    WHEN id = auth.uid() THEN 'id matches'
    WHEN auth_user_id = auth.uid() THEN 'auth_user_id matches'
    ELSE 'no match'
  END as match_type
FROM profiles
WHERE id = auth.uid() OR auth_user_id = auth.uid();

-- Test helper functions
SELECT 
  public.get_user_company_id_safe() as company_id,
  public.is_user_manager_or_above() as is_manager,
  auth.uid() as auth_uid;

-- Check if there are other employees in your company
SELECT 
  COUNT(*) as total_profiles_in_company,
  string_agg(email, ', ') as employee_emails
FROM profiles
WHERE company_id = public.get_user_company_id_safe();

-- Check if there are other leave balances
SELECT 
  COUNT(*) as total_balances,
  COUNT(DISTINCT profile_id) as unique_employees
FROM leave_balances
WHERE company_id = public.get_user_company_id_safe();

