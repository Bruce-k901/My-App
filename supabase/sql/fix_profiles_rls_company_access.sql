-- ============================================================================
-- Fix Profiles RLS to Allow Company-Wide Access
-- ============================================================================
-- Problem: Users could only see their own profile, preventing admins from
--          seeing newly created team members.
-- Solution: Update RLS policies to allow users to see all profiles in their company.
-- ============================================================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;

-- Create updated policies that allow company-wide access
-- CRITICAL: Use a security definer function to avoid infinite recursion
-- The function can check company_id without triggering RLS on profiles

-- First, create helper functions that bypass RLS to avoid infinite recursion

-- Get user's company_id
-- CRITICAL: Must use SET search_path and bypass RLS completely
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  result UUID;
BEGIN
  -- Direct query bypassing RLS by using SECURITY DEFINER
  SELECT company_id INTO result
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
  
  RETURN result;
END;
$$;

-- Check if user has admin/manager/owner role
-- CRITICAL: Must use SET search_path and bypass RLS completely
CREATE OR REPLACE FUNCTION public.is_user_admin_or_manager()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  result BOOLEAN;
BEGIN
  -- Direct query bypassing RLS by using SECURITY DEFINER
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND LOWER(app_role::text) IN ('owner', 'admin', 'manager')
  ) INTO result;
  
  RETURN COALESCE(result, false);
END;
$$;

-- Create updated policies that allow company-wide access

-- SELECT: Users can see their own profile AND profiles in their company
CREATE POLICY profiles_select_own
  ON public.profiles
  FOR SELECT
  USING (
    -- User can see their own profile
    id = auth.uid()
    -- OR user can see profiles in their company (for team management)
    -- Use the security definer function to avoid infinite recursion
    OR company_id = public.get_user_company_id()
  );

-- INSERT: Users can insert their own profile OR admins/managers can create profiles for their company
CREATE POLICY profiles_insert_own
  ON public.profiles
  FOR INSERT
  WITH CHECK (
    -- User can insert their own profile
    id = auth.uid()
    -- OR admins/managers can create profiles for their company
    -- Use security definer functions to avoid recursion
    OR (
      company_id = public.get_user_company_id()
      AND public.is_user_admin_or_manager()
    )
  );

-- UPDATE: Users can update their own profile OR admins/managers can update profiles in their company
CREATE POLICY profiles_update_own
  ON public.profiles
  FOR UPDATE
  USING (
    -- User can update their own profile
    id = auth.uid()
    -- OR admins/managers can update profiles in their company
    -- Use security definer functions to avoid recursion
    OR (
      company_id = public.get_user_company_id()
      AND public.is_user_admin_or_manager()
    )
  )
  WITH CHECK (
    -- User can update their own profile
    id = auth.uid()
    -- OR admins/managers can update profiles in their company
    -- Use security definer functions to avoid recursion
    OR (
      company_id = public.get_user_company_id()
      AND public.is_user_admin_or_manager()
    )
  );

-- Verify the policies were created
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'profiles'
    AND policyname IN ('profiles_select_own', 'profiles_insert_own', 'profiles_update_own');
  
  IF policy_count = 3 THEN
    RAISE NOTICE '✅ All 3 profiles RLS policies created successfully';
  ELSE
    RAISE WARNING '⚠️  Expected 3 policies, found %', policy_count;
  END IF;
END $$;

