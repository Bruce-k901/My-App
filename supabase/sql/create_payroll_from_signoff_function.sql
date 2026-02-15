-- =====================================================
-- FUNCTION: Auto-create payroll_run from attendance signoff
-- =====================================================
-- This function is called when a manager locks a week
-- It automatically creates a payroll_run and payroll_entries
-- from the signed-off attendance data

CREATE OR REPLACE FUNCTION create_payroll_run_from_signoff(
  p_company_id UUID,
  p_site_id UUID,
  p_period_start_date DATE,
  p_period_end_date DATE,
  p_created_by UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payroll_run_id UUID;
  v_pay_date DATE;
  v_total_employees INTEGER := 0;
  v_total_hours DECIMAL(10,2) := 0;
  v_total_gross_pay DECIMAL(12,2) := 0;
  v_total_employer_ni DECIMAL(10,2) := 0;
  v_total_employer_pension DECIMAL(10,2) := 0;
  v_total_holiday_accrual DECIMAL(10,2) := 0;
  v_total_employer_cost DECIMAL(12,2) := 0;
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
  v_period_type TEXT;
  v_days_diff INTEGER;
  v_annualized_gross DECIMAL(12,2);
  v_qualifying_earnings DECIMAL(12,2);
BEGIN
  -- Calculate pay date (from schedule or default 5 days after period end)
  SELECT COALESCE(
    (SELECT p_period_end_date + (days_after_period_end || ' days')::INTERVAL
     FROM payrun_schedules 
     WHERE company_id = p_company_id 
     AND is_active = true 
     LIMIT 1)::DATE,
    p_period_end_date + INTERVAL '5 days'
  ) INTO v_pay_date;
  
  -- Determine pay period type based on duration
  v_days_diff := (p_period_end_date - p_period_start_date) + 1;
  IF v_days_diff <= 7 THEN
    v_period_type := 'weekly';
  ELSIF v_days_diff <= 14 THEN
    v_period_type := 'fortnightly';
  ELSE
    v_period_type := 'monthly';
  END IF;
    
    -- Create payroll run
    INSERT INTO payroll_runs (
      company_id,
      pay_period_type,
      period_start_date,
      period_end_date,
      pay_date,
      site_ids,
      status,
      created_by,
      total_employees,
      total_hours,
      total_gross_pay,
      total_employer_ni,
      total_employer_pension,
      total_holiday_accrual,
      total_employer_cost
    ) VALUES (
      p_company_id,
      v_period_type,
      p_period_start_date,
      p_period_end_date,
      v_pay_date,
      ARRAY[p_site_id],
      'draft',
      p_created_by,
      0, -- Will be updated after entries
      0,
      0,
      0,
      0,
      0,
      0
    ) RETURNING id INTO v_payroll_run_id;
    
    -- Process each employee with signed-off attendance
    FOR v_employee_record IN
      SELECT DISTINCT
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
        -- Aggregate attendance data
        SUM(CASE WHEN sa.total_hours IS NOT NULL THEN sa.total_hours ELSE 0 END) as total_hours,
        ARRAY_AGG(DISTINCT sa.id) FILTER (WHERE sa.id IS NOT NULL) as attendance_ids,
        ARRAY_AGG(DISTINCT aso.id) FILTER (WHERE aso.id IS NOT NULL) as signoff_ids
      FROM profiles p
      INNER JOIN staff_attendance sa ON sa.user_id = p.id
      LEFT JOIN attendance_signoffs aso ON aso.staff_id = p.id 
        AND aso.shift_date BETWEEN p_period_start_date AND p_period_end_date
        AND aso.signed_off = true
      WHERE p.company_id = p_company_id
        AND sa.site_id = p_site_id
        AND sa.clock_in_time::DATE BETWEEN p_period_start_date AND p_period_end_date
        AND sa.clock_out_time IS NOT NULL
        AND (sa.signed_off = true OR sa.payroll_locked = true)
      GROUP BY p.id, p.full_name, p.payroll_id, p.pay_type, p.hourly_rate, 
               p.annual_salary, p.pension_enrolled, p.pension_employer_pct,
               p.tax_code, p.ni_category, p.student_loan_plan, p.pension_employee_pct
      HAVING SUM(CASE WHEN sa.total_hours IS NOT NULL THEN sa.total_hours ELSE 0 END) > 0
    LOOP
      -- Get attendance and signoff IDs
      v_attendance_ids := v_employee_record.attendance_ids;
      v_signoff_ids := v_employee_record.signoff_ids;
      
      -- Calculate hours breakdown (simplified - assumes all hours are regular for now)
      -- In a full implementation, you'd check for overtime, holiday, sick flags
      v_regular_hours := COALESCE(v_employee_record.total_hours, 0);
      v_overtime_hours := 0; -- Would need overtime flag in attendance
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
      IF v_pay_type = 'salaried' AND v_annual_salary IS NOT NULL THEN
        -- Monthly portion for salaried
        v_gross_pay := v_annual_salary / 12;
        v_hourly_rate := v_annual_salary / 52 / 40; -- Effective hourly rate
      ELSE
        -- Hourly calculation
        v_gross_pay := v_total_emp_hours * COALESCE(v_hourly_rate, 0);
      END IF;
      
      -- Calculate employer costs (simplified estimates)
      -- Annualize for NI calculations
      v_annualized_gross := v_gross_pay * 12;
      
      -- Employer NI (13.8% above £9,100 annual threshold)
      IF v_annualized_gross > 9100 THEN
        v_employer_ni := ((v_annualized_gross - 9100) * 0.138) / 12;
      ELSE
        v_employer_ni := 0;
      END IF;
      
      -- Employer Pension (3% of qualifying earnings)
      IF v_pension_enrolled AND v_annualized_gross > 6240 THEN
        v_qualifying_earnings := LEAST(v_annualized_gross - 6240, 50270 - 6240);
        IF v_qualifying_earnings > 0 THEN
          v_employer_pension := (v_qualifying_earnings * v_pension_employer_pct / 100) / 12;
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
      
      -- Create payroll entry
      INSERT INTO payroll_entries (
        payroll_run_id,
        company_id,
        employee_id,
        employee_name,
        employee_payroll_id,
        pay_type,
        regular_hours,
        overtime_hours,
        holiday_hours,
        sick_hours,
        total_hours,
        hourly_rate,
        gross_pay,
        employer_ni,
        employer_pension,
        holiday_accrual,
        total_employer_cost,
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
        v_regular_hours,
        v_overtime_hours,
        v_holiday_hours,
        v_sick_hours,
        v_total_emp_hours,
        v_hourly_rate,
        v_gross_pay,
        v_employer_ni,
        v_employer_pension,
        v_holiday_accrual,
        v_employer_cost,
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
    status = 'pending_review'
  WHERE id = v_payroll_run_id;
  
  RETURN v_payroll_run_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_payroll_run_from_signoff TO authenticated;

