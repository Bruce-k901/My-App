-- Comprehensive diagnostic for profiles_select_company policy
-- This will help us understand why the policy isn't matching

-- Step 1: Check helper functions
SELECT 
  'Step 1: Helper Functions' as step,
  public.get_user_company_id_safe() as company_id,
  public.get_user_app_role_safe() as app_role,
  public.is_user_manager_or_above_safe() as is_manager,
  LOWER(public.get_user_app_role_safe()) as app_role_lower,
  LOWER(public.get_user_app_role_safe()) IN ('admin', 'owner', 'manager') as role_check;

-- Step 2: Check current user's profile directly (bypassing RLS)
SET LOCAL role = 'postgres';
SELECT 
  'Step 2: Current user profile (bypassing RLS)' as step,
  id,
  email,
  full_name,
  app_role,
  company_id,
  auth_user_id
FROM profiles
WHERE id = auth.uid() OR auth_user_id = auth.uid();
RESET role;

-- Step 3: Check total profiles in company (bypassing RLS)
SET LOCAL role = 'postgres';
SELECT 
  'Step 3: Total profiles in company (bypassing RLS)' as step,
  COUNT(*) as total_profiles,
  ARRAY_AGG(id ORDER BY id) as all_profile_ids
FROM profiles
WHERE company_id = (
  SELECT company_id FROM profiles WHERE id = auth.uid() OR auth_user_id = auth.uid() LIMIT 1
);
RESET role;

-- Step 4: Test the policy condition manually
SELECT 
  'Step 4: Test policy condition' as step,
  p.id,
  p.email,
  p.company_id,
  public.get_user_company_id_safe() as user_company_id,
  public.is_user_manager_or_above_safe() as is_manager_check,
  (public.is_user_manager_or_above_safe() = true) as manager_check_passes,
  (p.company_id = public.get_user_company_id_safe()) as company_match,
  (public.get_user_company_id_safe() IS NOT NULL) as has_company_id,
  -- Combined condition
  (
    public.is_user_manager_or_above_safe() = true
    AND p.company_id = public.get_user_company_id_safe()
    AND public.get_user_company_id_safe() IS NOT NULL
  ) as policy_should_match
FROM profiles p
WHERE p.company_id = public.get_user_company_id_safe()
LIMIT 10;

-- Step 5: Check what RLS actually allows
SELECT 
  'Step 5: What RLS allows' as step,
  COUNT(*) as visible_profiles,
  ARRAY_AGG(id ORDER BY id) as visible_profile_ids
FROM profiles
WHERE company_id = public.get_user_company_id_safe();

-- Step 6: Check existing policies
SELECT 
  'Step 6: Existing policies' as step,
  policyname,
  cmd,
  qual as using_clause
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'profiles'
ORDER BY policyname;

