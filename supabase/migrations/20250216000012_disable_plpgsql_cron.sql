-- ============================================================================
-- Migration: Disable PL/PGSQL Task Generation Cron
-- Description: Unschedules the 'generate-daily-tasks-cron' which was running
--              the PL/PGSQL function 'generate_daily_tasks_direct'.
--              This function was generating tasks directly from templates, causing
--              issues with global templates being applied to all sites.
--              
--              The correct task generation logic is in the Edge Function:
--              supabase/functions/generate-daily-tasks/index.ts
--
--              IMPORTANT: You must ensure the Edge Function is scheduled to run daily!
--              You can schedule it via the Supabase Dashboard -> Edge Functions
--              or by running a migration that uses pg_net (requires Service Role Key).
-- ============================================================================

BEGIN;

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Unschedule the conflicting cron job
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'generate-daily-tasks-cron') THEN
    PERFORM cron.unschedule('generate-daily-tasks-cron');
    RAISE NOTICE '✅ Unscheduled conflicting cron job "generate-daily-tasks-cron"';
  ELSE
    RAISE NOTICE 'ℹ️ Cron job "generate-daily-tasks-cron" was not found (already removed)';
  END IF;
END $$;

-- Drop the PL/PGSQL function to prevent accidental usage
DROP FUNCTION IF EXISTS generate_daily_tasks_direct() CASCADE;
DROP FUNCTION IF EXISTS generate_daily_tasks() CASCADE;

COMMIT;
