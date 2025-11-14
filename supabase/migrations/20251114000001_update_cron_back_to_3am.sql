-- Migration: Update Today's Tasks Cron Back to 3:00 AM UTC
-- Description: Reschedules the daily task generation cron job back to 3:00 AM UTC
-- Date: 2025-11-14

-- Unschedule the existing cron job if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'generate-daily-tasks-cron') THEN
    PERFORM cron.unschedule('generate-daily-tasks-cron');
    RAISE NOTICE 'Unscheduled existing cron job: generate-daily-tasks-cron';
  END IF;
END $$;

-- Reschedule the cron job to run at 3:00 AM UTC every day
-- Cron expression: minute hour day month dayofweek
-- 0 3 * * * = 3:00 AM UTC every day
DO $$
DECLARE
  v_job_id bigint;
  v_function_name text;
BEGIN
  -- Check which function exists (could be either generate_daily_tasks_direct or generate_daily_tasks_from_active_tasks)
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'generate_daily_tasks_from_active_tasks'
  ) THEN
    v_function_name := 'generate_daily_tasks_from_active_tasks';
  ELSIF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'generate_daily_tasks_direct'
  ) THEN
    v_function_name := 'generate_daily_tasks_direct';
  ELSE
    RAISE WARNING 'Neither generate_daily_tasks_from_active_tasks() nor generate_daily_tasks_direct() function found. Cannot schedule cron job.';
    RETURN;
  END IF;

  -- Schedule the cron job
  v_job_id := cron.schedule(
    'generate-daily-tasks-cron',
    '0 3 * * *', -- 3:00 AM UTC every day
    format('SELECT %I()', v_function_name)
  );
  
  RAISE NOTICE '✅ Cron job "generate-daily-tasks-cron" rescheduled successfully for 3:00 AM UTC daily using function: %', v_function_name;
END $$;

-- Verify the cron job was created
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'generate-daily-tasks-cron') THEN
    RAISE NOTICE '✅ Verification: Cron job "generate-daily-tasks-cron" exists and is scheduled';
  ELSE
    RAISE WARNING '⚠️ Verification failed: Cron job "generate-daily-tasks-cron" was not found. Please check manually.';
  END IF;
END $$;

-- Add comment
COMMENT ON FUNCTION generate_daily_tasks_direct() IS 
'Automatically generates daily, weekly, and monthly tasks for all active templates and sites. 
Runs via pg_cron every day at 3:00 AM UTC. Handles multiple dayparts by creating separate task instances.';

