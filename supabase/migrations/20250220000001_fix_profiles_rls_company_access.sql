-- ============================================================================
-- Migration: Fix Profiles RLS to Allow Company-Wide Access
-- Description: Ensures managers and admins can see all users in their company
-- ============================================================================

BEGIN;

-- Drop ALL existing policies on profiles to avoid conflicts and recursion
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
            AND tablename = 'profiles'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create a security definer function to get user's company_id without RLS recursion
-- SECURITY DEFINER functions run with the privileges of the function owner (postgres)
-- and bypass RLS, preventing infinite recursion
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
BEGIN
  -- SECURITY DEFINER bypasses RLS - this query won't trigger policy evaluation
  SELECT company_id INTO v_company_id
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
  
  RETURN v_company_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_user_company_id() TO authenticated;

-- Create a policy that allows users to see profiles in their company
-- Uses security definer function to avoid recursion
CREATE POLICY profiles_select_company
  ON public.profiles
  FOR SELECT
  USING (
    -- Users can always see their own profile
    id = auth.uid()
    OR
    -- Users can see profiles in their company (using function to avoid recursion)
    (
      company_id IS NOT NULL
      AND company_id = public.get_user_company_id()
      AND public.get_user_company_id() IS NOT NULL
    )
  );

-- Create a security definer function to get user's role without RLS recursion
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
BEGIN
  -- Direct query - SECURITY DEFINER bypasses RLS
  SELECT app_role INTO v_role
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
  
  RETURN v_role;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;

-- Create a policy that allows users to update profiles in their company
-- (with appropriate role restrictions)
CREATE POLICY profiles_update_company
  ON public.profiles
  FOR UPDATE
  USING (
    -- Users can always update their own profile
    id = auth.uid()
    OR
    -- Managers and admins can update profiles in their company
    (
      company_id IS NOT NULL
      AND company_id = public.get_user_company_id()
      AND public.get_user_company_id() IS NOT NULL
      AND public.get_user_role() IN ('Admin', 'Manager', 'General Manager', 'Owner')
    )
  )
  WITH CHECK (
    -- Users can always update their own profile
    id = auth.uid()
    OR
    -- Managers and admins can update profiles in their company
    (
      company_id IS NOT NULL
      AND company_id = public.get_user_company_id()
      AND public.get_user_company_id() IS NOT NULL
      AND public.get_user_role() IN ('Admin', 'Manager', 'General Manager', 'Owner')
    )
  );

-- Create a policy that allows admins/managers to insert new profiles in their company
CREATE POLICY profiles_insert_company
  ON public.profiles
  FOR INSERT
  WITH CHECK (
    -- Users can create their own profile (handled by trigger usually)
    id = auth.uid()
    OR
    -- Managers and admins can create profiles in their company
    (
      company_id IS NOT NULL
      AND company_id = public.get_user_company_id()
      AND public.get_user_company_id() IS NOT NULL
      AND public.get_user_role() IN ('Admin', 'Manager', 'General Manager', 'Owner')
    )
  );

COMMIT;

