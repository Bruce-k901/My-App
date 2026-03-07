-- TEMPORARY FIX: Allow all users to see profiles in their company
-- We'll rely on leave_balances RLS to restrict access to balances
-- This is a pragmatic solution to get things working

-- Step 1: Drop the complex policy
DROP POLICY IF EXISTS profiles_select_company ON public.profiles;

-- Step 2: Create a simple policy that just checks company_id match
-- This uses a subquery but should work because it's checking the user's own profile
CREATE POLICY profiles_select_company
  ON public.profiles
  FOR SELECT
  USING (
    -- Profile must be in the same company as the user
    -- We check the user's own profile (which they can always see via profiles_select_own)
    company_id = (
      SELECT p.company_id 
      FROM public.profiles p
      WHERE p.id = auth.uid() OR p.auth_user_id = auth.uid()
      LIMIT 1
    )
  );

-- Step 3: Test
SELECT 
  'Test: Company profiles' as step,
  COUNT(*) as visible_profiles
FROM profiles
WHERE company_id = (
  SELECT company_id FROM profiles WHERE id = auth.uid() OR auth_user_id = auth.uid() LIMIT 1
);










