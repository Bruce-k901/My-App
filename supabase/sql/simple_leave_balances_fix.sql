-- SIMPLE FIX: Make sure managers can see all company employees
-- This is a simplified approach to fix the RLS issue

-- 1. First, ensure functions exist
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
  WHERE id = auth.uid() OR (auth_user_id IS NOT NULL AND auth_user_id = auth.uid())
  LIMIT 1;
  RETURN v_company_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_user_manager_or_above()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
BEGIN
  -- Try both id = auth.uid() and auth_user_id = auth.uid()
  SELECT app_role INTO v_role
  FROM public.profiles
  WHERE id = auth.uid() 
     OR (auth_user_id IS NOT NULL AND auth_user_id = auth.uid())
  LIMIT 1;
  
  IF v_role IS NULL THEN
    -- Debug: Log if role is null
    RAISE NOTICE 'No profile found for auth.uid() = %', auth.uid();
    RETURN FALSE;
  END IF;
  
  -- Convert to lowercase text for comparison
  RETURN LOWER(COALESCE(v_role::TEXT, '')) IN ('admin', 'owner', 'manager');
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_company_id_safe() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_manager_or_above() TO authenticated;

-- 2. Drop and recreate leave_balances policies
DROP POLICY IF EXISTS "view_own_balances" ON leave_balances;
DROP POLICY IF EXISTS "managers_view_balances" ON leave_balances;
DROP POLICY IF EXISTS "managers_view_company_balances" ON leave_balances;
DROP POLICY IF EXISTS "admins_manage_balances" ON leave_balances;

-- Own balances
CREATE POLICY "view_own_balances"
ON leave_balances FOR SELECT
USING (
  profile_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = leave_balances.profile_id
      AND p.auth_user_id = auth.uid()
  )
);

-- Managers see all company balances
-- IMPORTANT: Both policies can apply (OR logic), so managers see all company balances
CREATE POLICY "managers_view_company_balances"
ON leave_balances FOR SELECT
USING (
  -- User must be manager/admin/owner
  public.is_user_manager_or_above() = TRUE
  -- Balance must be in same company
  AND leave_balances.company_id IS NOT NULL
  AND leave_balances.company_id = public.get_user_company_id_safe()
  -- Company ID must be valid
  AND public.get_user_company_id_safe() IS NOT NULL
);

-- 3. Fix profiles RLS - CRITICAL for view join
DROP POLICY IF EXISTS "profiles_select_company" ON profiles;
DROP POLICY IF EXISTS "profiles_own_data" ON profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;

-- Own profile
CREATE POLICY "profiles_select_own"
ON profiles FOR SELECT
USING (
  id = auth.uid() 
  OR (auth_user_id IS NOT NULL AND auth_user_id = auth.uid())
);

-- Company profiles - ALL company members can see company profiles
-- This is needed for the view JOIN to work
CREATE POLICY "profiles_select_company"
ON profiles FOR SELECT
USING (
  company_id = public.get_user_company_id_safe()
  AND public.get_user_company_id_safe() IS NOT NULL
);

-- 4. Test query - run this to verify it works
-- SELECT COUNT(*) FROM leave_balances_enhanced_view;

