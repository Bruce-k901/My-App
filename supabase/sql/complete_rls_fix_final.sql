-- COMPLETE RLS FIX - Final attempt
-- This fixes all RLS policies to ensure the view works

-- Step 1: Fix profiles RLS (CRITICAL for view JOIN)
DROP POLICY IF EXISTS "profiles_select_company" ON profiles;

CREATE POLICY "profiles_select_company"
ON profiles FOR SELECT
USING (
  company_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE (p.id = auth.uid() OR (p.auth_user_id IS NOT NULL AND p.auth_user_id = auth.uid()))
      AND p.company_id = profiles.company_id
  )
);

-- Step 2: Fix leave_types RLS (CRITICAL for view JOIN)
DROP POLICY IF EXISTS "leave_types_select_company" ON leave_types;
DROP POLICY IF EXISTS "view_company_leave_types" ON leave_types;

CREATE POLICY "leave_types_select_company"
ON leave_types FOR SELECT
USING (
  company_id IS NULL  -- Global types
  OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE (p.id = auth.uid() OR (p.auth_user_id IS NOT NULL AND p.auth_user_id = auth.uid()))
      AND p.company_id = leave_types.company_id
  )
);

-- Step 3: Ensure leave_balances RLS allows managers to see all company balances
DROP POLICY IF EXISTS "managers_view_company_balances" ON leave_balances;

CREATE POLICY "managers_view_company_balances"
ON leave_balances FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE (p.id = auth.uid() OR (p.auth_user_id IS NOT NULL AND p.auth_user_id = auth.uid()))
      AND p.company_id = leave_balances.company_id
      AND LOWER(COALESCE(p.app_role::TEXT, '')) IN ('admin', 'owner', 'manager')
  )
);

-- Step 4: Recreate view
DROP VIEW IF EXISTS leave_balances_enhanced_view CASCADE;

CREATE VIEW leave_balances_enhanced_view 
WITH (security_invoker = true)
AS
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
  p.full_name,
  p.email,
  p.site_id,
  p.contracted_hours,
  p.salary,
  p.hourly_rate,
  p.annual_leave_allowance,
  lt.name as leave_type_name,
  lt.code as leave_type_code,
  lt.color as leave_type_color,
  calculate_holiday_entitlement(lb.profile_id, lb.year) as calculated_entitlement,
  calculate_average_hours_13_weeks(lb.profile_id) as average_hours_13_weeks,
  calculate_overtime_to_holiday_days(lb.profile_id, lb.year) as overtime_holiday_days,
  get_total_days_in_lieu(lb.profile_id, lb.year) as total_days_in_lieu,
  calculate_accrued_holiday_days(lb.profile_id, lb.year) as accrued_days,
  calculate_available_holiday_days(lb.profile_id, lb.leave_type_id, lb.year) as available_days,
  CASE 
    WHEN p.salary IS NOT NULL AND p.salary > 0 AND (p.hourly_rate IS NULL OR p.hourly_rate = 0) THEN 'salaried'
    WHEN p.hourly_rate IS NOT NULL AND p.hourly_rate > 0 THEN 'hourly'
    ELSE 'unknown'
  END as employee_type
FROM leave_balances lb
JOIN profiles p ON p.id = lb.profile_id
JOIN leave_types lt ON lt.id = lb.leave_type_id;

GRANT SELECT ON leave_balances_enhanced_view TO authenticated;

-- Step 5: Test
SELECT 
  'Final test' as test,
  COUNT(*) as view_rows
FROM leave_balances_enhanced_view
WHERE company_id = public.get_user_company_id_safe()
  AND year = EXTRACT(YEAR FROM CURRENT_DATE);

