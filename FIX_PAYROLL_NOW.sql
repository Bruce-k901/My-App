-- =====================================================
-- IMMEDIATE FIX: Delete old payroll runs and force recalculation
-- =====================================================
-- Run this in Supabase SQL Editor to fix the payroll period issue

-- Step 1: Delete all payroll entries (they reference payroll_runs)
DELETE FROM payroll_entries 
WHERE payroll_run_id IN (
  SELECT id FROM payroll_runs 
  WHERE company_id IN (SELECT company_id FROM profiles WHERE auth_user_id = auth.uid())
);

-- Step 2: Delete all payroll runs
DELETE FROM payroll_runs 
WHERE company_id IN (SELECT company_id FROM profiles WHERE auth_user_id = auth.uid());

-- Step 3: Verify your schedule is correct
SELECT 
  'Your Schedule:' as info,
  schedule_type,
  period_start_day,
  is_active,
  created_at
FROM payrun_schedules
WHERE company_id IN (SELECT company_id FROM profiles WHERE auth_user_id = auth.uid())
  AND is_active = true
ORDER BY created_at DESC
LIMIT 1;

-- Step 4: Verify deletion worked
SELECT 
  'Payroll runs remaining:' as info,
  COUNT(*) as count
FROM payroll_runs 
WHERE company_id IN (SELECT company_id FROM profiles WHERE auth_user_id = auth.uid());

-- After running this:
-- 1. Go to Attendance Signoff page
-- 2. Lock a week
-- 3. It will create a NEW payroll run with the correct 4-week period

