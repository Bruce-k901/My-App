-- Recreate the view with SECURITY INVOKER to ensure RLS is checked properly
-- Sometimes views need to be recreated to pick up RLS changes

DROP VIEW IF EXISTS leave_balances_enhanced_view CASCADE;

-- Recreate the view
CREATE VIEW leave_balances_enhanced_view 
WITH (security_invoker = true)  -- This ensures RLS is checked for the view
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

-- Test the view
SELECT 
  'View test after recreation' as test,
  COUNT(*) as view_rows,
  COUNT(DISTINCT profile_id) as unique_employees
FROM leave_balances_enhanced_view
WHERE company_id = public.get_user_company_id_safe()
  AND year = EXTRACT(YEAR FROM CURRENT_DATE);

