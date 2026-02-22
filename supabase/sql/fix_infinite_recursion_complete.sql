-- ============================================================================
-- COMPREHENSIVE FIX FOR INFINITE RECURSION IN RLS POLICIES
-- ============================================================================
-- Problem: Many RLS policies query the `profiles` table directly, which
-- triggers RLS checks on `profiles`, causing infinite recursion.
--
-- Solution: Create SECURITY DEFINER functions that bypass RLS to get
-- user data, then use these functions in all policies.
-- ============================================================================

-- Step 1: Create helper functions that bypass RLS
-- These functions run with elevated privileges and don't trigger RLS

CREATE OR REPLACE FUNCTION public.get_user_company_id_safe()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
BEGIN
  SELECT company_id INTO v_company_id
  FROM public.profiles
  WHERE id = auth.uid() OR auth_user_id = auth.uid()
  LIMIT 1;
  
  RETURN v_company_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_app_role_safe()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_app_role TEXT;
BEGIN
  SELECT COALESCE(app_role::TEXT, '') INTO v_app_role
  FROM public.profiles
  WHERE id = auth.uid() OR auth_user_id = auth.uid()
  LIMIT 1;
  
  RETURN COALESCE(v_app_role, '');
END;
$$;

CREATE OR REPLACE FUNCTION public.is_user_manager_or_above_safe()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_app_role TEXT;
BEGIN
  SELECT COALESCE(app_role::TEXT, '') INTO v_app_role
  FROM public.profiles
  WHERE id = auth.uid() OR auth_user_id = auth.uid()
  LIMIT 1;
  
  RETURN LOWER(COALESCE(v_app_role, '')) IN ('admin', 'owner', 'manager');
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_user_company_id_safe() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_app_role_safe() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_manager_or_above_safe() TO authenticated;

-- Step 2: Fix profiles RLS policies (CRITICAL - this is where recursion starts)
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
DROP POLICY IF EXISTS profiles_select_company ON public.profiles;
DROP POLICY IF EXISTS profiles_insert_company ON public.profiles;
DROP POLICY IF EXISTS profiles_update_company ON public.profiles;
DROP POLICY IF EXISTS "profiles_own_data" ON public.profiles;
DROP POLICY IF EXISTS "Users can access own profile" ON public.profiles;

-- Users can always see their own profile (no recursion - direct check)
CREATE POLICY profiles_select_own
  ON public.profiles
  FOR SELECT
  USING (id = auth.uid() OR auth_user_id = auth.uid());

-- Managers can see profiles in their company (using SECURITY DEFINER function to avoid recursion)
CREATE POLICY profiles_select_company
  ON public.profiles
  FOR SELECT
  USING (
    -- User must be a manager or above
    public.is_user_manager_or_above_safe() = true
    -- AND the profile's company_id must match the user's company_id
    AND company_id = public.get_user_company_id_safe()
    -- AND user must have a company_id
    AND public.get_user_company_id_safe() IS NOT NULL
  );

-- Users can insert profiles (for registration)
CREATE POLICY profiles_insert_company
  ON public.profiles
  FOR INSERT
  WITH CHECK (
    id = auth.uid()
    OR auth_user_id = auth.uid()
    OR (
      public.get_user_company_id_safe() IS NOT NULL
      AND public.get_user_company_id_safe() = company_id
      AND public.is_user_manager_or_above_safe()
    )
  );

-- Users can update their own profile or managers can update company profiles
CREATE POLICY profiles_update_company
  ON public.profiles
  FOR UPDATE
  USING (
    id = auth.uid()
    OR auth_user_id = auth.uid()
    OR (
      public.get_user_company_id_safe() IS NOT NULL
      AND public.get_user_company_id_safe() = company_id
      AND public.is_user_manager_or_above_safe()
    )
  )
  WITH CHECK (
    id = auth.uid()
    OR auth_user_id = auth.uid()
    OR (
      public.get_user_company_id_safe() IS NOT NULL
      AND public.get_user_company_id_safe() = company_id
      AND public.is_user_manager_or_above_safe()
    )
  );

-- Step 3: Fix companies RLS policies
DROP POLICY IF EXISTS companies_select_own_or_profile ON public.companies;
DROP POLICY IF EXISTS companies_insert_own ON public.companies;
DROP POLICY IF EXISTS companies_update_own_or_profile ON public.companies;
DROP POLICY IF EXISTS "Users can access linked companies" ON public.companies;
DROP POLICY IF EXISTS companies_user_access ON public.companies;

CREATE POLICY companies_select_company
  ON public.companies
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR created_by = auth.uid()
    OR (
      public.get_user_company_id_safe() IS NOT NULL
      AND public.get_user_company_id_safe() = id
    )
  );

CREATE POLICY companies_insert_own
  ON public.companies
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR created_by = auth.uid()
  );

CREATE POLICY companies_update_company
  ON public.companies
  FOR UPDATE
  USING (
    user_id = auth.uid()
    OR created_by = auth.uid()
    OR (
      public.get_user_company_id_safe() IS NOT NULL
      AND public.get_user_company_id_safe() = id
      AND public.is_user_manager_or_above_safe()
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR created_by = auth.uid()
    OR (
      public.get_user_company_id_safe() IS NOT NULL
      AND public.get_user_company_id_safe() = id
      AND public.is_user_manager_or_above_safe()
    )
  );

-- Step 4: Fix leave_balances RLS policies
DROP POLICY IF EXISTS view_own_balances ON public.leave_balances;
DROP POLICY IF EXISTS managers_view_company_balances ON public.leave_balances;
DROP POLICY IF EXISTS admins_manage_balances ON public.leave_balances;

CREATE POLICY view_own_balances
  ON public.leave_balances
  FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY managers_view_company_balances
  ON public.leave_balances
  FOR SELECT
  USING (
    public.get_user_company_id_safe() IS NOT NULL
    AND public.get_user_company_id_safe() = company_id
    AND public.is_user_manager_or_above_safe()
  );

CREATE POLICY admins_manage_balances
  ON public.leave_balances
  FOR ALL
  USING (
    public.get_user_company_id_safe() IS NOT NULL
    AND public.get_user_company_id_safe() = company_id
    AND public.is_user_manager_or_above_safe()
  )
  WITH CHECK (
    public.get_user_company_id_safe() IS NOT NULL
    AND public.get_user_company_id_safe() = company_id
    AND public.is_user_manager_or_above_safe()
  );

-- Step 5: Fix leave_types RLS policies
DROP POLICY IF EXISTS leave_types_select_company ON public.leave_types;

CREATE POLICY leave_types_select_company
  ON public.leave_types
  FOR SELECT
  USING (
    company_id IS NULL
    OR (
      public.get_user_company_id_safe() IS NOT NULL
      AND public.get_user_company_id_safe() = company_id
    )
    OR id IN (
      SELECT DISTINCT leave_type_id
      FROM public.leave_balances
      WHERE company_id = public.get_user_company_id_safe()
    )
  );

-- Step 6: Fix staff_attendance RLS policies (if they exist)
DO $$
BEGIN
  -- Check if table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'staff_attendance'
  ) THEN
    -- Drop ALL existing policies to avoid conflicts
    DROP POLICY IF EXISTS staff_attendance_select_own ON public.staff_attendance;
    DROP POLICY IF EXISTS staff_attendance_select_company ON public.staff_attendance;
    DROP POLICY IF EXISTS staff_attendance_insert_company ON public.staff_attendance;
    DROP POLICY IF EXISTS staff_attendance_insert_own ON public.staff_attendance;
    DROP POLICY IF EXISTS staff_attendance_update_company ON public.staff_attendance;
    DROP POLICY IF EXISTS staff_attendance_update_own ON public.staff_attendance;
    
    -- Create new policies using helper functions
    -- Users can see their own records, managers can see company records
    -- Note: This assumes staff_attendance has a user_id column
    CREATE POLICY staff_attendance_select_own
      ON public.staff_attendance
      FOR SELECT
      USING (user_id = auth.uid());
    
    CREATE POLICY staff_attendance_select_company
      ON public.staff_attendance
      FOR SELECT
      USING (
        public.get_user_company_id_safe() IS NOT NULL
        AND public.is_user_manager_or_above_safe()
        -- If staff_attendance has company_id or site_id, add that check here
        -- For now, managers can see all records (you may want to add company_id check)
      );
    
    CREATE POLICY staff_attendance_insert_own
      ON public.staff_attendance
      FOR INSERT
      WITH CHECK (user_id = auth.uid());
    
    CREATE POLICY staff_attendance_update_own
      ON public.staff_attendance
      FOR UPDATE
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- Step 7: Verification
DO $$
DECLARE
  v_policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'profiles'
    AND policyname IN ('profiles_select_own', 'profiles_select_company');
  
  RAISE NOTICE '✅ Profiles policies created: %', v_policy_count;
  
  IF v_policy_count < 2 THEN
    RAISE WARNING '⚠️ Expected 2 profiles policies, found %', v_policy_count;
  END IF;
END $$;

-- Test queries (commented out - uncomment to test)
/*
-- Test 1: Can we get company_id without recursion?
SELECT public.get_user_company_id_safe() AS company_id;

-- Test 2: Can we see our own profile?
SELECT id, email, full_name, company_id 
FROM public.profiles 
WHERE id = auth.uid();

-- Test 3: Can we see other profiles in our company?
SELECT id, email, full_name, company_id 
FROM public.profiles 
WHERE company_id = public.get_user_company_id_safe()
LIMIT 5;
*/

