-- =====================================================
-- HOLIDAY BALANCE CALCULATION FUNCTIONS
-- =====================================================
-- Functions to calculate holiday entitlement based on:
-- - Full-time salaried: Standard 28 days
-- - Part-time/hourly: Based on average hours worked over last 13 weeks
-- - Days in lieu
-- - Overtime conversions

-- Function: Calculate average hours worked over last 13 weeks
CREATE OR REPLACE FUNCTION calculate_average_hours_13_weeks(
  p_profile_id UUID,
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS DECIMAL AS $$
DECLARE
  v_total_hours DECIMAL := 0;
  v_weeks_count INTEGER := 0;
  v_week_start DATE;
  v_week_end DATE;
  v_week_hours DECIMAL;
BEGIN
  -- Check if time_entries table exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'time_entries') THEN
    -- Fallback to contracted hours if time_entries doesn't exist
    SELECT COALESCE(contracted_hours, 0)
    INTO v_week_hours
    FROM profiles
    WHERE id = p_profile_id;
    
    RETURN COALESCE(v_week_hours, 0);
  END IF;
  
  -- Calculate backwards from end_date for up to 13 weeks
  FOR i IN 0..12 LOOP
    -- Calculate week start (Monday) and end (Sunday)
    v_week_end := p_end_date - (i * 7);
    v_week_start := v_week_end - 6;
    
    -- Get total hours worked in this week from time_entries
    SELECT COALESCE(SUM(COALESCE(net_hours, gross_hours, 0)), 0)
    INTO v_week_hours
    FROM time_entries
    WHERE profile_id = p_profile_id
      AND entry_type = 'shift'
      AND status IN ('completed', 'approved')
      AND clock_in >= v_week_start::TIMESTAMPTZ
      AND clock_in < (v_week_end + 1)::TIMESTAMPTZ;
    
    -- Only count weeks where hours were worked
    IF v_week_hours > 0 THEN
      v_total_hours := v_total_hours + v_week_hours;
      v_weeks_count := v_weeks_count + 1;
    END IF;
  END LOOP;
  
  -- Return average hours per week
  IF v_weeks_count > 0 THEN
    RETURN ROUND((v_total_hours / v_weeks_count)::DECIMAL, 2);
  ELSE
    -- If no hours found, return contracted hours or 0
    SELECT COALESCE(contracted_hours, 0)
    INTO v_week_hours
    FROM profiles
    WHERE id = p_profile_id;
    
    RETURN COALESCE(v_week_hours, 0);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Calculate holiday entitlement based on employee type
CREATE OR REPLACE FUNCTION calculate_holiday_entitlement(
  p_profile_id UUID,
  p_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)
)
RETURNS DECIMAL AS $$
DECLARE
  v_profile RECORD;
  v_average_hours DECIMAL;
  v_entitlement DECIMAL;
  v_contracted_hours DECIMAL;
  v_full_time_hours DECIMAL := 37.5; -- Standard full-time hours per week
  v_standard_holiday_days DECIMAL := 28; -- Standard UK holiday entitlement
BEGIN
  -- Get employee profile data
  SELECT 
    p.id,
    p.salary,
    p.hourly_rate,
    p.contracted_hours,
    p.annual_leave_allowance,
    p.company_id
  INTO v_profile
  FROM profiles p
  WHERE p.id = p_profile_id;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- If custom annual leave allowance is set, use that
  IF v_profile.annual_leave_allowance IS NOT NULL AND v_profile.annual_leave_allowance > 0 THEN
    RETURN v_profile.annual_leave_allowance;
  END IF;
  
  -- Salaried employees (have salary, no hourly_rate) get standard 28 days
  IF v_profile.salary IS NOT NULL AND v_profile.salary > 0 AND (v_profile.hourly_rate IS NULL OR v_profile.hourly_rate = 0) THEN
    RETURN v_standard_holiday_days;
  END IF;
  
  -- Hourly/part-time employees: calculate based on average hours
  -- Calculate average hours over last 13 weeks
  v_average_hours := calculate_average_hours_13_weeks(p_profile_id);
  
  -- Use contracted hours if average hours is 0 or very low
  IF v_average_hours < 5 THEN
    v_average_hours := COALESCE(v_profile.contracted_hours, 0);
  END IF;
  
  -- Calculate entitlement: (average_hours / full_time_hours) * standard_days
  IF v_average_hours > 0 THEN
    v_entitlement := (v_average_hours / v_full_time_hours) * v_standard_holiday_days;
    -- Round to 2 decimal places
    RETURN ROUND(v_entitlement, 2);
  END IF;
  
  -- Default fallback
  RETURN 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Calculate days in lieu from overtime
-- Converts overtime hours to holiday days (typically 1 day = 7.5 hours)
CREATE OR REPLACE FUNCTION calculate_overtime_to_holiday_days(
  p_profile_id UUID,
  p_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS DECIMAL AS $$
DECLARE
  v_total_overtime_hours DECIMAL := 0;
  v_hours_per_day DECIMAL := 7.5; -- Standard working hours per day
  v_start_date DATE;
  v_end_date DATE;
BEGIN
  -- Check if time_entries table exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'time_entries') THEN
    RETURN 0;
  END IF;
  
  -- Set date range for the year
  IF p_start_date IS NULL THEN
    v_start_date := DATE(p_year || '-01-01');
  ELSE
    v_start_date := p_start_date;
  END IF;
  
  IF p_end_date IS NULL THEN
    v_end_date := DATE(p_year || '-12-31');
  ELSE
    v_end_date := p_end_date;
  END IF;
  
  -- Sum overtime hours from time_entries
  SELECT COALESCE(SUM(COALESCE(overtime_hours, 0)), 0)
  INTO v_total_overtime_hours
  FROM time_entries
  WHERE profile_id = p_profile_id
    AND entry_type = 'shift'
    AND status IN ('completed', 'approved')
    AND clock_in >= v_start_date::TIMESTAMPTZ
    AND clock_in < (v_end_date + 1)::TIMESTAMPTZ
    AND overtime_hours > 0;
  
  -- Convert overtime hours to days (round to 2 decimal places)
  IF v_total_overtime_hours > 0 THEN
    RETURN ROUND((v_total_overtime_hours / v_hours_per_day)::DECIMAL, 2);
  END IF;
  
  RETURN 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get total days in lieu (overtime + manual adjustments)
CREATE OR REPLACE FUNCTION get_total_days_in_lieu(
  p_profile_id UUID,
  p_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)
)
RETURNS DECIMAL AS $$
DECLARE
  v_overtime_days DECIMAL;
  v_manual_adjustments DECIMAL;
BEGIN
  -- Calculate overtime to holiday days
  v_overtime_days := calculate_overtime_to_holiday_days(p_profile_id, p_year);
  
  -- Get manual adjustments from leave_balances (positive adjustments are days in lieu)
  SELECT COALESCE(SUM(CASE WHEN adjustments > 0 THEN adjustments ELSE 0 END), 0)
  INTO v_manual_adjustments
  FROM leave_balances
  WHERE profile_id = p_profile_id
    AND year = p_year;
  
  RETURN COALESCE(v_overtime_days, 0) + COALESCE(v_manual_adjustments, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Calculate accrued holiday days based on employment start date and leave year
-- This calculates how much holiday has been accrued up to the current date
CREATE OR REPLACE FUNCTION calculate_accrued_holiday_days(
  p_profile_id UUID,
  p_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  p_as_of_date DATE DEFAULT CURRENT_DATE
)
RETURNS DECIMAL AS $$
DECLARE
  v_profile RECORD;
  v_company RECORD;
  v_entitlement DECIMAL;
  v_accrued_days DECIMAL;
  v_leave_year_start DATE;
  v_leave_year_end DATE;
  v_employment_start DATE;
  v_days_in_year INTEGER;
  v_days_worked INTEGER;
  v_holiday_year_month INTEGER;
  v_holiday_year_day INTEGER;
BEGIN
  -- Get employee profile and entitlement
  SELECT 
    p.start_date,
    p.annual_leave_allowance,
    p.leave_year_start,
    p.company_id,
    calculate_holiday_entitlement(p_profile_id, p_year) as calculated_entitlement
  INTO v_profile
  FROM profiles p
  WHERE p.id = p_profile_id;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- Get the full entitlement for the year
  v_entitlement := COALESCE(v_profile.calculated_entitlement, 0);
  
  -- If no entitlement, return 0
  IF v_entitlement <= 0 THEN
    RETURN 0;
  END IF;
  
  -- Get company holiday year settings
  SELECT 
    c.holiday_year_start_month,
    c.holiday_year_start_day
  INTO v_company
  FROM companies c
  WHERE c.id = v_profile.company_id;
  
  -- Determine leave year start date (priority: company settings > profile settings > default)
  IF v_company.holiday_year_start_month IS NOT NULL AND v_company.holiday_year_start_day IS NOT NULL THEN
    -- Use company-level holiday year start (e.g., month=4, day=1 for April 1st)
    v_holiday_year_month := v_company.holiday_year_start_month;
    v_holiday_year_day := v_company.holiday_year_start_day;
    v_leave_year_start := DATE(p_year || '-' || LPAD(v_holiday_year_month::TEXT, 2, '0') || '-' || LPAD(v_holiday_year_day::TEXT, 2, '0'));
  ELSIF v_profile.leave_year_start IS NOT NULL THEN
    -- Use profile-level leave year start (legacy support)
    v_leave_year_start := DATE(p_year || '-' || TO_CHAR(v_profile.leave_year_start::DATE, 'MM-DD'));
  ELSE
    -- Default to calendar year (January 1st)
    v_leave_year_start := DATE(p_year || '-01-01');
  END IF;
  
  -- Leave year end
  v_leave_year_end := (v_leave_year_start + INTERVAL '1 year' - INTERVAL '1 day')::DATE;
  
  -- If as_of_date is before leave year start, return 0
  IF p_as_of_date < v_leave_year_start THEN
    RETURN 0;
  END IF;
  
  -- If as_of_date is after leave year end, return full entitlement
  IF p_as_of_date >= v_leave_year_end THEN
    RETURN v_entitlement;
  END IF;
  
  -- Determine employment start date (use leave year start if employee started before)
  IF v_profile.start_date IS NOT NULL THEN
    v_employment_start := GREATEST(v_profile.start_date::DATE, v_leave_year_start);
  ELSE
    v_employment_start := v_leave_year_start;
  END IF;
  
  -- Calculate days worked in the leave year up to as_of_date
  v_days_worked := GREATEST(0, p_as_of_date - v_employment_start + 1);
  
  -- Calculate total days in the leave year
  v_days_in_year := v_leave_year_end - v_leave_year_start + 1;
  
  -- Calculate accrued days: (days_worked / days_in_year) * entitlement
  -- This gives pro-rata accrual based on days worked in the leave year
  IF v_days_in_year > 0 THEN
    v_accrued_days := (v_days_worked::DECIMAL / v_days_in_year::DECIMAL) * v_entitlement;
  ELSE
    v_accrued_days := 0;
  END IF;
  
  -- Round to 2 decimal places and ensure it doesn't exceed entitlement
  RETURN ROUND(GREATEST(0, LEAST(v_accrued_days, v_entitlement))::DECIMAL, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Calculate available holiday days (accrued - taken - pending)
CREATE OR REPLACE FUNCTION calculate_available_holiday_days(
  p_profile_id UUID,
  p_leave_type_id UUID,
  p_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  p_as_of_date DATE DEFAULT CURRENT_DATE
)
RETURNS DECIMAL AS $$
DECLARE
  v_accrued_days DECIMAL;
  v_taken_days DECIMAL;
  v_pending_days DECIMAL;
  v_carried_over DECIMAL;
  v_adjustments DECIMAL;
  v_available DECIMAL;
BEGIN
  -- Calculate accrued days up to current date
  v_accrued_days := calculate_accrued_holiday_days(p_profile_id, p_year, p_as_of_date);
  
  -- Get taken and pending days from leave_balances
  SELECT 
    COALESCE(taken_days, 0),
    COALESCE(pending_days, 0),
    COALESCE(carried_over, 0),
    COALESCE(adjustments, 0)
  INTO v_taken_days, v_pending_days, v_carried_over, v_adjustments
  FROM leave_balances
  WHERE profile_id = p_profile_id
    AND leave_type_id = p_leave_type_id
    AND year = p_year;
  
  -- Calculate available: accrued + carried_over + adjustments - taken - pending
  v_available := v_accrued_days + COALESCE(v_carried_over, 0) + COALESCE(v_adjustments, 0) - COALESCE(v_taken_days, 0) - COALESCE(v_pending_days, 0);
  
  -- Return available days (can't be negative)
  RETURN ROUND(GREATEST(0, v_available)::DECIMAL, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- View: Enhanced leave balances with calculated entitlements
-- Drop view first to allow column changes
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
GRANT EXECUTE ON FUNCTION calculate_average_hours_13_weeks(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_holiday_entitlement(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_overtime_to_holiday_days(UUID, INTEGER, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_total_days_in_lieu(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_accrued_holiday_days(UUID, INTEGER, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_available_holiday_days(UUID, UUID, INTEGER, DATE) TO authenticated;

