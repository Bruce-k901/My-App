-- Test the function directly to see what it returns

-- Step 1: Check auth context
SELECT 
  'Step 1: Auth' as step,
  auth.uid() as user_id;

-- Step 2: Check own profile (bypassing RLS)
SET LOCAL role = 'postgres';
SELECT 
  'Step 2: Your profile (bypassing RLS)' as step,
  id,
  email,
  app_role,
  company_id,
  LOWER(COALESCE(app_role::TEXT, '')) IN ('admin', 'owner', 'manager') as is_manager
FROM profiles
WHERE id = auth.uid() OR auth_user_id = auth.uid();
RESET role;

-- Step 3: Test the function
SELECT 
  'Step 3: Function result' as step,
  public.get_company_profile_ids() as profile_ids,
  array_length(public.get_company_profile_ids(), 1) as count;

-- Step 4: Manually check what profiles exist in your company
SET LOCAL role = 'postgres';
SELECT 
  'Step 4: All profiles in company (bypassing RLS)' as step,
  COUNT(*) as total,
  ARRAY_AGG(id ORDER BY id) as all_ids
FROM profiles
WHERE company_id = (
  SELECT company_id FROM profiles WHERE id = auth.uid() OR auth_user_id = auth.uid() LIMIT 1
);
RESET role;

-- Step 5: Test if ANY() works with the function result
SELECT 
  'Step 5: Test ANY() condition' as step,
  p.id,
  p.email,
  (p.id = ANY(public.get_company_profile_ids())) as matches_policy
FROM profiles p
WHERE p.id = auth.uid() OR p.auth_user_id = auth.uid();

-- Step 6: Check what RLS allows
SELECT 
  'Step 6: RLS result' as step,
  COUNT(*) as visible_profiles
FROM profiles
WHERE id = ANY(public.get_company_profile_ids());
