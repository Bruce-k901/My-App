-- ============================================================================
-- Backfill Probation Reviews for Existing Employees
-- Description: Manually schedule probation reviews for employees who already have start_date set
-- Usage: Run this in Supabase SQL Editor to schedule probation reviews for existing employees
-- ============================================================================

-- Call the function to schedule missing probation reviews
SELECT 
  employee_id,
  employee_name,
  start_date,
  probation_date,
  scheduled,
  CASE 
    WHEN scheduled THEN '✅ Scheduled'
    ELSE '❌ Failed (no template or manager found)'
  END as status
FROM public.schedule_missing_probation_reviews();

-- View summary
SELECT 
  COUNT(*) FILTER (WHERE scheduled = true) as successfully_scheduled,
  COUNT(*) FILTER (WHERE scheduled = false) as failed,
  COUNT(*) as total_employees_processed
FROM public.schedule_missing_probation_reviews();

