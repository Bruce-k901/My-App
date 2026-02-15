-- FINAL FIX: Ensure the view works by fixing all RLS policies
-- This is a comprehensive fix that addresses all potential RLS issues

-- Step 1: Check current state
SELECT 
  'Current state' as step,
  (SELECT COUNT(*) FROM leave_balances WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid() OR auth_user_id = auth.uid() LIMIT 1) AND year = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER) as balances_count,
  (SELECT COUNT(*) FROM leave_types WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid() OR auth_user_id = auth.uid() LIMIT 1) OR company_id IS NULL) as leave_types_count;

-- Step 2: Fix leave_types RLS - Allow access to types used in balances
DROP POLICY IF EXISTS "leave_types_select_company" ON leave_types;
DROP POLICY IF EXISTS "view_company_leave_types" ON leave_types;
DROP POLICY IF EXISTS "manage_leave_types" ON leave_types;

-- Create a permissive policy that allows access to leave_types
-- This uses a simpler approach that should work
CREATE POLICY "leave_types_select_company"
ON leave_types FOR SELECT
USING (
  -- Global types
  company_id IS NULL
  OR
  -- Types in user's company
  company_id = (
    SELECT company_id FROM profiles 
    WHERE id = auth.uid() OR auth_user_id = auth.uid() 
    LIMIT 1
  )
  OR
  -- Types used in leave_balances - this is critical for the JOIN
  EXISTS (
    SELECT 1 
    FROM leave_balances lb
    WHERE lb.leave_type_id = leave_types.id
      AND lb.company_id = (
        SELECT company_id FROM profiles 
        WHERE id = auth.uid() OR auth_user_id = auth.uid() 
        LIMIT 1
      )
  )
);

-- Step 3: Ensure profiles RLS allows company access
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

-- Step 4: Ensure leave_balances RLS allows managers to see all company balances
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

-- Step 5: Recreate view with security_invoker
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

-- Step 6: Test the view
SELECT 
  'View test after fix' as step,
  COUNT(*) as view_rows,
  COUNT(DISTINCT profile_id) as unique_employees
FROM leave_balances_enhanced_view
WHERE company_id = (
  SELECT company_id FROM profiles 
  WHERE id = auth.uid() OR auth_user_id = auth.uid() 
  LIMIT 1
)
AND year = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;

-- Step 7: Show sample data
SELECT 
  'Sample data' as step,
  profile_id,
  full_name,
  leave_type_name,
  entitled_days,
  available_days
FROM leave_balances_enhanced_view
WHERE company_id = (
  SELECT company_id FROM profiles 
  WHERE id = auth.uid() OR auth_user_id = auth.uid() 
  LIMIT 1
)
AND year = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
LIMIT 5;

