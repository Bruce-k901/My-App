-- =====================================================
-- DIAGNOSE PAYROLL ISSUES
-- =====================================================
-- Run this to see what's actually happening

-- 1. Check if function exists and what it looks like
SELECT 
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as parameters,
  pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'create_payroll_run_from_signoff'
  AND n.nspname = 'public';

-- 2. Check payrun schedule settings
SELECT 
  id,
  company_id,
  schedule_type,
  period_start_day,
  period_start_date,
  pay_date_type,
  days_after_period_end,
  is_active,
  created_at
FROM payrun_schedules
WHERE is_active = true
ORDER BY created_at DESC
LIMIT 5;

-- 3. Check existing payroll runs
SELECT 
  id,
  company_id,
  pay_period_type,
  period_start_date,
  period_end_date,
  pay_date,
  site_ids,
  total_employees,
  total_hours,
  total_gross_pay,
  status,
  created_at
FROM payroll_runs
ORDER BY created_at DESC
LIMIT 5;

-- 4. Check payroll entries
SELECT 
  pe.id,
  pe.employee_name,
  pe.pay_type,
  pe.total_hours,
  pe.hourly_rate,
  pe.annual_salary,
  pe.gross_pay,
  pe.estimated_net_pay,
  pe.total_employer_cost,
  pr.period_start_date,
  pr.period_end_date,
  pr.pay_period_type
FROM payroll_entries pe
JOIN payroll_runs pr ON pe.payroll_run_id = pr.id
ORDER BY pr.created_at DESC, pe.employee_name
LIMIT 20;

-- 5. Check employee profiles (pay info)
SELECT 
  id,
  full_name,
  pay_type,
  hourly_rate,
  annual_salary,
  company_id
FROM profiles
WHERE company_id IN (SELECT company_id FROM payrun_schedules WHERE is_active = true LIMIT 1)
ORDER BY full_name
LIMIT 20;

-- 6. Check attendance records for the period
SELECT 
  sa.id,
  sa.user_id,
  p.full_name,
  sa.clock_in_time::DATE as shift_date,
  sa.total_hours,
  sa.signed_off,
  sa.payroll_locked,
  sa.site_id
FROM staff_attendance sa
JOIN profiles p ON sa.user_id = p.id
WHERE sa.company_id IN (SELECT company_id FROM payrun_schedules WHERE is_active = true LIMIT 1)
  AND sa.clock_in_time::DATE >= '2025-12-15'
  AND sa.clock_in_time::DATE <= '2025-12-21'
ORDER BY sa.clock_in_time DESC
LIMIT 20;

