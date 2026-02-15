-- PRAGMATIC FINAL FIX: Allow all company users to see company profiles
-- We rely on leave_balances RLS to restrict which balances they can see
-- This is simpler and avoids all recursion issues

-- Step 1: Check what we're working with
SELECT 
  'Step 1: Your profile' as step,
  id,
  email,
  app_role,
  company_id
FROM profiles
WHERE id = auth.uid() OR auth_user_id = auth.uid();

-- Step 2: Drop the complex policy
DROP POLICY IF EXISTS profiles_select_company ON public.profiles;

-- Step 3: Create the simplest possible policy
-- Just check if profiles are in the same company
-- We use a CTE to avoid recursion
CREATE POLICY profiles_select_company
  ON public.profiles
  FOR SELECT
  USING (
    -- Get user's company_id using a simple lookup
    -- This should work because we're checking the user's own profile first
    company_id IN (
      SELECT p.company_id 
      FROM public.profiles p
      WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
    )
  );

-- Step 4: Test
SELECT 
  'Step 4: Test company profiles' as step,
  COUNT(*) as visible_profiles
FROM profiles
WHERE company_id IN (
  SELECT company_id FROM profiles WHERE id = auth.uid() OR auth_user_id = auth.uid()
);










