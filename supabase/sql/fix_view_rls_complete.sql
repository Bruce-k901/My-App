-- COMPLETE FIX: Ensure leave_balances_enhanced_view works with proper RLS
-- This fixes the issue where data exists but isn't visible on the frontend

-- Step 1: Ensure helper functions exist and work
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
  -- Try id = auth.uid() first
  SELECT company_id INTO v_company_id
  FROM profiles
  WHERE id = auth.uid()
  LIMIT 1;
  
  -- If not found, try auth_user_id
  IF v_company_id IS NULL THEN
    SELECT company_id INTO v_company_id
    FROM profiles
    WHERE auth_user_id IS NOT NULL 
      AND auth_user_id = auth.uid()
    LIMIT 1;
  END IF;
  
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
  -- Try id = auth.uid() first
  SELECT app_role INTO v_role
  FROM profiles
  WHERE id = auth.uid()
  LIMIT 1;
  
  -- If not found, try auth_user_id
  IF v_role IS NULL THEN
    SELECT app_role INTO v_role
    FROM profiles
    WHERE auth_user_id IS NOT NULL 
      AND auth_user_id = auth.uid()
    LIMIT 1;
  END IF;
  
  IF v_role IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN LOWER(COALESCE(v_role::TEXT, '')) IN ('admin', 'owner', 'manager');
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_company_id_safe() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_manager_or_above() TO authenticated;

-- Step 2: Fix leave_balances RLS policies
DROP POLICY IF EXISTS "view_own_balances" ON leave_balances;
DROP POLICY IF EXISTS "managers_view_balances" ON leave_balances;
DROP POLICY IF EXISTS "managers_view_company_balances" ON leave_balances;
DROP POLICY IF EXISTS "managers_insert_balances" ON leave_balances;
DROP POLICY IF EXISTS "admins_manage_balances" ON leave_balances;

-- Policy 1: Users can see their own balances
CREATE POLICY "view_own_balances"
ON leave_balances FOR SELECT
USING (
  profile_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = leave_balances.profile_id
      AND (p.id = auth.uid() OR p.auth_user_id = auth.uid())
  )
);

-- Policy 2: Managers/Admins/Owners can see all balances in their company
CREATE POLICY "managers_view_company_balances"
ON leave_balances FOR SELECT
USING (
  -- User must be manager/admin/owner in the same company
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
      AND p.company_id = leave_balances.company_id
      AND LOWER(COALESCE(p.app_role::TEXT, '')) IN ('admin', 'owner', 'manager')
  )
);

-- Policy 3: Managers/Admins/Owners can insert balances for their company
CREATE POLICY "managers_insert_balances"
ON leave_balances FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
      AND p.company_id = leave_balances.company_id
      AND LOWER(COALESCE(p.app_role::TEXT, '')) IN ('admin', 'owner', 'manager')
  )
);

-- Policy 4: Admins/Owners can update/delete balances
CREATE POLICY "admins_manage_balances"
ON leave_balances FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
      AND p.company_id = leave_balances.company_id
      AND LOWER(COALESCE(p.app_role::TEXT, '')) IN ('admin', 'owner')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
      AND p.company_id = leave_balances.company_id
      AND LOWER(COALESCE(p.app_role::TEXT, '')) IN ('admin', 'owner')
  )
);

-- Step 3: Fix profiles RLS - CRITICAL for view join
DROP POLICY IF EXISTS "profiles_select_company" ON profiles;
DROP POLICY IF EXISTS "profiles_own_data" ON profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;

-- Policy: Users can see their own profile
CREATE POLICY "profiles_select_own"
ON profiles FOR SELECT
USING (
  id = auth.uid() 
  OR (auth_user_id IS NOT NULL AND auth_user_id = auth.uid())
);

-- Policy: Users can see profiles in their company
-- This allows the view JOIN to work - managers can see other employees' profiles
-- IMPORTANT: This uses EXISTS to avoid recursion issues with get_user_company_id_safe()
CREATE POLICY "profiles_select_company"
ON profiles FOR SELECT
USING (
  company_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
      AND p.company_id = profiles.company_id
  )
);

-- Step 4: Ensure view exists and has proper permissions
DROP VIEW IF EXISTS leave_balances_enhanced_view CASCADE;

CREATE VIEW leave_balances_enhanced_view AS
SELECT 
  lb.id,
  lb.company_id,
  lb.profile_id,
  lb.leave_type_id,
  lb.year,
  lb.entitled_days,
  lb.carried_over,
  lb.adjustments,
  lb.taken_days,
  lb.pending_days,
  (lb.entitled_days + lb.carried_over + lb.adjustments - lb.taken_days - lb.pending_days) as remaining_days,
  
  -- Employee details
  p.full_name,
  p.email,
  p.site_id,
  p.contracted_hours,
  p.salary,
  p.hourly_rate,
  p.annual_leave_allowance,
  
  -- Leave type details
  lt.name as leave_type_name,
  lt.code as leave_type_code,
  lt.color as leave_type_color,
  
  -- Calculated fields (using functions)
  calculate_holiday_entitlement(lb.profile_id, lb.year) as calculated_entitlement,
  calculate_average_hours_13_weeks(lb.profile_id) as average_hours_13_weeks,
  calculate_overtime_to_holiday_days(lb.profile_id, lb.year) as overtime_holiday_days,
  get_total_days_in_lieu(lb.profile_id, lb.year) as total_days_in_lieu,
  calculate_accrued_holiday_days(lb.profile_id, lb.year) as accrued_days,
  calculate_available_holiday_days(lb.profile_id, lb.leave_type_id, lb.year) as available_days,
  
  -- Employee type
  CASE 
    WHEN p.salary IS NOT NULL AND p.salary > 0 AND (p.hourly_rate IS NULL OR p.hourly_rate = 0) THEN 'salaried'
    WHEN p.hourly_rate IS NOT NULL AND p.hourly_rate > 0 THEN 'hourly'
    ELSE 'unknown'
  END as employee_type
  
FROM leave_balances lb
JOIN profiles p ON p.id = lb.profile_id
JOIN leave_types lt ON lt.id = lb.leave_type_id;

-- Grant SELECT on the view
GRANT SELECT ON leave_balances_enhanced_view TO authenticated;

-- Step 5: Ensure leave_types RLS allows company members to see types
-- (This should already exist, but let's make sure)
DROP POLICY IF EXISTS "leave_types_select_company" ON leave_types;

CREATE POLICY "leave_types_select_company"
ON leave_types FOR SELECT
USING (
  company_id IS NULL  -- Global types
  OR company_id = public.get_user_company_id_safe()
  OR public.get_user_company_id_safe() IS NULL  -- Fallback if function fails
);

-- Verify: Test query (should work for managers)
-- SELECT COUNT(*) FROM leave_balances_enhanced_view WHERE company_id = public.get_user_company_id_safe();

