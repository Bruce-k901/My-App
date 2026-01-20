-- =====================================================
-- FIX EMPLOYEE PAY DATA
-- =====================================================
-- This script helps identify and fix incorrect pay data

-- 1. Check for employees with suspiciously high hourly rates
-- (Anything over £50/hour is probably wrong)
SELECT 
  'HIGH HOURLY RATES (probably wrong)' as issue,
  id,
  full_name,
  pay_type,
  hourly_rate,
  annual_salary,
  'Hourly rate seems too high - check if this should be annual salary or monthly salary' as note
FROM profiles
WHERE hourly_rate > 50
  AND pay_type = 'hourly'
ORDER BY hourly_rate DESC;

-- 2. Check for employees marked as hourly but have no hourly_rate
SELECT 
  'MISSING HOURLY RATE' as issue,
  id,
  full_name,
  pay_type,
  hourly_rate,
  annual_salary,
  'Employee is marked as hourly but has no rate set' as note
FROM profiles
WHERE pay_type = 'hourly'
  AND (hourly_rate IS NULL OR hourly_rate = 0);

-- 3. Check for employees that should be salaried
SELECT 
  'SHOULD BE SALARIED?' as issue,
  id,
  full_name,
  pay_type,
  hourly_rate,
  annual_salary,
  'Check if this employee should be salaried instead of hourly' as note
FROM profiles
WHERE pay_type = 'hourly'
  AND hourly_rate > 50;  -- High rates might indicate salaried

-- =====================================================
-- MANUAL FIXES NEEDED:
-- =====================================================

-- Fix Bruce Kamp (if he's salaried):
-- UPDATE profiles 
-- SET pay_type = 'salaried',
--     annual_salary = 50000,  -- Replace with his actual annual salary
--     hourly_rate = NULL
-- WHERE full_name = 'Bruce Kamp';

-- Fix Vicky Thomas (if £1650 was meant to be monthly, convert to hourly):
-- If £1650/month = £1650 * 12 / 52 / 40 = £9.52/hour
-- Or if it's a data entry error, set to correct hourly rate:
-- UPDATE profiles 
-- SET hourly_rate = 12.00  -- Replace with her actual hourly rate
-- WHERE full_name = 'Vicky Thomas';

-- Fix Abigail Moss (if £1250 was meant to be monthly):
-- UPDATE profiles 
-- SET hourly_rate = 7.50  -- £1250/month = £7.50/hour (approx)
-- WHERE full_name = 'Abigail Moss';

-- Fix Josh Simmons (if £1350 was meant to be monthly):
-- UPDATE profiles 
-- SET hourly_rate = 8.10  -- £1350/month = £8.10/hour (approx)
-- WHERE full_name = 'Josh Simmons';

-- =====================================================
-- VALIDATION: Check all pay data looks reasonable
-- =====================================================
SELECT 
  'VALIDATION CHECK' as check_type,
  COUNT(*) FILTER (WHERE pay_type = 'hourly' AND (hourly_rate IS NULL OR hourly_rate = 0)) as hourly_no_rate,
  COUNT(*) FILTER (WHERE pay_type = 'hourly' AND hourly_rate > 50) as hourly_suspicious_rate,
  COUNT(*) FILTER (WHERE pay_type = 'salaried' AND (annual_salary IS NULL OR annual_salary = 0)) as salaried_no_salary,
  COUNT(*) FILTER (WHERE pay_type = 'salaried' AND annual_salary < 10000) as salaried_suspicious_low,
  COUNT(*) FILTER (WHERE pay_type = 'salaried' AND annual_salary > 200000) as salaried_suspicious_high
FROM profiles
WHERE company_id IN (
  SELECT company_id FROM payrun_schedules WHERE is_active = true LIMIT 1
);

