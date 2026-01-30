-- =====================================================
-- FUNCTION: Create payroll_run from attendance signoff (V2)
-- =====================================================
-- Supports weekly breakdowns, salaried calculations, tronc

-- Drop the old function first (parameter names changed)
-- Drop all versions that might exist
DROP FUNCTION IF EXISTS create_payroll_run_from_signoff(UUID, UUID, DATE, DATE, UUID);
DROP FUNCTION IF EXISTS create_payroll_run_from_signoff CASCADE;

-- Create or replace the function with updated parameter names
CREATE OR REPLACE FUNCTION create_payroll_run_from_signoff(
  p_company_id UUID,
  p_site_id UUID,
  p_week_start_date DATE,  -- The week that was locked (used to calculate period)
  p_week_end_date DATE,     -- The week that was locked
  p_created_by UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payroll_run_id UUID;
  v_pay_date DATE;
  v_schedule RECORD;
  v_pay_period_type TEXT;
  v_pay_periods_per_year INTEGER;
  v_days_diff INTEGER;
  v_week_1_start DATE;
  v_week_1_end DATE;
  v_week_2_start DATE;
  v_week_2_end DATE;
  v_week_3_start DATE;
  v_week_3_end DATE;
  v_week_4_start DATE;
  v_week_4_end DATE;
  v_total_employees INTEGER := 0;
  v_total_hours DECIMAL(10,2) := 0;
  v_total_gross_pay DECIMAL(12,2) := 0;
  v_total_employer_ni DECIMAL(10,2) := 0;
  v_total_employer_pension DECIMAL(10,2) := 0;
  v_total_holiday_accrual DECIMAL(10,2) := 0;
  v_total_employer_cost DECIMAL(12,2) := 0;
  v_total_tronc DECIMAL(10,2) := 0;
  v_employee_record RECORD;
  v_entry_id UUID;
  v_regular_hours DECIMAL(6,2);
  v_overtime_hours DECIMAL(6,2);
  v_holiday_hours DECIMAL(6,2);
  v_sick_hours DECIMAL(6,2);
  v_total_emp_hours DECIMAL(6,2);
  v_gross_pay DECIMAL(10,2);
  v_employer_ni DECIMAL(8,2);
  v_employer_pension DECIMAL(8,2);
  v_holiday_accrual DECIMAL(8,2);
  v_employer_cost DECIMAL(10,2);
  v_hourly_rate DECIMAL(6,2);
  v_pay_type TEXT;
  v_annual_salary DECIMAL(10,2);
  v_pension_enrolled BOOLEAN;
  v_pension_employer_pct DECIMAL(4,2);
  v_attendance_ids UUID[];
  v_signoff_ids UUID[];
  v_week_1_hours DECIMAL(6,2);
  v_week_2_hours DECIMAL(6,2);
  v_week_3_hours DECIMAL(6,2);
  v_week_4_hours DECIMAL(6,2);
  v_tronc_points DECIMAL(6,2);
  v_tronc_value DECIMAL(8,2);
  v_tronc_config RECORD;
  v_annualized_gross DECIMAL(12,2);
  v_qualifying_earnings DECIMAL(12,2);
  v_estimated_paye DECIMAL(8,2);
  v_estimated_employee_ni DECIMAL(8,2);
  v_estimated_employee_pension DECIMAL(8,2);
  v_estimated_student_loan DECIMAL(8,2);
  v_estimated_net_pay DECIMAL(10,2);
  v_tax_code TEXT;
  v_personal_allowance DECIMAL(10,2);
  v_taxable_income DECIMAL(12,2);
  v_employee_ni_threshold DECIMAL(10,2) := 12570; -- Annual
  v_employee_ni_rate DECIMAL(4,2) := 0.08; -- 8% main rate
  v_employee_ni_upper_limit DECIMAL(10,2) := 50270; -- Annual
  v_employee_ni_upper_rate DECIMAL(4,2) := 0.02; -- 2% above upper limit
  v_pension_employee_pct DECIMAL(4,2);
  v_actual_period_start DATE;
  v_actual_period_end DATE;
  v_target_date DATE; -- The date we're calculating the period for
  v_target_dow INTEGER; -- Day of week for target date (0=Sun, 1=Mon, ..., 6=Sat)
  v_schedule_dow INTEGER; -- PostgreSQL DOW for schedule day
  v_days_back INTEGER; -- Days to go back to reach schedule day
  v_temp_start DATE; -- Temporary date for calculations
  v_old_run_id UUID; -- For deleting old payroll runs
BEGIN
  -- Debug: Log the input parameters
  RAISE NOTICE 'create_payroll_run_from_signoff called: company_id=%, site_id=%, week_start=%, week_end=%', 
    p_company_id, p_site_id, p_week_start_date, p_week_end_date;
  
  -- Get schedule
  SELECT * INTO v_schedule
  FROM payrun_schedules
  WHERE company_id = p_company_id
    AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_schedule IS NULL THEN
    RAISE EXCEPTION 'No active payrun schedule found for company %. Please configure a payrun schedule in Settings.', p_company_id;
  END IF;
  
  RAISE NOTICE 'Found schedule: type=%, period_start_day=%, period_start_date=%, days_after_period_end=%', 
    v_schedule.schedule_type, v_schedule.period_start_day, v_schedule.period_start_date, v_schedule.days_after_period_end;
  
  -- CRITICAL: If schedule type doesn't match what we expect, log it
  IF v_schedule.schedule_type != 'four_weekly' THEN
    RAISE WARNING 'Schedule type is %, not four_weekly! Period calculation may be wrong.', v_schedule.schedule_type;
  END IF;
  
  -- Calculate actual pay period based on schedule and the given week date
  -- IMPORTANT: Use the week start date as the target, but calculate the FULL period
  -- For 4-weekly, this should find the start of the 4-week period containing this week
  v_target_date := p_week_start_date;
  
  RAISE NOTICE 'Target date (locked week start): %', v_target_date;
  
  -- Calculate period based on schedule type
  IF v_schedule IS NOT NULL THEN
    RAISE NOTICE 'Calculating period for schedule type: %, period_start_day: %, period_start_date: %', 
      v_schedule.schedule_type, v_schedule.period_start_day, v_schedule.period_start_date;
    
    -- Calculate period based on schedule type
    CASE v_schedule.schedule_type
      WHEN 'weekly' THEN
        -- Find the most recent occurrence of period_start_day before or on target_date
        -- period_start_day: 1=Monday, 2=Tuesday, ..., 7=Sunday
        -- PostgreSQL DOW: 0=Sunday, 1=Monday, ..., 6=Saturday
        IF v_schedule.period_start_day IS NOT NULL THEN
          -- Get the day of week for target date (0=Sun, 1=Mon, ..., 6=Sat)
          v_target_dow := EXTRACT(DOW FROM v_target_date);
          
          -- Convert schedule day to PostgreSQL DOW
          IF v_schedule.period_start_day = 7 THEN
            v_schedule_dow := 0; -- Sunday
          ELSE
            v_schedule_dow := v_schedule.period_start_day; -- Monday=1, Tuesday=2, etc.
          END IF;
          
          -- Calculate days to go back to reach the schedule day
          v_days_back := (v_target_dow - v_schedule_dow + 7) % 7;
          
          -- If we're already on the schedule day, use it; otherwise go back to previous occurrence
          IF v_days_back = 0 AND v_target_dow = v_schedule_dow THEN
            v_actual_period_start := v_target_date;
          ELSE
            v_actual_period_start := v_target_date - (v_days_back || ' days')::INTERVAL;
          END IF;
        ELSE
          -- No period_start_day specified, use Monday of the week
          v_actual_period_start := DATE_TRUNC('week', v_target_date)::DATE;
        END IF;
        v_actual_period_end := v_actual_period_start + INTERVAL '6 days';
        v_pay_period_type := 'weekly';
        
      WHEN 'fortnightly' THEN
        -- Find the most recent occurrence of period_start_day, then go back in 14-day increments
        IF v_schedule.period_start_day IS NOT NULL THEN
          -- Get the day of week for target date
          v_target_dow := EXTRACT(DOW FROM v_target_date);
          
          -- Convert schedule day to PostgreSQL DOW
          IF v_schedule.period_start_day = 7 THEN
            v_schedule_dow := 0;
          ELSE
            v_schedule_dow := v_schedule.period_start_day;
          END IF;
          
          -- Find the most recent occurrence of the schedule day
          v_days_back := (v_target_dow - v_schedule_dow + 7) % 7;
          v_temp_start := v_target_date - (v_days_back || ' days')::INTERVAL;
          
          -- Now go back in 14-day increments until we're before or on target_date
          WHILE v_temp_start > v_target_date LOOP
            v_temp_start := v_temp_start - INTERVAL '14 days';
          END LOOP;
          
          v_actual_period_start := v_temp_start;
        ELSE
          -- Default to Monday, then go back in 14-day increments
          v_actual_period_start := DATE_TRUNC('week', v_target_date)::DATE;
          WHILE v_actual_period_start > v_target_date LOOP
            v_actual_period_start := v_actual_period_start - INTERVAL '14 days';
          END LOOP;
        END IF;
        v_actual_period_end := v_actual_period_start + INTERVAL '13 days';
        v_pay_period_type := 'fortnightly';
        
      WHEN 'four_weekly' THEN
        -- Find the 4-week period that CONTAINS the target date
        -- Go back to find the period start that contains target_date
        IF v_schedule.period_start_day IS NOT NULL THEN
          -- Get the day of week for target date
          v_target_dow := EXTRACT(DOW FROM v_target_date);
          
          -- Convert schedule day to PostgreSQL DOW
          IF v_schedule.period_start_day = 7 THEN
            v_schedule_dow := 0;
          ELSE
            v_schedule_dow := v_schedule.period_start_day;
          END IF;
          
          -- Find the most recent occurrence of the schedule day
          v_days_back := (v_target_dow - v_schedule_dow + 7) % 7;
          v_temp_start := v_target_date - (v_days_back || ' days')::INTERVAL;
          
          -- Now go back in 28-day increments until target_date is within the period
          -- Period is 28 days (start to start+27)
          WHILE v_temp_start > v_target_date OR (v_temp_start + INTERVAL '27 days') < v_target_date LOOP
            IF v_temp_start > v_target_date THEN
              -- Too far forward, go back one period
              v_temp_start := v_temp_start - INTERVAL '28 days';
            ELSIF (v_temp_start + INTERVAL '27 days') < v_target_date THEN
              -- Too far back, go forward one period
              v_temp_start := v_temp_start + INTERVAL '28 days';
            END IF;
          END LOOP;
          
          v_actual_period_start := v_temp_start;
        ELSE
          -- Default to Monday, then find the 4-week period containing target_date
          v_actual_period_start := DATE_TRUNC('week', v_target_date)::DATE;
          -- Go back until we find the period start that contains target_date
          WHILE v_actual_period_start > v_target_date OR (v_actual_period_start + INTERVAL '27 days') < v_target_date LOOP
            IF v_actual_period_start > v_target_date THEN
              v_actual_period_start := v_actual_period_start - INTERVAL '28 days';
            ELSIF (v_actual_period_start + INTERVAL '27 days') < v_target_date THEN
              v_actual_period_start := v_actual_period_start + INTERVAL '28 days';
            END IF;
          END LOOP;
        END IF;
        v_actual_period_end := v_actual_period_start + INTERVAL '27 days';
        v_pay_period_type := 'four_weekly';
        RAISE NOTICE '4-weekly period calculated: start=%, end=%, contains target=%', 
          v_actual_period_start, v_actual_period_end, v_target_date;
        
      WHEN 'monthly', 'last_friday', 'last_day' THEN
        -- Monthly period - use the month containing the target date
        IF v_schedule.period_start_date IS NOT NULL THEN
          -- Specific day of month
          v_actual_period_start := DATE_TRUNC('month', v_target_date)::DATE + (v_schedule.period_start_date - 1);
          IF v_actual_period_start > v_target_date THEN
            -- Use previous month
            v_actual_period_start := (DATE_TRUNC('month', v_target_date) - INTERVAL '1 month')::DATE + (v_schedule.period_start_date - 1);
          END IF;
        ELSE
          -- First of month
          v_actual_period_start := DATE_TRUNC('month', v_target_date)::DATE;
        END IF;
        
        -- Calculate period end
        IF v_schedule.schedule_type = 'last_friday' THEN
          -- Last Friday of month
          v_actual_period_end := (DATE_TRUNC('month', v_actual_period_start) + INTERVAL '1 month - 1 day')::DATE;
          WHILE EXTRACT(DOW FROM v_actual_period_end) != 5 LOOP
            v_actual_period_end := v_actual_period_end - INTERVAL '1 day';
          END LOOP;
        ELSIF v_schedule.schedule_type = 'last_day' THEN
          -- Last day of month
          v_actual_period_end := (DATE_TRUNC('month', v_actual_period_start) + INTERVAL '1 month - 1 day')::DATE;
        ELSE
          -- Last day of month (for regular monthly)
          v_actual_period_end := (DATE_TRUNC('month', v_actual_period_start) + INTERVAL '1 month - 1 day')::DATE;
        END IF;
        v_pay_period_type := 'monthly';
        
      ELSE
        -- Default: use passed week dates
        v_actual_period_start := p_week_start_date;
        v_actual_period_end := p_week_end_date;
        v_pay_period_type := 'weekly';
    END CASE;
  ELSE
    -- No schedule - use passed week dates
    v_actual_period_start := p_week_start_date;
    v_actual_period_end := p_week_end_date;
    v_days_diff := (p_week_end_date - p_week_start_date) + 1;
    IF v_days_diff <= 7 THEN
      v_pay_period_type := 'weekly';
    ELSIF v_days_diff <= 14 THEN
      v_pay_period_type := 'fortnightly';
    ELSE
      v_pay_period_type := 'monthly';
    END IF;
  END IF;
  
  -- Calculate days difference for weekly breakdown
  v_days_diff := (v_actual_period_end - v_actual_period_start) + 1;
  
  RAISE NOTICE 'Calculated period: start=%, end=%, type=%, days=%, target_date=%', 
    v_actual_period_start, v_actual_period_end, v_pay_period_type, v_days_diff, v_target_date;
  
  -- CRITICAL CHECK: If schedule says 4-weekly but period is only 7 days, something is wrong
  IF v_schedule IS NOT NULL AND v_schedule.schedule_type = 'four_weekly' AND v_days_diff != 28 THEN
    RAISE EXCEPTION 'Period calculation error: Schedule is four_weekly but calculated period is % days (should be 28). Start=%, End=%', 
      v_days_diff, v_actual_period_start, v_actual_period_end;
  END IF;
  
  -- Verify the period calculation
  IF v_schedule IS NOT NULL AND v_schedule.schedule_type = 'four_weekly' AND v_days_diff != 28 THEN
    RAISE WARNING '4-weekly period calculated as % days instead of 28! Check calculation logic.', v_days_diff;
  END IF;
  
  v_pay_periods_per_year := get_pay_periods_per_year(COALESCE(v_schedule.schedule_type, v_pay_period_type));
  
  -- Calculate pay date
  IF v_schedule IS NOT NULL THEN
    v_pay_date := calculate_pay_date(
      v_actual_period_end,
      v_schedule.pay_date_type,
      v_schedule.days_after_period_end
    );
  ELSE
    v_pay_date := v_actual_period_end + INTERVAL '5 days';
  END IF;
  
  -- Calculate weekly breakdowns
  v_week_1_start := v_actual_period_start;
  v_week_1_end := LEAST((v_actual_period_start + INTERVAL '6 days')::DATE, v_actual_period_end);
  
  IF v_days_diff > 7 THEN
    v_week_2_start := (v_week_1_end + INTERVAL '1 day')::DATE;
    v_week_2_end := LEAST((v_week_2_start + INTERVAL '6 days')::DATE, v_actual_period_end);
  ELSE
    v_week_2_start := NULL;
    v_week_2_end := NULL;
  END IF;
  
  IF v_days_diff > 14 THEN
    v_week_3_start := (v_week_2_end + INTERVAL '1 day')::DATE;
    v_week_3_end := LEAST((v_week_3_start + INTERVAL '6 days')::DATE, v_actual_period_end);
  ELSE
    v_week_3_start := NULL;
    v_week_3_end := NULL;
  END IF;
  
  IF v_days_diff > 21 THEN
    v_week_4_start := (v_week_3_end + INTERVAL '1 day')::DATE;
    v_week_4_end := v_actual_period_end;
  ELSE
    v_week_4_start := NULL;
    v_week_4_end := NULL;
  END IF;
  
  -- Check if payroll run already exists for this EXACT period
  -- Only return existing if it matches the calculated period exactly
  SELECT id INTO v_payroll_run_id
  FROM payroll_runs
  WHERE company_id = p_company_id
      AND period_start_date = v_actual_period_start
      AND period_end_date = v_actual_period_end
      AND pay_period_type = v_pay_period_type;
  
  -- If payroll run already exists with correct period, return it
  IF v_payroll_run_id IS NOT NULL THEN
    RAISE NOTICE 'Payroll run already exists for period % to % (type: %), returning existing ID: %', 
      v_actual_period_start, v_actual_period_end, v_pay_period_type, v_payroll_run_id;
    RETURN v_payroll_run_id;
  END IF;
  
  -- Check if there's an OLD payroll run with wrong period dates that overlaps
  -- If so, delete it so we can create the correct one
  -- First, find old runs to delete
  FOR v_old_run_id IN
    SELECT id FROM payroll_runs
    WHERE company_id = p_company_id
        AND (
          -- Old run that overlaps with new period but has wrong dates
          (period_start_date <= v_actual_period_end AND period_end_date >= v_actual_period_start)
          OR
          -- Old run with wrong period type
          (pay_period_type != v_pay_period_type AND period_start_date <= v_actual_period_end AND period_end_date >= v_actual_period_start)
        )
        AND id != COALESCE(v_payroll_run_id, '00000000-0000-0000-0000-000000000000'::uuid)
  LOOP
    -- Delete entries first (foreign key constraint)
    DELETE FROM payroll_entries WHERE payroll_run_id = v_old_run_id;
    -- Then delete the run
    DELETE FROM payroll_runs WHERE id = v_old_run_id;
    RAISE NOTICE 'Deleted old payroll run % with incorrect period', v_old_run_id;
  END LOOP;
  
  RAISE NOTICE 'Creating new payroll run for period % to % (type: %, days: %)', 
    v_actual_period_start, v_actual_period_end, v_pay_period_type, v_days_diff;
  
  -- Get tronc configuration for this period
  SELECT * INTO v_tronc_config
  FROM tronc_configurations
  WHERE company_id = p_company_id
    AND (site_id = p_site_id OR site_id IS NULL)
    AND period_start_date <= v_actual_period_start
    AND period_end_date >= v_actual_period_end
    AND is_active = true
  ORDER BY site_id NULLS LAST  -- Prefer site-specific over company-wide
  LIMIT 1;
  
  -- Create payroll run
  INSERT INTO payroll_runs (
    company_id,
    pay_period_type,
    period_start_date,
    period_end_date,
    pay_date,
    week_1_start,
    week_1_end,
    week_2_start,
    week_2_end,
    week_3_start,
    week_3_end,
    week_4_start,
    week_4_end,
    site_ids,
    status,
    created_by,
    total_employees,
    total_hours,
    total_gross_pay,
    total_employer_ni,
    total_employer_pension,
    total_holiday_accrual,
    total_employer_cost,
    total_tronc
  ) VALUES (
    p_company_id,
    v_pay_period_type,
    v_actual_period_start,
    v_actual_period_end,
    v_pay_date,
    v_week_1_start,
    v_week_1_end,
    v_week_2_start,
    v_week_2_end,
    v_week_3_start,
    v_week_3_end,
    v_week_4_start,
    v_week_4_end,
    NULL,  -- Include ALL sites (NULL = all sites)
    'pending_review',
    p_created_by,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0
  ) RETURNING id INTO v_payroll_run_id;
  
  -- Process each employee
  -- Get ALL employees from the company, then get their attendance for the period
  FOR v_employee_record IN
    SELECT 
      p.id as employee_id,
      p.full_name as employee_name,
      p.payroll_id as employee_payroll_id,
      COALESCE(p.pay_type, 'hourly') as pay_type,
      p.hourly_rate,
      p.annual_salary,
      p.pension_enrolled,
      COALESCE(p.pension_employer_pct, 3.00) as pension_employer_pct,
      p.tax_code,
      p.ni_category,
      p.student_loan_plan,
      p.pension_employee_pct,
      -- Aggregate attendance data (will be 0 if no attendance)
      COALESCE(SUM(CASE WHEN sa.total_hours IS NOT NULL THEN sa.total_hours ELSE 0 END), 0) as total_hours,
      -- Weekly breakdown
      COALESCE(SUM(CASE WHEN sa.clock_in_time::DATE BETWEEN v_actual_period_start AND v_week_1_end 
               AND sa.total_hours IS NOT NULL THEN sa.total_hours ELSE 0 END), 0) as week_1_hours,
      COALESCE(SUM(CASE WHEN v_week_2_start IS NOT NULL 
               AND sa.clock_in_time::DATE BETWEEN v_week_2_start AND v_week_2_end 
               AND sa.total_hours IS NOT NULL THEN sa.total_hours ELSE 0 END), 0) as week_2_hours,
      COALESCE(SUM(CASE WHEN v_week_3_start IS NOT NULL 
               AND sa.clock_in_time::DATE BETWEEN v_week_3_start AND v_week_3_end 
               AND sa.total_hours IS NOT NULL THEN sa.total_hours ELSE 0 END), 0) as week_3_hours,
      COALESCE(SUM(CASE WHEN v_week_4_start IS NOT NULL 
               AND sa.clock_in_time::DATE BETWEEN v_week_4_start AND v_week_4_end 
               AND sa.total_hours IS NOT NULL THEN sa.total_hours ELSE 0 END), 0) as week_4_hours,
      COALESCE(ARRAY_AGG(DISTINCT sa.id) FILTER (WHERE sa.id IS NOT NULL), ARRAY[]::UUID[]) as attendance_ids,
      COALESCE(ARRAY_AGG(DISTINCT aso.id) FILTER (WHERE aso.id IS NOT NULL), ARRAY[]::UUID[]) as signoff_ids
    FROM profiles p
    LEFT JOIN staff_attendance sa ON sa.user_id = p.id
      AND sa.company_id = p_company_id
      AND sa.clock_in_time::DATE BETWEEN v_actual_period_start AND v_actual_period_end
      AND sa.clock_out_time IS NOT NULL
      AND (sa.signed_off = true OR sa.payroll_locked = true)
    LEFT JOIN attendance_signoffs aso ON aso.staff_id = p.id 
      AND aso.company_id = p_company_id
      AND aso.shift_date BETWEEN v_actual_period_start AND v_actual_period_end
      AND aso.signed_off = true
    WHERE p.company_id = p_company_id
      -- Include all active employees
      AND p.app_role IS NOT NULL  -- Only include active employees with valid roles
    GROUP BY p.id, p.full_name, p.payroll_id, p.pay_type, p.hourly_rate, 
             p.annual_salary, p.pension_enrolled, p.pension_employer_pct,
             p.tax_code, p.ni_category, p.student_loan_plan, p.pension_employee_pct
    -- Include ALL employees: those with hours OR salaried employees (even if no attendance yet)
    HAVING (
      -- Include if has hours in this period
      SUM(CASE WHEN sa.total_hours IS NOT NULL THEN sa.total_hours ELSE 0 END) > 0
      -- OR if salaried (always include salaried, even if no attendance in this period)
      OR (COALESCE(p.pay_type, 'hourly') = 'salaried' AND p.annual_salary IS NOT NULL AND p.annual_salary > 0)
    )
  LOOP
    -- Get attendance and signoff IDs
    v_attendance_ids := v_employee_record.attendance_ids;
    v_signoff_ids := v_employee_record.signoff_ids;
    
    -- Get weekly hours
    v_week_1_hours := COALESCE(v_employee_record.week_1_hours, 0);
    v_week_2_hours := COALESCE(v_employee_record.week_2_hours, 0);
    v_week_3_hours := COALESCE(v_employee_record.week_3_hours, 0);
    v_week_4_hours := COALESCE(v_employee_record.week_4_hours, 0);
    
    -- Calculate hours breakdown
    v_regular_hours := COALESCE(v_employee_record.total_hours, 0);
    v_overtime_hours := 0; -- Would need overtime flag
    v_holiday_hours := 0; -- Would need holiday flag
    v_sick_hours := 0; -- Would need sick flag
    v_total_emp_hours := v_regular_hours + v_overtime_hours + v_holiday_hours + v_sick_hours;
    
    -- Get pay details
    v_pay_type := v_employee_record.pay_type;
    v_hourly_rate := v_employee_record.hourly_rate;
    v_annual_salary := v_employee_record.annual_salary;
    v_pension_enrolled := COALESCE(v_employee_record.pension_enrolled, false);
    v_pension_employer_pct := v_employee_record.pension_employer_pct;
    
    -- Calculate gross pay
    -- Check if pay_type is actually salaried (even if marked as hourly but has annual_salary)
    IF (v_pay_type = 'salaried' OR (v_pay_type = 'hourly' AND v_annual_salary IS NOT NULL AND v_annual_salary > 0 AND v_hourly_rate IS NULL)) 
       AND v_annual_salary IS NOT NULL AND v_annual_salary > 0 THEN
      -- Salaried: annual salary / pay periods per year
      v_gross_pay := v_annual_salary / v_pay_periods_per_year;
      v_hourly_rate := v_annual_salary / 52 / 40; -- Effective hourly rate for records
      v_pay_type := 'salaried'; -- Ensure it's marked as salaried
      RAISE NOTICE 'Salaried employee %: salary=%, periods_per_year=%, gross_pay=%', 
        v_employee_record.employee_name, v_annual_salary, v_pay_periods_per_year, v_gross_pay;
    ELSE
      -- Hourly calculation
      -- Check for suspiciously high hourly rates (might be monthly/annual salary entered wrong)
      IF v_hourly_rate > 50 THEN
        RAISE WARNING 'Employee % has suspiciously high hourly_rate of £%! This might be monthly/annual salary entered incorrectly. Check profiles table.', 
          v_employee_record.employee_name, v_hourly_rate;
      END IF;
      IF v_hourly_rate IS NULL OR v_hourly_rate = 0 THEN
        RAISE WARNING 'Employee % has NULL or zero hourly_rate! Gross pay will be 0. Check profiles table.', v_employee_record.employee_name;
      END IF;
      v_gross_pay := v_total_emp_hours * COALESCE(v_hourly_rate, 0);
      RAISE NOTICE 'Hourly employee %: hours=%, rate=%, gross_pay=%', 
        v_employee_record.employee_name, v_total_emp_hours, v_hourly_rate, v_gross_pay;
    END IF;
    
    -- Calculate employer costs
    v_annualized_gross := v_gross_pay * v_pay_periods_per_year;
    
    -- Employer NI (13.8% above £9,100 annual threshold)
    IF v_annualized_gross > 9100 THEN
      v_employer_ni := ((v_annualized_gross - 9100) * 0.138) / v_pay_periods_per_year;
    ELSE
      v_employer_ni := 0;
    END IF;
    
    -- Employer Pension
    IF v_pension_enrolled AND v_annualized_gross > 6240 THEN
      v_qualifying_earnings := LEAST(v_annualized_gross - 6240, 50270 - 6240);
      IF v_qualifying_earnings > 0 THEN
        v_employer_pension := (v_qualifying_earnings * v_pension_employer_pct / 100) / v_pay_periods_per_year;
      ELSE
        v_employer_pension := 0;
      END IF;
    ELSE
      v_employer_pension := 0;
    END IF;
    
    -- Holiday accrual (12.07% for hourly workers)
    IF v_pay_type != 'salaried' AND v_hourly_rate > 0 THEN
      v_holiday_accrual := (v_total_emp_hours * 0.1207) * v_hourly_rate;
    ELSE
      v_holiday_accrual := 0;
    END IF;
    
    v_employer_cost := v_gross_pay + v_employer_ni + v_employer_pension + v_holiday_accrual;
    
    -- Calculate employee deductions
    -- Extract personal allowance from tax code (e.g., 1257L = £12,570)
    v_tax_code := COALESCE(v_employee_record.tax_code, '1257L');
    IF v_tax_code ~ '^\d+' THEN
      v_personal_allowance := (SUBSTRING(v_tax_code FROM '^(\d+)')::INTEGER) * 10;
    ELSE
      v_personal_allowance := 12570; -- Default UK personal allowance 2024/25
    END IF;
    
    -- Calculate taxable income (annualized)
    v_taxable_income := GREATEST(0, v_annualized_gross - v_personal_allowance);
    
    -- Calculate PAYE (simplified - actual uses tax bands)
    -- Basic rate: 20% on £0-£37,700 (after allowance)
    -- Higher rate: 40% on £37,701-£125,140
    -- Additional rate: 45% above £125,140
    IF v_taxable_income <= 37700 THEN
      v_estimated_paye := (v_taxable_income * 0.20) / v_pay_periods_per_year;
    ELSIF v_taxable_income <= 125140 THEN
      v_estimated_paye := ((37700 * 0.20) + ((v_taxable_income - 37700) * 0.40)) / v_pay_periods_per_year;
    ELSE
      v_estimated_paye := ((37700 * 0.20) + ((125140 - 37700) * 0.40) + ((v_taxable_income - 125140) * 0.45)) / v_pay_periods_per_year;
    END IF;
    
    -- Calculate Employee NI (8% between thresholds, 2% above)
    IF v_annualized_gross <= v_employee_ni_threshold THEN
      v_estimated_employee_ni := 0;
    ELSIF v_annualized_gross <= v_employee_ni_upper_limit THEN
      v_estimated_employee_ni := ((v_annualized_gross - v_employee_ni_threshold) * v_employee_ni_rate) / v_pay_periods_per_year;
    ELSE
      v_estimated_employee_ni := (((v_employee_ni_upper_limit - v_employee_ni_threshold) * v_employee_ni_rate) + 
                                   ((v_annualized_gross - v_employee_ni_upper_limit) * v_employee_ni_upper_rate)) / v_pay_periods_per_year;
    END IF;
    
    -- Calculate Employee Pension (on qualifying earnings)
    v_pension_employee_pct := COALESCE(v_employee_record.pension_employee_pct, 5.00);
    IF v_pension_enrolled AND v_annualized_gross > 6240 THEN
      v_qualifying_earnings := LEAST(v_annualized_gross - 6240, 50270 - 6240);
      IF v_qualifying_earnings > 0 THEN
        v_estimated_employee_pension := (v_qualifying_earnings * v_pension_employee_pct / 100) / v_pay_periods_per_year;
      ELSE
        v_estimated_employee_pension := 0;
      END IF;
    ELSE
      v_estimated_employee_pension := 0;
    END IF;
    
    -- Student loan (simplified - would need plan type)
    v_estimated_student_loan := 0; -- TODO: Calculate based on plan type if needed
    
    -- Calculate net pay
    v_estimated_net_pay := v_gross_pay - v_estimated_paye - v_estimated_employee_ni - v_estimated_employee_pension - v_estimated_student_loan;
    
    -- Get tronc points (if configured)
    v_tronc_points := 0;
    v_tronc_value := 0;
    IF v_tronc_config IS NOT NULL THEN
      -- Calculate tronc points based on hours worked
      -- Simple calculation: points = hours worked (can be customized)
      v_tronc_points := v_total_emp_hours;
      v_tronc_value := v_tronc_points * v_tronc_config.point_value;
    END IF;
    
    -- Create payroll entry
    INSERT INTO payroll_entries (
      payroll_run_id,
      company_id,
      employee_id,
      employee_name,
      employee_payroll_id,
      pay_type,
      week_1_hours,
      week_2_hours,
      week_3_hours,
      week_4_hours,
      regular_hours,
      overtime_hours,
      holiday_hours,
      sick_hours,
      total_hours,
      hourly_rate,
      annual_salary,
      pay_periods_per_year,
      regular_pay,
      overtime_pay,
      holiday_pay,
      sick_pay,
      salaried_pay,
      gross_pay,
      estimated_paye,
      estimated_employee_ni,
      estimated_employee_pension,
      estimated_student_loan,
      estimated_net_pay,
      employer_ni,
      employer_pension,
      holiday_accrual,
      total_employer_cost,
      tronc_points,
      tronc_value,
      is_salaried,
      attendance_ids,
      signoff_ids
    ) VALUES (
      v_payroll_run_id,
      p_company_id,
      v_employee_record.employee_id,
      v_employee_record.employee_name,
      v_employee_record.employee_payroll_id,
      v_pay_type,
      v_week_1_hours,
      v_week_2_hours,
      v_week_3_hours,
      v_week_4_hours,
      v_regular_hours,
      v_overtime_hours,
      v_holiday_hours,
      v_sick_hours,
      v_total_emp_hours,
      v_hourly_rate,
      v_annual_salary,
      v_pay_periods_per_year,
      v_regular_hours * COALESCE(v_hourly_rate, 0),
      v_overtime_hours * COALESCE(v_hourly_rate, 0) * 1.5,
      v_holiday_hours * COALESCE(v_hourly_rate, 0),
      v_sick_hours * COALESCE(v_hourly_rate, 0),
      CASE WHEN v_pay_type = 'salaried' THEN v_gross_pay ELSE 0 END,
      v_gross_pay,
      v_estimated_paye,
      v_estimated_employee_ni,
      v_estimated_employee_pension,
      v_estimated_student_loan,
      v_estimated_net_pay,
      v_employer_ni,
      v_employer_pension,
      v_holiday_accrual,
      v_employer_cost,
      v_tronc_points,
      v_tronc_value,
      (v_pay_type = 'salaried'),
      v_attendance_ids,
      v_signoff_ids
    ) RETURNING id INTO v_entry_id;
    
    -- Accumulate totals
    v_total_employees := v_total_employees + 1;
    v_total_hours := v_total_hours + v_total_emp_hours;
    v_total_gross_pay := v_total_gross_pay + v_gross_pay;
    v_total_employer_ni := v_total_employer_ni + v_employer_ni;
    v_total_employer_pension := v_total_employer_pension + v_employer_pension;
    v_total_holiday_accrual := v_total_holiday_accrual + v_holiday_accrual;
    v_total_employer_cost := v_total_employer_cost + v_employer_cost;
    v_total_tronc := v_total_tronc + v_tronc_value;
  END LOOP;
  
  -- Update payroll run totals
  UPDATE payroll_runs
  SET
    total_employees = v_total_employees,
    total_hours = v_total_hours,
    total_gross_pay = v_total_gross_pay,
    total_employer_ni = v_total_employer_ni,
    total_employer_pension = v_total_employer_pension,
    total_holiday_accrual = v_total_holiday_accrual,
    total_employer_cost = v_total_employer_cost,
    total_tronc = v_total_tronc
  WHERE id = v_payroll_run_id;
  
  RETURN v_payroll_run_id;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error details
    RAISE WARNING 'Error in create_payroll_run_from_signoff: % - %', SQLSTATE, SQLERRM;
    -- Re-raise with more context
    RAISE EXCEPTION 'Failed to create payroll run: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
END;
$$;

GRANT EXECUTE ON FUNCTION create_payroll_run_from_signoff TO authenticated;

