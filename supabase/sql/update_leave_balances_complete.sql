-- =====================================================
-- COMPLETE UPDATE FOR LEAVE BALANCES
-- =====================================================
-- Run this SQL to:
-- 1. Fix RLS policies so managers can see all employees
-- 2. Update the view to include site_id
-- 3. Ensure all functions are up to date

-- Step 0: Create helper functions FIRST (before policies that use them)
-- Create helper function to get user's company_id (avoids RLS recursion)
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
  -- SECURITY DEFINER bypasses RLS, so we can query profiles directly
  SELECT company_id INTO v_company_id
  FROM public.profiles
  WHERE id = auth.uid() OR (auth_user_id IS NOT NULL AND auth_user_id = auth.uid())
  LIMIT 1;
  
  RETURN v_company_id;
END;
$$;

-- Create helper function to check if user is manager/admin/owner
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
  -- SECURITY DEFINER bypasses RLS, so we can query profiles directly
  SELECT app_role INTO v_role
  FROM public.profiles
  WHERE id = auth.uid() OR (auth_user_id IS NOT NULL AND auth_user_id = auth.uid())
  LIMIT 1;
  
  IF v_role IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN LOWER(COALESCE(v_role::TEXT, '')) IN ('admin', 'owner', 'manager');
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_company_id_safe() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_manager_or_above() TO authenticated;

-- Step 1: Fix RLS policies for leave_balances
DROP POLICY IF EXISTS "view_own_balances" ON leave_balances;
DROP POLICY IF EXISTS "managers_view_balances" ON leave_balances;
DROP POLICY IF EXISTS "managers_view_company_balances" ON leave_balances;
DROP POLICY IF EXISTS "admins_manage_balances" ON leave_balances;

-- Policy: Employees can view their own balances
CREATE POLICY "view_own_balances"
ON leave_balances FOR SELECT
USING (
  -- Case 1: profiles.id = auth.uid() (direct match)
  profile_id = auth.uid()
  OR
  -- Case 2: profiles.auth_user_id = auth.uid() (via auth_user_id column)
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = leave_balances.profile_id
      AND p.auth_user_id = auth.uid()
  )
);

-- Policy: Managers/Admins/Owners can view all balances in their company
-- Uses SECURITY DEFINER functions to avoid RLS recursion
CREATE POLICY "managers_view_company_balances"
ON leave_balances FOR SELECT
USING (
  -- Check if user is manager/admin/owner and balance is in same company
  (
    public.is_user_manager_or_above() = TRUE
    AND leave_balances.company_id IS NOT NULL
    AND leave_balances.company_id = public.get_user_company_id_safe()
  )
);

-- Policy: Admins/Owners can manage balances
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

-- Step 2: Update the enhanced view to include site_id
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

-- Grant permissions
GRANT SELECT ON leave_balances_enhanced_view TO authenticated;

-- Step 3: Ensure profiles RLS allows managers to see company profiles
-- This is CRITICAL because leave_balances_enhanced_view joins profiles table
-- If profiles RLS blocks the join, managers can't see other employees' balances

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "profiles_select_company" ON profiles;
DROP POLICY IF EXISTS "profiles_own_data" ON profiles;

-- Policy: Users can view their own profile
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own"
ON profiles FOR SELECT
USING (
  id = auth.uid() 
  OR (auth_user_id IS NOT NULL AND auth_user_id = auth.uid())
);

-- Policy: Users can view profiles in their company
-- This allows the view join to work - all company members can see company profiles
-- (The leave_balances RLS will still restrict which balances they can see)
-- IMPORTANT: This policy must allow ALL company profiles for the view join to work
CREATE POLICY "profiles_select_company"
ON profiles FOR SELECT
USING (
  -- Users can see profiles in their company (using function to avoid recursion)
  -- This is needed for the leave_balances_enhanced_view JOIN to work
  company_id IS NOT NULL
  AND company_id = public.get_user_company_id_safe()
  AND public.get_user_company_id_safe() IS NOT NULL
);
