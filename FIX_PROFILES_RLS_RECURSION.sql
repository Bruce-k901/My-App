-- Fix Infinite Recursion in Profiles RLS Policy
-- Error: 42P17 - infinite recursion detected in policy for relation "profiles"
--
-- This happens when policies on other tables reference profiles,
-- and profiles policies create a circular dependency.
--
-- Solution: Use SECURITY DEFINER function to bypass RLS when checking profiles

-- Step 1: Drop all existing policies on profiles
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

-- Step 2: Create a SECURITY DEFINER function to get user's company_id
-- This bypasses RLS and prevents recursion
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
    v_company_id uuid;
BEGIN
    -- Direct query without RLS (SECURITY DEFINER bypasses RLS)
    SELECT company_id INTO v_company_id
    FROM public.profiles
    WHERE id = auth.uid()
    LIMIT 1;
    
    RETURN v_company_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_company_id() TO authenticated;

-- Step 3: Create simple, non-recursive policies for profiles
-- Users can only access their own profile - no subqueries needed
CREATE POLICY "profiles_select_own"
  ON public.profiles
  FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "profiles_insert_own"
  ON public.profiles
  FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_delete_own"
  ON public.profiles
  FOR DELETE
  USING (id = auth.uid());

-- Step 4: Update other tables' policies to use the function instead of direct profiles query
-- This breaks the circular dependency

-- Companies policies
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
            AND tablename = 'companies'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

CREATE POLICY "companies_select_company"
  ON public.companies
  FOR SELECT
  USING (id = public.get_user_company_id());

CREATE POLICY "companies_insert_company"
  ON public.companies
  FOR INSERT
  WITH CHECK (id = public.get_user_company_id());

CREATE POLICY "companies_update_company"
  ON public.companies
  FOR UPDATE
  USING (id = public.get_user_company_id())
  WITH CHECK (id = public.get_user_company_id());

-- Sites policies
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
            AND tablename = 'sites'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

CREATE POLICY "sites_select_company"
  ON public.sites
  FOR SELECT
  USING (company_id = public.get_user_company_id());

CREATE POLICY "sites_insert_company"
  ON public.sites
  FOR INSERT
  WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "sites_update_company"
  ON public.sites
  FOR UPDATE
  USING (company_id = public.get_user_company_id())
  WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "sites_delete_company"
  ON public.sites
  FOR DELETE
  USING (company_id = public.get_user_company_id());

-- Assets policies
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
            AND tablename = 'assets'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

CREATE POLICY "assets_select_company"
  ON public.assets
  FOR SELECT
  USING (company_id = public.get_user_company_id());

CREATE POLICY "assets_insert_company"
  ON public.assets
  FOR INSERT
  WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "assets_update_company"
  ON public.assets
  FOR UPDATE
  USING (company_id = public.get_user_company_id())
  WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "assets_delete_company"
  ON public.assets
  FOR DELETE
  USING (company_id = public.get_user_company_id());

-- Contractors policies
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
            AND tablename = 'contractors'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

CREATE POLICY "contractors_select_company"
  ON public.contractors
  FOR SELECT
  USING (company_id = public.get_user_company_id());

CREATE POLICY "contractors_insert_company"
  ON public.contractors
  FOR INSERT
  WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "contractors_update_company"
  ON public.contractors
  FOR UPDATE
  USING (company_id = public.get_user_company_id())
  WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "contractors_delete_company"
  ON public.contractors
  FOR DELETE
  USING (company_id = public.get_user_company_id());

-- Verify the fix
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public'
    AND tablename IN ('profiles', 'companies', 'sites', 'assets', 'contractors')
ORDER BY tablename, policyname;

