-- Create a SECURITY DEFINER function to bypass RLS and return view data
-- This will help us verify the data exists and the JOIN works

-- First, ensure all RLS policies use proper casting
-- Fix leave_balances policy if needed
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

-- Now create the function
CREATE OR REPLACE FUNCTION public.get_leave_balances_enhanced(
  p_company_id UUID,
  p_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)
)
RETURNS TABLE(
  id UUID,
  company_id UUID,
  profile_id UUID,
  leave_type_id UUID,
  year INTEGER,
  entitled_days DECIMAL,
  carried_over DECIMAL,
  adjustments DECIMAL,
  taken_days DECIMAL,
  pending_days DECIMAL,
  remaining_days DECIMAL,
  full_name TEXT,
  email TEXT,
  site_id UUID,
  contracted_hours DECIMAL,
  salary DECIMAL,
  hourly_rate DECIMAL,
  annual_leave_allowance DECIMAL,
  leave_type_name TEXT,
  leave_type_code TEXT,
  leave_type_color TEXT,
  calculated_entitlement DECIMAL,
  average_hours_13_weeks DECIMAL,
  overtime_holiday_days DECIMAL,
  total_days_in_lieu DECIMAL,
  accrued_days DECIMAL,
  available_days DECIMAL,
  employee_type TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
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
  JOIN leave_types lt ON lt.id = lb.leave_type_id
  WHERE lb.company_id = p_company_id
    AND lb.year = p_year;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_leave_balances_enhanced(UUID, INTEGER) TO authenticated;

-- Test the function
SELECT 
  'Function test' as test,
  COUNT(*) as count
FROM public.get_leave_balances_enhanced(
  public.get_user_company_id_safe(),
  EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
);

-- Show sample data
SELECT 
  profile_id,
  full_name,
  leave_type_name,
  year,
  entitled_days,
  available_days
FROM public.get_leave_balances_enhanced(
  public.get_user_company_id_safe(),
  EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
)
LIMIT 5;

