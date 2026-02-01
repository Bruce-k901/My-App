-- Quick test of helper functions
-- This will tell us if the functions are working correctly

SELECT 
  'Helper Functions Test' as test,
  public.get_user_company_id_safe() as company_id,
  public.get_user_app_role_safe() as app_role,
  public.is_user_manager_or_above_safe() as is_manager;

-- Also test if we can see our own profile
SELECT 
  'Own Profile Test' as test,
  id,
  email,
  full_name,
  app_role,
  company_id
FROM profiles
WHERE id = auth.uid() OR auth_user_id = auth.uid();

-- Test the policy condition step by step
SELECT 
  'Policy Condition Test' as test,
  p.id,
  p.email,
  p.company_id as profile_company_id,
  public.get_user_company_id_safe() as user_company_id,
  public.is_user_manager_or_above_safe() as is_manager_result,
  (public.is_user_manager_or_above_safe() = true) as manager_check,
  (p.company_id = public.get_user_company_id_safe()) as company_match,
  (public.get_user_company_id_safe() IS NOT NULL) as has_company_id
FROM profiles p
WHERE p.company_id = public.get_user_company_id_safe()
LIMIT 5;

