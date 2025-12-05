-- ============================================================================
-- COMPREHENSIVE FIX FOR SITES INSERT RLS POLICY
-- ============================================================================
-- This script fixes the sites INSERT RLS issue by:
-- 1. Ensuring helper functions exist and work correctly
-- 2. Dropping ALL existing sites policies (to avoid conflicts)
-- 3. Creating new policies using helper functions
-- 4. Verifying everything works
-- ============================================================================

-- Step 1: Drop ALL existing policies on sites table (clean slate)
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'sites'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.sites', r.policyname);
        RAISE NOTICE 'Dropped policy: %', r.policyname;
    END LOOP;
END $$;

-- Step 2: Ensure helper functions exist and are correct
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

CREATE OR REPLACE FUNCTION public.is_user_owner_or_admin()
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
      AND LOWER(app_role::text) IN ('owner', 'admin')
  ) INTO result;
  
  RETURN COALESCE(result, false);
END;
$$;

-- Step 3: Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_user_company_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_owner_or_admin() TO authenticated;

-- Step 4: Ensure RLS is enabled on sites table
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;

-- Step 5: Create new policies using helper functions
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
    AND public.is_user_owner_or_admin() = true
  );

CREATE POLICY sites_update_company
  ON public.sites
  FOR UPDATE
  USING (
    public.get_user_company_id() IS NOT NULL
    AND public.get_user_company_id() = sites.company_id
    AND public.is_user_owner_or_admin() = true
  )
  WITH CHECK (
    public.get_user_company_id() IS NOT NULL
    AND public.get_user_company_id() = sites.company_id
    AND public.is_user_owner_or_admin() = true
  );

CREATE POLICY sites_delete_company
  ON public.sites
  FOR DELETE
  USING (
    public.get_user_company_id() IS NOT NULL
    AND public.get_user_company_id() = sites.company_id
    AND public.is_user_owner_or_admin() = true
  );

-- Step 6: Verify policies were created
DO $$
DECLARE
  v_policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'sites';
  
  IF v_policy_count >= 4 THEN
    RAISE NOTICE '✅ Successfully created % policies on sites table', v_policy_count;
  ELSE
    RAISE WARNING '⚠️ Expected at least 4 policies, found %', v_policy_count;
  END IF;
END $$;

-- Step 7: Show final policy list
SELECT 
  '=== FINAL SITES POLICIES ===' AS section,
  policyname,
  cmd AS command,
  with_check AS with_check_expression
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'sites'
ORDER BY policyname;
