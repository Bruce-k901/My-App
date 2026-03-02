-- ============================================================================
-- FIX INFINITE RECURSION IN PROFILES RLS POLICY
-- ============================================================================
-- The profiles_select_company policy was causing infinite recursion because
-- it queries the profiles table from within a policy ON the profiles table.
-- 
-- Solution: Create a security definer function that bypasses RLS to get
-- the user's company_id, then use that function in the policy.
-- ============================================================================

-- Step 1: Drop the problematic policy
DROP POLICY IF EXISTS profiles_select_company ON public.profiles;

-- Step 2: Create security definer functions to get user's profile data
-- These functions run with elevated privileges and bypass RLS
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_company_id UUID;
BEGIN
  SELECT company_id INTO v_company_id
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
  
  RETURN v_company_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_app_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_app_role TEXT;
BEGIN
  SELECT app_role::TEXT INTO v_app_role
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
  
  RETURN v_app_role;
END;
$$;

-- Step 3: Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_company_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_app_role() TO authenticated;

-- Step 4: Create the fixed policy using the function
-- This avoids recursion because the function bypasses RLS
CREATE POLICY profiles_select_company
  ON public.profiles
  FOR SELECT
  USING (
    -- User can see profiles in their company
    -- Use the security definer function to avoid recursion
    public.get_user_company_id() IS NOT NULL
    AND public.get_user_company_id() = profiles.company_id
  );

-- Step 5: Update sites policies to use the function (prevents recursion when sites queries profiles)
-- Drop existing sites policies that query profiles
DROP POLICY IF EXISTS sites_select_company ON public.sites;
DROP POLICY IF EXISTS sites_insert_company ON public.sites;
DROP POLICY IF EXISTS sites_update_company ON public.sites;

-- Recreate sites policies using the function
CREATE POLICY sites_select_company
  ON public.sites
  FOR SELECT
  USING (
    public.get_user_company_id() IS NOT NULL
    AND public.get_user_company_id() = sites.company_id
  );

CREATE POLICY sites_insert_company
  ON public.sites
  FOR INSERT
  WITH CHECK (
    public.get_user_company_id() IS NOT NULL
    AND public.get_user_company_id() = sites.company_id
    AND LOWER(public.get_user_app_role()) IN ('owner', 'admin')
  );

CREATE POLICY sites_update_company
  ON public.sites
  FOR UPDATE
  USING (
    public.get_user_company_id() IS NOT NULL
    AND public.get_user_company_id() = sites.company_id
  )
  WITH CHECK (
    public.get_user_company_id() IS NOT NULL
    AND public.get_user_company_id() = sites.company_id
    AND LOWER(public.get_user_app_role()) IN ('owner', 'admin')
  );

-- Step 6: Verify the policies exist
DO $$
DECLARE
  v_policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'profiles'
    AND policyname IN ('profiles_select_own', 'profiles_select_company');
  
  IF v_policy_count = 2 THEN
    RAISE NOTICE '✅ Both profiles SELECT policies created successfully';
    RAISE NOTICE '  - profiles_select_own: Users can see their own profile';
    RAISE NOTICE '  - profiles_select_company: Users can see profiles in their company (no recursion)';
  ELSE
    RAISE WARNING '⚠️ Expected 2 policies, found %', v_policy_count;
  END IF;
END $$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check current RLS policies
SELECT 
  '=== PROFILES RLS POLICIES ===' AS section,
  policyname,
  cmd AS command,
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'profiles'
ORDER BY policyname;

-- Test the function (should return company_id for current user)
SELECT 
  '=== TEST FUNCTION ===' AS section,
  public.get_user_company_id() AS user_company_id;

-- Test: Check if current user can see other users in their company
-- (This will show what RLS allows without causing recursion)
SELECT 
  '=== TEST: USERS CURRENT USER CAN SEE ===' AS section,
  id,
  email,
  full_name,
  app_role,
  company_id
FROM public.profiles
WHERE company_id = public.get_user_company_id()
ORDER BY full_name;










