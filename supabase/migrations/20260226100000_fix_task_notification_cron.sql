-- ============================================================================
-- Migration: Fix Task Notification Cron Job
-- Description: The original migration (20250216000011) had a placeholder
--              'YOUR_SERVICE_ROLE_KEY' that was never replaced, so the
--              check-task-notifications edge function was never triggered.
--
--              This migration:
--              1. Drops the broken cron job
--              2. Re-creates it with a 1-minute interval for precise timing
--              3. Uses Supabase Vault to securely store the service role key
--
-- IMPORTANT: After running this migration you MUST insert your service role
--            key into Supabase Vault. Run this in the SQL Editor:
--
--   SELECT vault.create_secret(
--     'YOUR_ACTUAL_SERVICE_ROLE_KEY_HERE',
--     'service_role_key',
--     'Service role key for edge function invocations'
--   );
--
-- You can find your service role key in:
--   Supabase Dashboard → Settings → API → service_role key
-- ============================================================================

BEGIN;

-- Ensure required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Drop the broken cron job
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'check-task-notifications-cron') THEN
    PERFORM cron.unschedule('check-task-notifications-cron');
    RAISE NOTICE 'Dropped broken check-task-notifications-cron job';
  END IF;
END $$;

-- Create a wrapper function that reads the key from Vault at runtime.
-- This avoids hardcoding the service role key in the cron schedule.
CREATE OR REPLACE FUNCTION public.invoke_check_task_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _key text;
  _url text;
BEGIN
  -- Read service role key from Vault
  SELECT decrypted_secret INTO _key
    FROM vault.decrypted_secrets
   WHERE name = 'service_role_key'
   LIMIT 1;

  IF _key IS NULL THEN
    RAISE WARNING '[task-notifications] service_role_key not found in vault — skipping';
    RETURN;
  END IF;

  -- Build the edge function URL from the project reference
  -- Supabase sets SUPABASE_URL as a database config var on managed instances
  _url := current_setting('app.settings.supabase_url', true);
  IF _url IS NULL OR _url = '' THEN
    -- Fallback: construct from project ref (works for most Supabase projects)
    _url := 'https://' || current_setting('request.headers', true)::json->>'host';
  END IF;

  -- If we still can't resolve it, use the known project URL
  _url := coalesce(
    nullif(_url, ''),
    'https://xijoybubtrgbrhquqwrx.supabase.co'
  );

  PERFORM net.http_post(
    url    := _url || '/functions/v1/check-task-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || _key
    )
  );
END;
$$;

-- Schedule the cron job to run every 1 minute
SELECT cron.schedule(
  'check-task-notifications-cron',
  '* * * * *',
  $$ SELECT public.invoke_check_task_notifications(); $$
);

-- Verify
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'check-task-notifications-cron') THEN
    RAISE NOTICE 'check-task-notifications-cron scheduled (every 1 minute via Vault key)';
  ELSE
    RAISE WARNING 'cron job creation may have failed — check manually';
  END IF;
END $$;

COMMIT;
