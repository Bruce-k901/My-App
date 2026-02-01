-- ============================================================================
-- FIX PROFILES RLS TO ALLOW VIEWING COMPANY USERS
-- ============================================================================
-- The current RLS policy only allows users to see their own profile.
-- This script adds a policy to allow users to see other profiles in their company.
-- ============================================================================

-- Step 1: Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Step 2: Keep the existing policy for users to see their own profile
-- (This is already created by fix_profiles_rls_406_error.sql)

-- Step 3: Drop existing policy if it exists, then create new one
-- (CREATE POLICY doesn't support IF NOT EXISTS, so we drop first)
DROP POLICY IF EXISTS profiles_select_company ON public.profiles;

-- Step 4: Add a new policy to allow users to see other profiles in their company
-- This allows Managers, Admins, and Owners to see all users in their company
-- Staff can also see other users (useful for team collaboration)
CREATE POLICY profiles_select_company
  ON public.profiles
  FOR SELECT
  USING (
    -- User can see profiles in their company
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id IS NOT NULL
        AND p.company_id = profiles.company_id
    )
  );

-- Step 5: Verify the policies exist
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
    RAISE NOTICE '  - profiles_select_company: Users can see profiles in their company';
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

-- Test: Check if Shelly can see other users in her company
-- (This will show what RLS allows)
SELECT 
  '=== TEST: USERS SHELLY CAN SEE ===' AS section,
  id,
  email,
  full_name,
  app_role,
  company_id
FROM public.profiles
WHERE company_id = 'fae1b377-859d-4ba6-bce2-d8aaf0044517'
ORDER BY full_name;










