-- Fix profiles_select_company policy to allow managers to see all company profiles
-- This is critical for the leave_balances query to work with nested selects

-- Step 1: Drop the existing policy
DROP POLICY IF EXISTS profiles_select_company ON public.profiles;

-- Step 2: Test the helper function first
SELECT 
  'Test helper function' as step,
  public.get_user_company_id_safe() as company_id,
  public.is_user_manager_or_above_safe() as is_manager;

-- Step 3: Create a more explicit policy that definitely works
-- IMPORTANT: We need to check if user is manager FIRST, then check company_id
-- This avoids calling the function multiple times and ensures it works
CREATE POLICY profiles_select_company
  ON public.profiles
  FOR SELECT
  USING (
    -- User must be a manager or above
    public.is_user_manager_or_above_safe() = true
    -- AND the profile's company_id must match the user's company_id
    AND company_id = public.get_user_company_id_safe()
    -- AND user must have a company_id
    AND public.get_user_company_id_safe() IS NOT NULL
  );

-- Step 4: Verify the policy was created
SELECT 
  'Policy created' as step,
  policyname,
  cmd,
  qual as using_clause
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'profiles'
AND policyname = 'profiles_select_company';

-- Step 5: Test if we can now see company profiles
SELECT 
  'Test: Can see company profiles?' as step,
  COUNT(*) as visible_profiles,
  ARRAY_AGG(id ORDER BY id) as profile_ids
FROM profiles
WHERE company_id = public.get_user_company_id_safe();

-- Step 6: Test the nested select scenario (simulating what Supabase does)
-- This should return multiple rows if the policy works
SELECT 
  'Test: Nested select scenario' as step,
  lb.id as balance_id,
  lb.profile_id,
  p.id as profile_id_from_join,
  p.full_name,
  p.email
FROM leave_balances lb
LEFT JOIN profiles p ON p.id = lb.profile_id
WHERE lb.company_id = public.get_user_company_id_safe()
AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
LIMIT 10;

