-- ============================================================================
-- Enable Edge Function Cron via Database
-- ============================================================================
-- This migration sets up a database cron job that calls the Edge Function
-- via HTTP at 3:00 AM UTC daily.
--
-- ⚠️ IMPORTANT: Replace YOUR_SERVICE_ROLE_KEY_HERE before running!
-- Get your key from: Supabase Dashboard → Settings → API → service_role
-- ============================================================================

-- Ensure pg_cron extension is enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Unschedule any existing jobs with this name
SELECT cron.unschedule('generate-daily-tasks-http')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'generate-daily-tasks-http');

-- ============================================================================
-- Schedule the cron job
-- ⚠️ REPLACE 'YOUR_SERVICE_ROLE_KEY_HERE' WITH YOUR ACTUAL KEY BELOW!
-- ============================================================================

SELECT cron.schedule(
  'generate-daily-tasks-http',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://xijoybubtrgbrhquqwrx.supabase.co/functions/v1/generate-daily-tasks',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY_HERE", "Content-Type": "application/json"}'::jsonb
  );
  $$
);

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Check if cron job was created:
SELECT 
  jobid,
  jobname,
  schedule,
  active,
  CASE 
    WHEN command LIKE '%YOUR_SERVICE_ROLE_KEY_HERE%' THEN '⚠️ WARNING: Service role key not replaced!'
    ELSE '✅ Key appears to be set'
  END as key_status
FROM cron.job 
WHERE jobname = 'generate-daily-tasks-http';

-- ============================================================================
-- MANUAL TEST (Optional)
-- ============================================================================
-- Uncomment and replace YOUR_SERVICE_ROLE_KEY_HERE to test manually:
--
-- SELECT net.http_post(
--   url := 'https://xijoybubtrgbrhquqwrx.supabase.co/functions/v1/generate-daily-tasks',
--   headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY_HERE", "Content-Type": "application/json"}'::jsonb
-- );
-- ============================================================================
