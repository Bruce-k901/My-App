-- Complete Fix for Profiles RLS - Company-Wide Access + Email Fallback
-- Run this in Supabase SQL Editor

-- Step 1: Update helper functions to check email as fallback
-- CRITICAL: Use SECURITY DEFINER to bypass RLS completely
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  result UUID;
  user_email TEXT;
BEGIN
  -- SECURITY DEFINER bypasses RLS - we can query directly
  -- Get user's email first
  SELECT email INTO user_email FROM auth.users WHERE id = auth.uid();
  
  -- Try to find profile by id first
  SELECT company_id INTO result
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
  
  -- If not found, try auth_user_id
  IF result IS NULL THEN
    SELECT company_id INTO result
    FROM public.profiles
    WHERE auth_user_id = auth.uid()
    LIMIT 1;
  END IF;
  
  -- If still not found, try by email (fallback)
  IF result IS NULL AND user_email IS NOT NULL THEN
    SELECT company_id INTO result
    FROM public.profiles
    WHERE email = user_email
    LIMIT 1;
  END IF;
  
  RETURN result;
END;
$$;

-- Update is_user_admin_or_manager to check email as fallback
-- CRITICAL: Use SECURITY DEFINER to bypass RLS completely
CREATE OR REPLACE FUNCTION public.is_user_admin_or_manager()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  result BOOLEAN;
  user_email TEXT;
  role_text TEXT;
BEGIN
  -- SECURITY DEFINER bypasses RLS - we can query directly
  -- Get user's email first
  SELECT email INTO user_email FROM auth.users WHERE id = auth.uid();
  
  -- Try to find profile by id first
  SELECT app_role::TEXT INTO role_text
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
  
  -- If not found, try auth_user_id
  IF role_text IS NULL THEN
    SELECT app_role::TEXT INTO role_text
    FROM public.profiles
    WHERE auth_user_id = auth.uid()
    LIMIT 1;
  END IF;
  
  -- If still not found, try by email (fallback)
  IF role_text IS NULL AND user_email IS NOT NULL THEN
    SELECT app_role::TEXT INTO role_text
    FROM public.profiles
    WHERE email = user_email
    LIMIT 1;
  END IF;
  
  -- Check if role is admin/manager/owner (case-insensitive)
  IF role_text IS NOT NULL THEN
    result := (
      LOWER(role_text) IN ('owner', 'admin', 'manager', 'general_manager') OR
      role_text IN ('Owner', 'Admin', 'Manager', 'General Manager', 'General_Manager')
    );
  ELSE
    result := false;
  END IF;
  
  RETURN result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_user_company_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_admin_or_manager() TO authenticated;

-- Step 2: Drop old restrictive policies
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
DROP POLICY IF EXISTS profiles_select_company ON public.profiles;
DROP POLICY IF EXISTS profiles_insert_company ON public.profiles;
DROP POLICY IF EXISTS profiles_update_company ON public.profiles;

-- Step 3: Create new policies with company-wide access
-- SELECT: Users can see their own profile AND all profiles in their company
CREATE POLICY profiles_select_company
  ON public.profiles
  FOR SELECT
  USING (
    -- User can see their own profile
    id = auth.uid() OR auth_user_id = auth.uid()
    OR
    -- Users can see all profiles in their company
    company_id = public.get_user_company_id()
  );

-- INSERT: Users can insert their own profile OR admins/managers can create profiles for their company
CREATE POLICY profiles_insert_company
  ON public.profiles
  FOR INSERT
  WITH CHECK (
    -- User can insert their own profile (for signup)
    id = auth.uid()
    OR
    -- Admins/managers can create profiles for their company
    (
      company_id IS NOT NULL
      AND company_id = public.get_user_company_id()
      AND public.get_user_company_id() IS NOT NULL
      AND public.is_user_admin_or_manager()
    )
  );

-- UPDATE: Users can update their own profile OR admins/managers can update profiles in their company
CREATE POLICY profiles_update_company
  ON public.profiles
  FOR UPDATE
  USING (
    -- User can update their own profile
    id = auth.uid() OR auth_user_id = auth.uid()
    OR
    -- Admins/managers can update profiles in their company
    (
      company_id = public.get_user_company_id()
      AND public.get_user_company_id() IS NOT NULL
      AND public.is_user_admin_or_manager()
    )
  )
  WITH CHECK (
    -- User can update their own profile
    id = auth.uid() OR auth_user_id = auth.uid()
    OR
    -- Admins/managers can update profiles in their company
    (
      company_id = public.get_user_company_id()
      AND public.get_user_company_id() IS NOT NULL
      AND public.is_user_admin_or_manager()
    )
  );

-- Step 4: Verify policies were created
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'profiles'
    AND policyname IN ('profiles_select_company', 'profiles_insert_company', 'profiles_update_company');
  
  IF policy_count = 3 THEN
    RAISE NOTICE '✅ All 3 profiles RLS policies created successfully';
  ELSE
    RAISE WARNING '⚠️  Expected 3 policies, found %', policy_count;
  END IF;
END $$;

-- Step 5: Test the functions
SELECT 
  public.get_user_company_id() as your_company_id,
  public.is_user_admin_or_manager() as is_admin_or_manager;

