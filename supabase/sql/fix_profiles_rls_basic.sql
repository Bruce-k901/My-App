-- BASIC FIX: Simplify profiles RLS to ensure basic access works
-- We'll make profiles_select_own work first, then add company access

-- Step 1: Drop all existing profiles policies
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
DROP POLICY IF EXISTS profiles_select_company ON public.profiles;
DROP POLICY IF EXISTS profiles_insert_company ON public.profiles;
DROP POLICY IF EXISTS profiles_update_company ON public.profiles;

-- Step 2: Create a simple, working profiles_select_own policy
-- This MUST work - users need to see their own profile
CREATE POLICY profiles_select_own
  ON public.profiles
  FOR SELECT
  USING (
    id = auth.uid() 
    OR auth_user_id = auth.uid()
  );

-- Step 3: Test if we can see our own profile
SELECT 
  'Test: Own profile' as step,
  COUNT(*) as visible
FROM profiles
WHERE id = auth.uid() OR auth_user_id = auth.uid();

-- Also show the actual profile data
SELECT 
  'Test: Own profile data' as step,
  id,
  email,
  full_name,
  app_role,
  company_id
FROM profiles
WHERE id = auth.uid() OR auth_user_id = auth.uid();

-- Step 4: For now, create a simple company policy that uses direct subquery
-- This avoids helper functions that might not work
CREATE POLICY profiles_select_company
  ON public.profiles
  FOR SELECT
  USING (
    -- Check if current user is a manager/admin/owner
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
      AND LOWER(COALESCE(p.app_role::TEXT, '')) IN ('admin', 'owner', 'manager')
    )
    -- AND the profile is in the same company
    AND company_id = (
      SELECT p.company_id 
      FROM public.profiles p
      WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
      LIMIT 1
    )
  );

-- Step 5: Test company profiles access
SELECT 
  'Test: Company profiles' as step,
  COUNT(*) as visible_profiles
FROM profiles
WHERE company_id = (
  SELECT company_id FROM profiles WHERE id = auth.uid() OR auth_user_id = auth.uid() LIMIT 1
);

-- Step 6: Add insert/update policies
CREATE POLICY profiles_insert_company
  ON public.profiles
  FOR INSERT
  WITH CHECK (
    id = auth.uid()
    OR auth_user_id = auth.uid()
  );

CREATE POLICY profiles_update_company
  ON public.profiles
  FOR UPDATE
  USING (
    id = auth.uid()
    OR auth_user_id = auth.uid()
  )
  WITH CHECK (
    id = auth.uid()
    OR auth_user_id = auth.uid()
  );

