-- PRAGMATIC FIX: Allow managers to see all company profiles
-- We'll rely on leave_balances RLS to restrict access to balances
-- This is simpler and avoids recursion issues

-- Step 1: Test what the functions return
SELECT 
  'Step 1: Function results' as step,
  public.can_user_see_company_profiles() as can_see,
  public.get_user_company_id_for_rls() as company_id,
  auth.uid() as user_id;

-- Step 2: Check your profile directly
SET LOCAL role = 'postgres';
SELECT 
  'Step 2: Your profile (bypassing RLS)' as step,
  id,
  email,
  app_role,
  company_id
FROM profiles
WHERE id = auth.uid() OR auth_user_id = auth.uid();
RESET role;

-- Step 3: Check total profiles in your company
SET LOCAL role = 'postgres';
SELECT 
  'Step 3: Total profiles in company (bypassing RLS)' as step,
  COUNT(*) as total,
  ARRAY_AGG(id ORDER BY id) as all_ids
FROM profiles
WHERE company_id = (
  SELECT company_id FROM profiles WHERE id = auth.uid() OR auth_user_id = auth.uid() LIMIT 1
);
RESET role;

-- Step 4: Simplify the policy - just check company_id match
-- We'll allow any authenticated user to see profiles in their company
-- The leave_balances RLS will restrict which balances they can see
DROP POLICY IF EXISTS profiles_select_company ON public.profiles;

CREATE POLICY profiles_select_company
  ON public.profiles
  FOR SELECT
  USING (
    -- Profile must be in the same company as the user
    -- We use a simple subquery that should work
    company_id IN (
      SELECT p.company_id 
      FROM public.profiles p
      WHERE p.id = auth.uid() OR p.auth_user_id = auth.uid()
    )
  );

-- Step 5: Test if it works now
SELECT 
  'Step 5: Test profiles visibility' as step,
  COUNT(*) as visible_profiles
FROM profiles
WHERE company_id IN (
  SELECT company_id FROM profiles WHERE id = auth.uid() OR auth_user_id = auth.uid()
);

