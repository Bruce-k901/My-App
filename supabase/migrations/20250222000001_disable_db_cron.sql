-- Disable the database-level cron that was creating incomplete tasks
-- The previous migration (20250216000008) introduced a database function 'generate_daily_tasks_direct'
-- which incorrectly generated tasks directly from templates instead of site_checklists configurations.
-- This caused tasks to be created without equipment_config and other site-specific settings.

-- We are disabling this cron job so that the Edge Function (generate-daily-tasks),
-- which contains the correct logic, can be used instead.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'generate-daily-tasks-cron') THEN
    PERFORM cron.unschedule('generate-daily-tasks-cron');
    RAISE NOTICE '✅ Disabled incorrect database cron job: generate-daily-tasks-cron';
  ELSE
    RAISE NOTICE 'ℹ️ Cron job generate-daily-tasks-cron was not found (already disabled)';
  END IF;
END $$;
