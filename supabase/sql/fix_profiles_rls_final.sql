-- FINAL FIX: Fix profiles RLS to avoid recursion
-- The profiles_select_company policy must use EXISTS, not get_user_company_id_safe()
-- This is critical for the view JOIN to work

-- Drop the problematic policy
DROP POLICY IF EXISTS "profiles_select_company" ON profiles;

-- Create new policy using EXISTS to avoid recursion
CREATE POLICY "profiles_select_company"
ON profiles FOR SELECT
USING (
  company_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
      AND p.company_id = profiles.company_id
  )
);

-- Also fix leave_types RLS to use EXISTS instead of helper function
DROP POLICY IF EXISTS "leave_types_select_company" ON leave_types;

CREATE POLICY "leave_types_select_company"
ON leave_types FOR SELECT
USING (
  company_id IS NULL  -- Global types
  OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
      AND p.company_id = leave_types.company_id
  )
);

-- Verify policies
SELECT 
  tablename,
  policyname,
  cmd as command,
  CASE 
    WHEN qual LIKE '%EXISTS%' THEN '✅ Uses EXISTS (good)'
    WHEN qual LIKE '%get_user_company_id_safe%' THEN '❌ Uses helper function (may cause recursion)'
    ELSE 'Other'
  END as policy_type
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'leave_types')
ORDER BY tablename, policyname;

