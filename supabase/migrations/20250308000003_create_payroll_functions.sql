-- =====================================================
-- CALCULATE PAYSLIP FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_payslip(
  p_profile_id UUID,
  p_pay_period_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_payslip_id UUID;
  v_company_id UUID;
  v_period RECORD;
  v_rate RECORD;
  v_hours RECORD;
  v_adjustments RECORD;
  v_gross INTEGER;
  v_tax INTEGER;
  v_ni INTEGER;
  v_deductions INTEGER;
  v_net INTEGER;
BEGIN
  SELECT company_id INTO v_company_id FROM profiles WHERE id = p_profile_id;
  
  -- Get pay period
  SELECT * INTO v_period FROM pay_periods WHERE id = p_pay_period_id;
  
  -- Get current pay rate
  SELECT * INTO v_rate FROM pay_rates 
  WHERE profile_id = p_profile_id AND is_current = true;
  
  IF v_rate IS NULL THEN
    RAISE EXCEPTION 'No pay rate found for employee';
  END IF;
  
  -- Get hours from time entries (if table exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'time_entries') THEN
    SELECT 
      COALESCE(SUM(regular_hours), 0) as regular,
      COALESCE(SUM(overtime_hours), 0) as overtime
    INTO v_hours
    FROM time_entries
    WHERE profile_id = p_profile_id
      AND DATE(clock_in) >= v_period.period_start
      AND DATE(clock_in) <= v_period.period_end
      AND status IN ('completed', 'approved');
  ELSE
    -- Default to 0 hours if time_entries doesn't exist
    v_hours.regular := 0;
    v_hours.overtime := 0;
  END IF;
  
  -- Calculate earnings
  IF v_rate.pay_type = 'hourly' THEN
    v_gross := (v_hours.regular * v_rate.base_rate) + 
               (v_hours.overtime * v_rate.base_rate * v_rate.overtime_multiplier);
  ELSIF v_rate.pay_type = 'salary' THEN
    -- Monthly: annual / 12
    v_gross := v_rate.base_rate / 12;
  ELSE
    -- Daily rate
    v_gross := v_hours.regular / 8 * v_rate.base_rate;
  END IF;
  
  -- Get additions
  SELECT COALESCE(SUM(amount), 0) INTO v_adjustments
  FROM payroll_adjustments
  WHERE profile_id = p_profile_id
    AND adjustment_type = 'addition'
    AND is_active = true
    AND (is_recurring = true OR pay_period_id = p_pay_period_id);
  
  v_gross := v_gross + v_adjustments;
  
  -- Calculate tax (simplified UK PAYE)
  v_tax := calculate_paye(v_gross);
  
  -- Calculate NI (simplified)
  v_ni := calculate_ni(v_gross);
  
  -- Get deductions
  SELECT COALESCE(SUM(amount), 0) INTO v_deductions
  FROM payroll_adjustments
  WHERE profile_id = p_profile_id
    AND adjustment_type = 'deduction'
    AND is_active = true
    AND (is_recurring = true OR pay_period_id = p_pay_period_id);
  
  v_deductions := v_deductions + v_tax + v_ni;
  v_net := v_gross - v_deductions;
  
  -- Upsert payslip
  INSERT INTO payslips (
    company_id, profile_id, pay_period_id, pay_rate_id,
    regular_hours, overtime_hours,
    regular_pay, overtime_pay, gross_pay,
    tax_paye, national_insurance, total_deductions, net_pay,
    status, calculated_at
  ) VALUES (
    v_company_id, p_profile_id, p_pay_period_id, v_rate.id,
    v_hours.regular, v_hours.overtime,
    v_hours.regular * v_rate.base_rate,
    v_hours.overtime * v_rate.base_rate * v_rate.overtime_multiplier,
    v_gross,
    v_tax, v_ni, v_deductions, v_net,
    'calculated', now()
  )
  ON CONFLICT (profile_id, pay_period_id) DO UPDATE SET
    regular_hours = EXCLUDED.regular_hours,
    overtime_hours = EXCLUDED.overtime_hours,
    regular_pay = EXCLUDED.regular_pay,
    overtime_pay = EXCLUDED.overtime_pay,
    gross_pay = EXCLUDED.gross_pay,
    tax_paye = EXCLUDED.tax_paye,
    national_insurance = EXCLUDED.national_insurance,
    total_deductions = EXCLUDED.total_deductions,
    net_pay = EXCLUDED.net_pay,
    status = 'calculated',
    calculated_at = now(),
    updated_at = now()
  RETURNING id INTO v_payslip_id;
  
  RETURN v_payslip_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SIMPLIFIED UK TAX CALCULATIONS
-- (In production, use proper tax tables)
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_paye(p_monthly_gross INTEGER)
RETURNS INTEGER AS $$
DECLARE
  v_annual INTEGER;
  v_taxable INTEGER;
  v_tax INTEGER;
  v_personal_allowance INTEGER := 1257000; -- £12,570
  v_basic_limit INTEGER := 5027000; -- £50,270
BEGIN
  v_annual := p_monthly_gross * 12;
  v_taxable := GREATEST(v_annual - v_personal_allowance, 0);
  
  IF v_taxable <= 0 THEN
    v_tax := 0;
  ELSIF v_taxable <= (v_basic_limit - v_personal_allowance) THEN
    v_tax := v_taxable * 0.20;
  ELSE
    v_tax := (v_basic_limit - v_personal_allowance) * 0.20 + 
             (v_taxable - (v_basic_limit - v_personal_allowance)) * 0.40;
  END IF;
  
  RETURN (v_tax / 12)::INTEGER;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_ni(p_monthly_gross INTEGER)
RETURNS INTEGER AS $$
DECLARE
  v_annual INTEGER;
  v_liable INTEGER;
  v_ni INTEGER;
  v_threshold INTEGER := 1257000; -- £12,570 (simplified)
  v_upper INTEGER := 5027000; -- £50,270
BEGIN
  v_annual := p_monthly_gross * 12;
  
  IF v_annual <= v_threshold THEN
    v_ni := 0;
  ELSIF v_annual <= v_upper THEN
    v_liable := v_annual - v_threshold;
    v_ni := v_liable * 0.12;
  ELSE
    v_ni := (v_upper - v_threshold) * 0.12 + (v_annual - v_upper) * 0.02;
  END IF;
  
  RETURN (v_ni / 12)::INTEGER;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- RUN PAYROLL FUNCTION
-- Calculate all payslips for a period
-- =====================================================

CREATE OR REPLACE FUNCTION run_payroll(p_pay_period_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_period RECORD;
  v_employee RECORD;
  v_count INTEGER := 0;
BEGIN
  SELECT * INTO v_period FROM pay_periods WHERE id = p_pay_period_id;
  
  -- Update period status
  UPDATE pay_periods SET status = 'processing', updated_at = now()
  WHERE id = p_pay_period_id;
  
  -- Calculate payslip for each active employee with a pay rate
  FOR v_employee IN 
    SELECT p.id FROM profiles p
    JOIN pay_rates pr ON pr.profile_id = p.id AND pr.is_current = true
    WHERE p.company_id = v_period.company_id AND p.status = 'active'
  LOOP
    PERFORM calculate_payslip(v_employee.id, p_pay_period_id);
    v_count := v_count + 1;
  END LOOP;
  
  -- Update period totals
  UPDATE pay_periods SET
    total_gross = (SELECT COALESCE(SUM(gross_pay), 0) FROM payslips WHERE pay_period_id = p_pay_period_id),
    total_deductions = (SELECT COALESCE(SUM(total_deductions), 0) FROM payslips WHERE pay_period_id = p_pay_period_id),
    total_net = (SELECT COALESCE(SUM(net_pay), 0) FROM payslips WHERE pay_period_id = p_pay_period_id),
    employee_count = v_count,
    status = 'approved',
    updated_at = now()
  WHERE id = p_pay_period_id;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

