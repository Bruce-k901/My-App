-- =====================================================
-- PAYSLIPS VIEW
-- =====================================================
-- Note: This migration will be skipped if required tables don't exist yet

DO $$
BEGIN
  -- Only create view if required tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payslips')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pay_periods')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    
    EXECUTE '
    CREATE OR REPLACE VIEW payslips_view AS
    SELECT 
      ps.id as payslip_id,
      ps.company_id,
      ps.profile_id,
      ps.pay_period_id,
      ps.regular_hours,
      ps.overtime_hours,
      ps.regular_pay,
      ps.overtime_pay,
      ps.bonus,
      ps.gross_pay,
      ps.tax_paye,
      ps.national_insurance,
      ps.pension,
      ps.total_deductions,
      ps.net_pay,
      ps.tax_code,
      ps.status,
      ps.calculated_at,
      ps.paid_at,
      pp.period_start,
      pp.period_end,
      pp.pay_date,
      p.full_name as employee_name,
      p.email as employee_email,
      p.position_title,
      pr.pay_type,
      pr.base_rate,
      -- Format amounts for display (pence to pounds)
      ROUND(ps.gross_pay / 100.0, 2) as gross_pay_pounds,
      ROUND(ps.net_pay / 100.0, 2) as net_pay_pounds,
      ROUND(ps.tax_paye / 100.0, 2) as tax_pounds,
      ROUND(ps.national_insurance / 100.0, 2) as ni_pounds
    FROM payslips ps
    JOIN pay_periods pp ON pp.id = ps.pay_period_id
    JOIN profiles p ON p.id = ps.profile_id
    LEFT JOIN pay_rates pr ON pr.id = ps.pay_rate_id';

    GRANT SELECT ON payslips_view TO authenticated;
    RAISE NOTICE 'Created payslips_view';
  ELSE
    RAISE NOTICE '⚠️ Required tables (payslips, pay_periods, profiles) do not exist yet - skipping payslips_view creation';
  END IF;
END $$;

-- =====================================================
-- PAY PERIODS VIEW
-- =====================================================

DO $$
BEGIN
  -- Only create view if required tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pay_periods')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    
    EXECUTE '
    CREATE OR REPLACE VIEW pay_periods_view AS
    SELECT 
      pp.id as period_id,
      pp.company_id,
      pp.period_type,
      pp.period_start,
      pp.period_end,
      pp.pay_date,
      pp.status,
      pp.employee_count,
      ROUND(pp.total_gross / 100.0, 2) as total_gross_pounds,
      ROUND(pp.total_deductions / 100.0, 2) as total_deductions_pounds,
      ROUND(pp.total_net / 100.0, 2) as total_net_pounds,
      pp.approved_at,
      a.full_name as approved_by_name
    FROM pay_periods pp
    LEFT JOIN profiles a ON a.id = pp.approved_by';

    GRANT SELECT ON pay_periods_view TO authenticated;
    RAISE NOTICE 'Created pay_periods_view';
  ELSE
    RAISE NOTICE '⚠️ Required tables (pay_periods, profiles) do not exist yet - skipping pay_periods_view creation';
  END IF;
END $$;

-- =====================================================
-- EMPLOYEE PAY SUMMARY
-- =====================================================

CREATE OR REPLACE FUNCTION get_employee_pay_summary(p_profile_id UUID, p_year INTEGER DEFAULT NULL)
RETURNS TABLE (
  total_gross DECIMAL,
  total_tax DECIMAL,
  total_ni DECIMAL,
  total_net DECIMAL,
  payslip_count INTEGER,
  avg_gross DECIMAL
) AS $function$
DECLARE
  v_year INTEGER;
BEGIN
  -- Check if required tables exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payslips')
     OR NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pay_periods') THEN
    RETURN QUERY SELECT 0::DECIMAL, 0::DECIMAL, 0::DECIMAL, 0::DECIMAL, 0::INTEGER, 0::DECIMAL;
    RETURN;
  END IF;

  v_year := COALESCE(p_year, EXTRACT(YEAR FROM CURRENT_DATE));
  
  RETURN QUERY
  SELECT 
    ROUND(COALESCE(SUM(ps.gross_pay), 0) / 100.0, 2),
    ROUND(COALESCE(SUM(ps.tax_paye), 0) / 100.0, 2),
    ROUND(COALESCE(SUM(ps.national_insurance), 0) / 100.0, 2),
    ROUND(COALESCE(SUM(ps.net_pay), 0) / 100.0, 2),
    COUNT(*)::INTEGER,
    ROUND(COALESCE(AVG(ps.gross_pay), 0) / 100.0, 2)
  FROM payslips ps
  JOIN pay_periods pp ON pp.id = ps.pay_period_id
  WHERE ps.profile_id = p_profile_id
    AND EXTRACT(YEAR FROM pp.period_start) = v_year
    AND ps.status IN ('approved', 'paid');
END;
$function$ LANGUAGE plpgsql;

