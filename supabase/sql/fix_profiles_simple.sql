-- SIMPLE FIX: Use direct subqueries instead of helper functions
-- This avoids the complexity of SECURITY DEFINER functions

-- Step 1: Drop the complex policy
DROP POLICY IF EXISTS profiles_select_company ON public.profiles;

-- Step 2: Create a simple policy using direct subqueries
-- This checks: user is a manager AND profiles are in the same company
CREATE POLICY profiles_select_company
  ON public.profiles
  FOR SELECT
  USING (
    -- User must be a manager/admin/owner
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
      AND LOWER(COALESCE(p.app_role::TEXT, '')) IN ('admin', 'owner', 'manager')
    )
    -- AND the profile being accessed is in the same company as the user
    AND company_id = (
      SELECT p.company_id 
      FROM public.profiles p
      WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
      LIMIT 1
    )
  );

-- Step 3: Test if it works
SELECT 
  'Test: Can see company profiles?' as step,
  COUNT(*) as visible_profiles,
  ARRAY_AGG(id ORDER BY id) as profile_ids
FROM profiles
WHERE company_id = (
  SELECT company_id FROM profiles WHERE id = auth.uid() OR auth_user_id = auth.uid() LIMIT 1
);

-- Step 4: Test the nested select scenario
SELECT 
  'Test: Nested select' as step,
  COUNT(*) as balances_with_profiles
FROM leave_balances lb
WHERE lb.company_id = (
  SELECT company_id FROM profiles WHERE id = auth.uid() OR auth_user_id = auth.uid() LIMIT 1
)
AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
AND EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.id = lb.profile_id
);

