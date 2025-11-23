-- ============================================================================
-- CRON STATUS CHECK
-- ============================================================================
-- Run this in Supabase SQL Editor to check the current cron configuration
-- ============================================================================

-- 1. Check if pg_cron extension is enabled
SELECT 
  extname as extension_name,
  extversion as version
FROM pg_extension 
WHERE extname = 'pg_cron';

-- 2. Check all scheduled cron jobs
SELECT 
  jobid,
  jobname,
  schedule,
  command,
  active,
  nodename,
  nodeport
FROM cron.job
ORDER BY jobname;

-- 3. Check recent cron job runs (last 7 days)
SELECT 
  runid,
  jobid,
  job_pid,
  database,
  username,
  command,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details
WHERE start_time > NOW() - INTERVAL '7 days'
ORDER BY start_time DESC
LIMIT 20;

-- 4. Check if generate_daily_tasks_direct function exists
SELECT 
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  d.description
FROM pg_proc p
LEFT JOIN pg_description d ON p.oid = d.objoid
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname LIKE '%generate%daily%'
ORDER BY p.proname;

-- 5. Check active site_checklists that should generate tasks
SELECT 
  frequency,
  COUNT(*) as config_count
FROM site_checklists
WHERE active = true
GROUP BY frequency
ORDER BY frequency;

-- 6. Check tasks generated today
SELECT 
  DATE(generated_at) as generation_date,
  COUNT(*) as tasks_generated,
  MIN(generated_at) as first_task_time,
  MAX(generated_at) as last_task_time
FROM checklist_tasks
WHERE DATE(generated_at) = CURRENT_DATE
GROUP BY DATE(generated_at);

-- 7. Check tasks generated in last 7 days
SELECT 
  DATE(generated_at) as generation_date,
  COUNT(*) as tasks_generated
FROM checklist_tasks
WHERE generated_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(generated_at)
ORDER BY generation_date DESC;

-- ============================================================================
-- INTERPRETATION GUIDE
-- ============================================================================
-- 
-- Query 1: Should show pg_cron extension if database cron is available
-- Query 2: Should show NO jobs if database cron is disabled (expected)
-- Query 3: Shows recent cron executions (will be empty if disabled)
-- Query 4: Shows database functions for task generation
-- Query 5: Shows how many active configurations exist
-- Query 6: Shows if tasks were generated today (should be 0 if cron didn't run)
-- Query 7: Shows task generation history
-- ============================================================================
