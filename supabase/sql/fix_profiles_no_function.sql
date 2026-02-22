-- SIMPLE FIX: Don't use functions, use direct subqueries
-- This avoids all the function complexity

-- Step 1: Drop the function-based policy
DROP POLICY IF EXISTS profiles_select_company ON public.profiles;

-- Step 2: Create a policy using direct subqueries
-- The key is to check the user's role FIRST, then company_id
CREATE POLICY profiles_select_company
  ON public.profiles
  FOR SELECT
  USING (
    -- User must be manager/admin/owner (check their own profile)
    EXISTS (
      SELECT 1 
      FROM public.profiles p
      WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
      AND LOWER(COALESCE(p.app_role::TEXT, '')) IN ('admin', 'owner', 'manager')
    )
    -- AND the profile being accessed is in the same company
    AND company_id = (
      SELECT p.company_id 
      FROM public.profiles p
      WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
      LIMIT 1
    )
  );

-- Step 3: Test if it works
SELECT 
  'Test: Company profiles' as step,
  COUNT(*) as visible_profiles
FROM profiles
WHERE EXISTS (
  SELECT 1 
  FROM public.profiles p
  WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
  AND LOWER(COALESCE(p.app_role::TEXT, '')) IN ('admin', 'owner', 'manager')
)
AND company_id = (
  SELECT p.company_id 
  FROM public.profiles p
  WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
  LIMIT 1
);










