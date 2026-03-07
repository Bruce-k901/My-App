-- COMPREHENSIVE DIAGNOSTIC: Find out EXACTLY why profiles_select_company isn't working

-- Step 1: Check auth context
SELECT 
  'Step 1: Auth context' as step,
  auth.uid() as user_id,
  CASE WHEN auth.uid() IS NULL THEN 'NULL - No auth context!' ELSE 'OK' END as auth_status;

-- Step 2: Check if we can see our own profile (this MUST work)
SELECT 
  'Step 2: Own profile count' as step,
  COUNT(*) as visible
FROM profiles
WHERE id = auth.uid() OR auth_user_id = auth.uid();

-- Step 2b: Show own profile data
SELECT 
  'Step 2b: Own profile data' as step,
  id,
  email,
  app_role,
  company_id
FROM profiles
WHERE id = auth.uid() OR auth_user_id = auth.uid();

-- Step 3: Check what the function returns
SELECT 
  'Step 3: Function result' as step,
  public.get_company_profile_ids() as profile_ids,
  array_length(public.get_company_profile_ids(), 1) as count,
  CASE 
    WHEN array_length(public.get_company_profile_ids(), 1) IS NULL THEN 'NULL array'
    WHEN array_length(public.get_company_profile_ids(), 1) = 0 THEN 'Empty array'
    ELSE 'Has IDs'
  END as array_status;

-- Step 4: Manually test what the function does internally
-- (Simulate what the function should return)
SET LOCAL role = 'postgres';
SELECT 
  'Step 4: Manual function simulation (bypassing RLS)' as step,
  p.id as user_id,
  p.company_id,
  p.app_role,
  LOWER(COALESCE(p.app_role::TEXT, '')) IN ('admin', 'owner', 'manager') as is_manager_check,
  (SELECT COUNT(*) FROM profiles WHERE company_id = p.company_id) as total_profiles_in_company,
  (SELECT ARRAY_AGG(id) FROM profiles WHERE company_id = p.company_id) as expected_profile_ids
FROM profiles p
WHERE p.id = auth.uid() OR p.auth_user_id = auth.uid();
RESET role;

-- Step 5: Test the policy condition directly
-- Check if ANY profile would match the policy
SELECT 
  'Step 5: Policy condition test' as step,
  p.id,
  p.email,
  p.company_id,
  (p.id = ANY(public.get_company_profile_ids())) as policy_matches,
  public.get_company_profile_ids() as function_result
FROM profiles p
WHERE p.company_id = (
  SELECT company_id FROM profiles WHERE id = auth.uid() OR auth_user_id = auth.uid() LIMIT 1
)
LIMIT 5;

-- Step 6: Check what RLS actually allows
SELECT 
  'Step 6: What RLS allows' as step,
  COUNT(*) as visible_profiles
FROM profiles
WHERE id = ANY(public.get_company_profile_ids());

-- Step 7: Check existing policies
SELECT 
  'Step 7: Existing policies' as step,
  policyname,
  cmd,
  qual as using_clause
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'profiles'
ORDER BY policyname;

