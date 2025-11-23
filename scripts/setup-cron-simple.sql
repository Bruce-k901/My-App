-- ============================================================================
-- SIMPLE CRON SETUP - Copy and paste into Supabase SQL Editor
-- ============================================================================
-- ⚠️ STEP 1: Replace YOUR_SERVICE_ROLE_KEY_HERE with your actual key
-- ⚠️ STEP 2: Copy ALL lines below and paste into SQL Editor
-- ⚠️ STEP 3: Click "Run"
-- ============================================================================

-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove existing job if it exists
SELECT cron.unschedule('generate-daily-tasks-http')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'generate-daily-tasks-http');

-- Create the cron job (REPLACE YOUR_SERVICE_ROLE_KEY_HERE FIRST!)
SELECT cron.schedule(
  'generate-daily-tasks-http',
  '0 3 * * *',
  $$SELECT net.http_post(
    url := 'https://xijoybubtrgbrhquqwrx.supabase.co/functions/v1/generate-daily-tasks',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY_HERE", "Content-Type": "application/json"}'::jsonb
  )$$
);

-- Verify it was created
SELECT 
  jobid,
  jobname,
  schedule,
  active,
  CASE 
    WHEN command LIKE '%YOUR_SERVICE_ROLE_KEY_HERE%' THEN '⚠️ WARNING: You forgot to replace the key!'
    ELSE '✅ Looks good!'
  END as status
FROM cron.job 
WHERE jobname = 'generate-daily-tasks-http';
