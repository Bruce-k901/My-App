-- =====================================================
-- COMPLETE FIX: Delete ALL payroll data and start fresh
-- =====================================================
-- Run this FIRST to clear everything

-- Delete all payroll entries
DELETE FROM payroll_entries;

-- Delete all payroll runs
DELETE FROM payroll_runs;

-- Verify deletion
SELECT 'Payroll runs deleted' as status, COUNT(*) as remaining_runs FROM payroll_runs;
SELECT 'Payroll entries deleted' as status, COUNT(*) as remaining_entries FROM payroll_entries;

-- =====================================================
-- NOW: Check your payrun schedule settings
-- =====================================================
SELECT 
  'SCHEDULE CHECK' as check_type,
  id,
  company_id,
  schedule_type,
  period_start_day,
  days_after_period_end,
  is_active
FROM payrun_schedules
WHERE is_active = true;

-- =====================================================
-- Check employee pay rates
-- =====================================================
SELECT 
  'EMPLOYEE PAY RATES' as check_type,
  id,
  full_name,
  pay_type,
  hourly_rate,
  annual_salary,
  company_id
FROM profiles
WHERE company_id IN (
  SELECT company_id FROM payrun_schedules WHERE is_active = true LIMIT 1
)
ORDER BY full_name;

-- =====================================================
-- After running this, you MUST:
-- 1. Run the updated create_payroll_run_from_signoff_v2.sql function
-- 2. Lock a week in the attendance signoff page
-- 3. Check the payroll page

