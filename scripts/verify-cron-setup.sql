-- ============================================================================
-- VERIFY CRON SETUP - Run this to confirm everything is working
-- ============================================================================

-- 1. Check cron job exists and is active
SELECT 
  '✅ CRON JOB STATUS' as check_type,
  jobid,
  jobname,
  schedule,
  active,
  CASE 
    WHEN active = true THEN '✅ ACTIVE - Will run automatically'
    ELSE '❌ INACTIVE - Needs to be activated'
  END as status
FROM cron.job 
WHERE jobname = 'generate-daily-tasks-http';

-- 2. Verify service role key is set (not placeholder)
SELECT 
  '✅ SERVICE ROLE KEY CHECK' as check_type,
  CASE 
    WHEN command LIKE '%YOUR_SERVICE_ROLE_KEY%' THEN '❌ KEY NOT REPLACED - Replace placeholder!'
    WHEN command LIKE '%Bearer%' AND command NOT LIKE '%YOUR_SERVICE_ROLE_KEY%' THEN '✅ Key appears to be set'
    ELSE '⚠️ Cannot verify key status'
  END as key_status,
  CASE 
    WHEN command LIKE '%xijoybubtrgbrhquqwrx%' THEN '✅ Correct project URL'
    ELSE '⚠️ Check project URL'
  END as url_status
FROM cron.job 
WHERE jobname = 'generate-daily-tasks-http';

-- 3. Check extensions are enabled
SELECT 
  '✅ EXTENSIONS' as check_type,
  extname as extension,
  extversion as version,
  CASE 
    WHEN extname = 'pg_cron' THEN '✅ Required for cron'
    WHEN extname = 'pg_net' THEN '✅ Required for HTTP calls'
  END as purpose
FROM pg_extension 
WHERE extname IN ('pg_cron', 'pg_net')
ORDER BY extname;

-- 4. Show next scheduled run
SELECT 
  '⏰ NEXT RUN' as check_type,
  CURRENT_TIMESTAMP as current_time_utc,
  (CURRENT_DATE + INTERVAL '1 day' + INTERVAL '3 hours')::timestamp as next_run_utc,
  CASE 
    WHEN CURRENT_TIME < '03:00:00' THEN 
      '03:00:00'::time - CURRENT_TIME
    ELSE 
      (CURRENT_DATE + INTERVAL '1 day' + INTERVAL '3 hours')::timestamp - CURRENT_TIMESTAMP
  END as time_until_next_run;

-- 5. Check recent executions (if any)
SELECT 
  '📊 RECENT EXECUTIONS' as check_type,
  COUNT(*) as execution_count,
  MAX(start_time) as last_execution,
  CASE 
    WHEN COUNT(*) = 0 THEN 'ℹ️ No executions yet (normal if just set up)'
    WHEN MAX(start_time) > NOW() - INTERVAL '1 day' THEN '✅ Recent execution found'
    ELSE '⚠️ No recent executions'
  END as status
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'generate-daily-tasks-http')
  AND start_time > NOW() - INTERVAL '7 days';

-- 6. Summary
SELECT 
  '📋 SETUP SUMMARY' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM cron.job 
      WHERE jobname = 'generate-daily-tasks-http' 
      AND active = true
      AND command NOT LIKE '%YOUR_SERVICE_ROLE_KEY%'
    ) THEN '✅ SETUP COMPLETE - Cron job is active and configured!'
    WHEN EXISTS (
      SELECT 1 FROM cron.job 
      WHERE jobname = 'generate-daily-tasks-http' 
      AND active = false
    ) THEN '⚠️ Cron job exists but is INACTIVE'
    WHEN EXISTS (
      SELECT 1 FROM cron.job 
      WHERE jobname = 'generate-daily-tasks-http' 
      AND command LIKE '%YOUR_SERVICE_ROLE_KEY%'
    ) THEN '❌ Service role key not replaced'
    ELSE '❌ Cron job does not exist'
  END as overall_status;

