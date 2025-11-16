-- Apply New Cron Migration
-- Run this in Supabase Dashboard > SQL Editor

-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Drop existing cron job if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'generate-daily-tasks-cron') THEN
    PERFORM cron.unschedule('generate-daily-tasks-cron');
    RAISE NOTICE 'Removed existing cron job';
  END IF;
END $$;

-- Now run the full migration file: supabase/migrations/20250214000000_create_daily_task_cron.sql
-- Copy and paste the entire contents of that file here, or run it separately



