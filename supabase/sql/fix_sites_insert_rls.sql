-- ============================================================================
-- FIX SITES INSERT RLS POLICY
-- ============================================================================
-- The sites_insert_company policy was causing RLS violations because it
-- directly queries the profiles table, which can cause infinite recursion
-- or fail if the profiles table RLS blocks the query.
-- 
-- Solution: Use the security definer helper functions that bypass RLS
-- to check company_id and app_role.
-- ============================================================================

-- Step 1: Ensure helper functions exist (they should already exist from rls_policies_authoritative.sql)
-- But we'll recreate them to be safe

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

-- Helper function specifically for owner/admin (used for sites INSERT/UPDATE)
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_company_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_admin_or_manager() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_owner_or_admin() TO authenticated;

-- Step 2: Drop existing sites policies
DROP POLICY IF EXISTS sites_select_company ON public.sites;
DROP POLICY IF EXISTS sites_insert_company ON public.sites;
DROP POLICY IF EXISTS sites_update_company ON public.sites;

-- Step 3: Recreate sites policies using helper functions to avoid recursion
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

-- Step 4: Verify the policies were created
DO $$
DECLARE
  v_policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'sites'
    AND policyname IN ('sites_select_company', 'sites_insert_company', 'sites_update_company');
  
  IF v_policy_count = 3 THEN
    RAISE NOTICE '✅ All sites RLS policies created successfully';
    RAISE NOTICE '  - sites_select_company: Users can see sites in their company';
    RAISE NOTICE '  - sites_insert_company: Owners/admins can insert sites in their company';
    RAISE NOTICE '  - sites_update_company: Owners/admins can update sites in their company';
  ELSE
    RAISE WARNING '⚠️ Expected 3 policies, found %', v_policy_count;
  END IF;
END $$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check current RLS policies for sites
SELECT 
  '=== SITES RLS POLICIES ===' AS section,
  policyname,
  cmd AS command,
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'sites'
ORDER BY policyname;

-- Test the helper functions
SELECT 
  '=== TEST HELPER FUNCTIONS ===' AS section,
  public.get_user_company_id() AS user_company_id,
  public.is_user_admin_or_manager() AS is_admin_or_manager,
  public.is_user_owner_or_admin() AS is_owner_or_admin;










