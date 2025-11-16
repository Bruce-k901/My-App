-- ============================================
-- TEMPORARY: Schedule cron for testing at 11am BST (10am UTC) today
-- This is for testing purposes only - remember to revert to 3am UTC after testing
-- ============================================

-- Unschedule existing cron job
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'generate-daily-tasks-cron') THEN
    PERFORM cron.unschedule('generate-daily-tasks-cron');
    RAISE NOTICE 'Unscheduled existing cron job for testing';
  END IF;
END $$;

-- Schedule cron to run at 10:00 UTC today (11:00 BST)
-- Cron expression: minute hour day month dayofweek
-- '0 10 * * *' = 10:00 AM UTC every day (which is 11:00 AM BST)
SELECT cron.schedule(
  'generate-daily-tasks-cron',
  '0 10 * * *', -- 10:00 AM UTC = 11:00 AM BST
  $$SELECT generate_daily_tasks_direct()$$
);

-- Verify the cron job was created
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'generate-daily-tasks-cron') THEN
    RAISE NOTICE '✅ Cron job rescheduled for testing: 10:00 AM UTC (11:00 AM BST) daily';
    RAISE NOTICE '⚠️ REMEMBER: This is temporary for testing. Revert to 3:00 AM UTC after testing.';
  ELSE
    RAISE WARNING '⚠️ Cron job creation may have failed. Please check manually.';
  END IF;
END $$;

-- ============================================
-- MANUAL TEST: Run the function immediately for testing
-- Uncomment the line below to run it right now instead of waiting for 11am
-- ============================================

-- SELECT * FROM generate_daily_tasks_direct();


