-- FINAL FIX: Ensure managers can see all employees
-- This uses the same pattern as the original migration but fixes the auth.uid() matching

-- Step 1: Create/update helper functions
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
  -- Try id = auth.uid() first, then auth_user_id
  SELECT company_id INTO v_company_id
  FROM public.profiles
  WHERE id = auth.uid() 
     OR (auth_user_id IS NOT NULL AND auth_user_id = auth.uid())
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
  SELECT app_role INTO v_role
  FROM public.profiles
  WHERE id = auth.uid() 
     OR (auth_user_id IS NOT NULL AND auth_user_id = auth.uid())
  LIMIT 1;
  
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
-- This uses the same pattern as the original migration but with helper functions
CREATE POLICY "managers_view_company_balances"
ON leave_balances FOR SELECT
USING (
  -- Check if user is manager/admin/owner in the same company
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
      AND p.company_id = leave_balances.company_id
      AND LOWER(COALESCE(p.app_role::TEXT, '')) IN ('admin', 'owner', 'manager')
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
-- This allows the view JOIN to work
CREATE POLICY "profiles_select_company"
ON profiles FOR SELECT
USING (
  company_id IS NOT NULL
  AND company_id = public.get_user_company_id_safe()
  AND public.get_user_company_id_safe() IS NOT NULL
);

-- Step 4: Recreate view with site_id
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
  
  -- Calculated fields
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

GRANT SELECT ON leave_balances_enhanced_view TO authenticated;

