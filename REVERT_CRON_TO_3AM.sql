-- ============================================
-- REVERT CRON BACK TO 3:00 AM UTC
-- Run this after testing to restore the normal schedule
-- ============================================

-- Unschedule existing cron job
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'generate-daily-tasks-cron') THEN
    PERFORM cron.unschedule('generate-daily-tasks-cron');
    RAISE NOTICE 'Unscheduled existing cron job';
  END IF;
END $$;

-- Schedule cron to run at 3:00 AM UTC daily (normal schedule)
SELECT cron.schedule(
  'generate-daily-tasks-cron',
  '0 3 * * *', -- 3:00 AM UTC every day
  $$SELECT generate_daily_tasks_direct()$$
);

-- Verify the cron job was created
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'generate-daily-tasks-cron') THEN
    RAISE NOTICE '✅ Cron job restored to normal schedule: 3:00 AM UTC daily';
  ELSE
    RAISE WARNING '⚠️ Cron job creation may have failed. Please check manually.';
  END IF;
END $$;

-- Check current schedule
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
WHERE jobname = 'generate-daily-tasks-cron';

