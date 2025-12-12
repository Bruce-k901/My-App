-- ============================================================================
-- FIX PROFILES RLS 406 ERROR
-- ============================================================================
-- This script fixes the 406 (Not Acceptable) error when users try to
-- read their own profile. The issue is that RLS policies are blocking
-- users from accessing their own profile data.
-- ============================================================================

-- Step 1: Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop existing policies that might be conflicting
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
DROP POLICY IF EXISTS "Users can access own profile" ON public.profiles;
DROP POLICY IF EXISTS profiles_own_data ON public.profiles;

-- Step 3: Create a comprehensive policy that allows users to:
-- - SELECT their own profile (id = auth.uid())
-- - UPDATE their own profile (id = auth.uid())
-- - INSERT their own profile (id = auth.uid())
CREATE POLICY profiles_select_own
  ON public.profiles
  FOR SELECT
  USING (id = auth.uid());

CREATE POLICY profiles_update_own
  ON public.profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY profiles_insert_own
  ON public.profiles
  FOR INSERT
  WITH CHECK (id = auth.uid());

-- Step 4: Also allow admins/service role to read profiles (for API routes)
-- This is handled by using the service role key in API routes, so we don't need a separate policy

-- Step 5: Verify the policies were created
DO $$
DECLARE
  v_policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'profiles'
    AND policyname IN ('profiles_select_own', 'profiles_update_own', 'profiles_insert_own');
  
  IF v_policy_count = 3 THEN
    RAISE NOTICE '✅ All profiles RLS policies created successfully';
  ELSE
    RAISE WARNING '⚠️ Expected 3 policies, found %', v_policy_count;
  END IF;
END $$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check current RLS status
SELECT 
  '=== RLS STATUS ===' AS section,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'profiles';

-- Check existing policies
SELECT 
  '=== EXISTING POLICIES ===' AS section,
  policyname,
  cmd AS command,
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'profiles'
ORDER BY policyname;

-- Test query (run as a specific user to verify)
-- Replace USER_ID with actual user ID to test
-- SELECT * FROM public.profiles WHERE id = 'USER_ID';

