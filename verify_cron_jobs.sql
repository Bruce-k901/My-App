-- Verify cron jobs are set up correctly
-- Run this in Supabase SQL Editor

-- Check if cron jobs exist
SELECT 
  jobid,
  jobname,
  schedule,
  command,
  nodename,
  nodeport,
  database,
  username,
  active
FROM cron.job 
WHERE jobname IN ('generate-daily-tasks-cron', 'generate-daily-tasks-afternoon')
ORDER BY jobname;

-- Check recent cron job runs
SELECT 
  j.jobname,
  jrd.start_time,
  jrd.end_time,
  jrd.status,
  jrd.return_message,
  jrd.job_pid
FROM cron.job j
LEFT JOIN cron.job_run_details jrd ON j.jobid = jrd.jobid
WHERE j.jobname IN ('generate-daily-tasks-cron', 'generate-daily-tasks-afternoon')
ORDER BY jrd.start_time DESC
LIMIT 10;

-- Test the daily tasks function manually (only if function exists)
-- If function doesn't exist, run create_daily_tasks_function.sql first
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'generate_daily_tasks_only'
  ) THEN
    RAISE NOTICE 'Function exists, testing...';
    PERFORM * FROM generate_daily_tasks_only();
  ELSE
    RAISE NOTICE 'Function does not exist. Please run create_daily_tasks_function.sql first.';
  END IF;
END $$;

