-- Fix Profiles RLS to Allow Company-Wide Access
-- This fixes the issue where admins can't see/manage team members

-- Drop existing restrictive policies
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;

-- Create helper function to get user's company_id (bypasses RLS)
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
  -- Get user's email first
  SELECT email INTO user_email FROM auth.users WHERE id = auth.uid();
  
  -- Try to find profile by id or auth_user_id first
  SELECT company_id INTO result
  FROM public.profiles
  WHERE id = auth.uid() OR auth_user_id = auth.uid()
  LIMIT 1;
  
  -- If not found, try by email (fallback)
  IF result IS NULL AND user_email IS NOT NULL THEN
      SELECT company_id INTO result
      FROM public.profiles
      WHERE email = user_email
      LIMIT 1;
    END IF;
    
    RETURN result;
  END;
$$;

-- Check if user has admin/manager/owner role
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
BEGIN
  -- Get user's email first
  SELECT email INTO user_email FROM auth.users WHERE id = auth.uid();
  
  -- Try to find profile by id or auth_user_id first
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() OR auth_user_id = auth.uid()
      AND LOWER(app_role::text) IN ('owner', 'admin', 'manager')
  ) INTO result;
  
  -- If not found, try by email (fallback)
  IF NOT result AND user_email IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE email = user_email
        AND LOWER(app_role::text) IN ('owner', 'admin', 'manager')
    ) INTO result;
  END IF;
  
  RETURN COALESCE(result, false);
END;
$$;

-- Create updated policies that allow company-wide access
-- SELECT: Users can see their own profile AND profiles in their company
CREATE POLICY profiles_select_company
  ON public.profiles
  FOR SELECT
  USING (
    -- User can see their own profile
    id = auth.uid() OR auth_user_id = auth.uid()
    OR
    -- Users can see profiles in their company
    company_id = public.get_user_company_id()
  );

-- INSERT: Users can insert their own profile OR admins/managers can create profiles for their company
CREATE POLICY profiles_insert_company
  ON public.profiles
  FOR INSERT
  WITH CHECK (
    -- User can insert their own profile
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

-- Verify policies were created
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










