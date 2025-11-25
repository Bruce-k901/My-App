-- ============================================================================
-- IMPROVED CRON SETUP SCRIPT
-- ============================================================================
-- This script sets up the daily task generation cron job with better
-- error handling and verification.
--
-- ⚠️ BEFORE RUNNING:
-- 1. Get your service role key from: Supabase Dashboard → Settings → API
-- 2. Replace YOUR_SERVICE_ROLE_KEY_HERE below with your actual key
-- 3. Verify the project URL is correct (currently: xijoybubtrgbrhquqwrx)
-- ============================================================================

-- Step 1: Enable required extensions
DO $$
BEGIN
  -- Enable pg_cron
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    CREATE EXTENSION pg_cron;
    RAISE NOTICE '✅ Enabled pg_cron extension';
  ELSE
    RAISE NOTICE 'ℹ️ pg_cron extension already enabled';
  END IF;

  -- Enable pg_net (required for HTTP calls)
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    CREATE EXTENSION pg_net;
    RAISE NOTICE '✅ Enabled pg_net extension';
  ELSE
    RAISE NOTICE 'ℹ️ pg_net extension already enabled';
  END IF;
END $$;

-- Step 2: Remove any existing cron job with the same name
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'generate-daily-tasks-http') THEN
    PERFORM cron.unschedule('generate-daily-tasks-http');
    RAISE NOTICE '✅ Removed existing cron job';
  ELSE
    RAISE NOTICE 'ℹ️ No existing cron job to remove';
  END IF;
END $$;

-- Step 3: Create the cron job
-- ⚠️ REPLACE YOUR_SERVICE_ROLE_KEY_HERE WITH YOUR ACTUAL KEY!
DO $$
DECLARE
  v_service_role_key TEXT := 'YOUR_SERVICE_ROLE_KEY_HERE';
  v_project_url TEXT := 'https://xijoybubtrgbrhquqwrx.supabase.co';
  v_function_url TEXT;
  v_job_id BIGINT;
BEGIN
  -- Validate service role key was replaced
  IF v_service_role_key = 'YOUR_SERVICE_ROLE_KEY_HERE' THEN
    RAISE EXCEPTION '❌ ERROR: You must replace YOUR_SERVICE_ROLE_KEY_HERE with your actual service role key!';
  END IF;

  -- Build function URL
  v_function_url := v_project_url || '/functions/v1/generate-daily-tasks';

  -- Schedule the cron job
  SELECT cron.schedule(
    'generate-daily-tasks-http',
    '0 3 * * *',  -- 3:00 AM UTC daily
    format(
      'SELECT net.http_post(
        url := %L,
        headers := %L::jsonb
      )',
      v_function_url,
      json_build_object(
        'Authorization', 'Bearer ' || v_service_role_key,
        'Content-Type', 'application/json'
      )::text
    )
  ) INTO v_job_id;

  RAISE NOTICE '✅ Cron job created successfully (ID: %)', v_job_id;
  RAISE NOTICE '✅ Schedule: 0 3 * * * (3:00 AM UTC daily)';
  RAISE NOTICE '✅ Function URL: %', v_function_url;
END $$;

-- Step 4: Verify the cron job was created correctly
SELECT 
  '📋 VERIFICATION' as step,
  jobid,
  jobname,
  schedule,
  active,
  CASE 
    WHEN active = true THEN '✅ Active'
    ELSE '❌ Inactive'
  END as status,
  CASE 
    WHEN command LIKE '%YOUR_SERVICE_ROLE_KEY%' THEN '❌ Service role key not replaced!'
    WHEN command LIKE '%Bearer%' THEN '✅ Service role key appears to be set'
    ELSE '⚠️ Cannot verify'
  END as key_status
FROM cron.job 
WHERE jobname = 'generate-daily-tasks-http';

-- Step 5: Show next scheduled run time (approximate)
SELECT 
  '⏰ NEXT RUN' as info,
  CASE 
    WHEN CURRENT_TIME < '03:00:00' THEN 
      CURRENT_DATE || ' 03:00:00 UTC'::timestamp
    ELSE 
      (CURRENT_DATE + INTERVAL '1 day') || ' 03:00:00 UTC'::timestamp
  END as next_scheduled_run,
  NOW() as current_time,
  CASE 
    WHEN CURRENT_TIME < '03:00:00' THEN 
      '03:00:00'::time - CURRENT_TIME
    ELSE 
      '27:00:00'::interval - (CURRENT_TIME - '03:00:00'::time)
  END as time_until_next_run;

-- ============================================================================
-- MANUAL TEST (Optional - Uncomment to test immediately)
-- ============================================================================
-- Replace YOUR_SERVICE_ROLE_KEY_HERE with your actual key before uncommenting:
--
-- SELECT net.http_post(
--   url := 'https://xijoybubtrgbrhquqwrx.supabase.co/functions/v1/generate-daily-tasks',
--   headers := json_build_object(
--     'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY_HERE',
--     'Content-Type', 'application/json'
--   )::jsonb
-- );
-- ============================================================================

