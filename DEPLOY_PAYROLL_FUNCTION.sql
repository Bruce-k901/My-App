-- =====================================================
-- DEPLOY PAYROLL FUNCTION - Complete Setup
-- =====================================================
-- Run this script in Supabase SQL Editor
-- This ensures all helper functions exist before creating the main function

-- Step 1: Ensure helper functions exist
-- =====================================================

-- Helper: Calculate pay periods per year
CREATE OR REPLACE FUNCTION get_pay_periods_per_year(p_schedule_type TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  CASE p_schedule_type
    WHEN 'weekly' THEN RETURN 52;
    WHEN 'fortnightly' THEN RETURN 26;
    WHEN 'monthly' THEN RETURN 12;
    WHEN 'four_weekly' THEN RETURN 13;
    WHEN 'last_friday' THEN RETURN 12;
    WHEN 'last_day' THEN RETURN 12;
    ELSE RETURN 12;
  END CASE;
END;
$$;

-- Helper: Calculate next pay date
CREATE OR REPLACE FUNCTION calculate_pay_date(
  p_period_end_date DATE,
  p_pay_date_type TEXT,
  p_days_after INTEGER DEFAULT 5
)
RETURNS DATE
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_pay_date DATE;
  v_year INTEGER;
  v_month INTEGER;
  v_last_day DATE;
  v_last_friday DATE;
BEGIN
  CASE p_pay_date_type
    WHEN 'days_after' THEN
      RETURN p_period_end_date + (p_days_after || ' days')::INTERVAL;
    
    WHEN 'last_friday' THEN
      -- Get last Friday of the month containing period_end_date
      v_year := EXTRACT(YEAR FROM p_period_end_date);
      v_month := EXTRACT(MONTH FROM p_period_end_date);
      v_last_day := (DATE_TRUNC('month', p_period_end_date) + INTERVAL '1 month - 1 day')::DATE;
      -- Find last Friday
      v_last_friday := v_last_day;
      WHILE EXTRACT(DOW FROM v_last_friday) != 5 LOOP
        v_last_friday := v_last_friday - INTERVAL '1 day';
      END LOOP;
      RETURN v_last_friday;
    
    WHEN 'last_day' THEN
      -- Last day of month containing period_end_date
      v_year := EXTRACT(YEAR FROM p_period_end_date);
      v_month := EXTRACT(MONTH FROM p_period_end_date);
      RETURN (DATE_TRUNC('month', p_period_end_date) + INTERVAL '1 month - 1 day')::DATE;
    
    WHEN 'same_day_next_week' THEN
      RETURN p_period_end_date + INTERVAL '7 days';
    
    ELSE
      RETURN p_period_end_date + (p_days_after || ' days')::INTERVAL;
  END CASE;
END;
$$;

-- Step 2: Drop old function if it exists
-- =====================================================
DROP FUNCTION IF EXISTS create_payroll_run_from_signoff(UUID, UUID, DATE, DATE, UUID) CASCADE;
DROP FUNCTION IF EXISTS create_payroll_run_from_signoff CASCADE;

-- Step 3: Grant execute permissions on helper functions
-- =====================================================
GRANT EXECUTE ON FUNCTION get_pay_periods_per_year TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_pay_date TO authenticated;

-- Step 4: Now run create_payroll_run_from_signoff_v2.sql
-- =====================================================
-- IMPORTANT: After running this script, you MUST also run:
-- supabase/sql/create_payroll_run_from_signoff_v2.sql
-- (The main function is too large to include here)

-- Step 5: Verify functions exist
-- =====================================================
SELECT 
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as parameters,
  pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname IN ('get_pay_periods_per_year', 'calculate_pay_date', 'create_payroll_run_from_signoff')
  AND n.nspname = 'public'
ORDER BY p.proname;

