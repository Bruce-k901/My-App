-- ============================================================================
-- Migration: Schedule Task Notification Checker Cron Job
-- Description: Sets up pg_cron to run check-task-notifications edge function
--              every 15 minutes to check task timings and create notifications
-- ============================================================================

BEGIN;

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable http extension for calling edge functions
CREATE EXTENSION IF NOT EXISTS http;

-- Drop existing cron job if it exists (to avoid duplicates)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'check-task-notifications-cron') THEN
    PERFORM cron.unschedule('check-task-notifications-cron');
  END IF;
END $$;

-- Schedule the cron job to run every 15 minutes
-- Cron expression: minute hour day month dayofweek
-- */15 * * * * = Every 15 minutes
-- NOTE: Replace YOUR_SERVICE_ROLE_KEY with your actual service role key
-- You can find this in Supabase Dashboard → Settings → API → service_role key
SELECT cron.schedule(
  'check-task-notifications-cron',
  '*/15 * * * *', -- Every 15 minutes
  $$
  SELECT net.http_post(
    url := 'https://xijoybubtrgbrhquqwrx.supabase.co/functions/v1/check-task-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
    )
  ) AS request_id;
  $$
);

-- Verify the cron job was created
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'check-task-notifications-cron') THEN
    RAISE NOTICE '✅ Cron job "check-task-notifications-cron" scheduled successfully for every 15 minutes';
  ELSE
    RAISE WARNING '⚠️ Cron job creation may have failed. Please check manually.';
  END IF;
END $$;

COMMIT;

