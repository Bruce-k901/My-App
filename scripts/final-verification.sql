-- ============================================================================
-- FINAL VERIFICATION - Confirm cron job is fully configured
-- ============================================================================

-- 1. Verify cron job exists and is ACTIVE
SELECT 
  jobid,
  jobname,
  schedule,
  active,
  CASE 
    WHEN active = true THEN '✅ ACTIVE - Will run automatically at 3:00 AM UTC'
    ELSE '❌ INACTIVE - Cron job exists but is disabled'
  END as status
FROM cron.job 
WHERE jobname = 'generate-daily-tasks-http';

-- 2. Verify service role key is properly set (not placeholder)
SELECT 
  CASE 
    WHEN command LIKE '%YOUR_SERVICE_ROLE_KEY%' THEN 
      '❌ CRITICAL: Service role key not replaced! Replace YOUR_SERVICE_ROLE_KEY_HERE in the script.'
    WHEN command LIKE '%Bearer%' AND command NOT LIKE '%YOUR_SERVICE_ROLE_KEY%' THEN 
      '✅ Service role key appears to be configured correctly'
    ELSE 
      '⚠️ Cannot verify key status - check manually'
  END as key_verification
FROM cron.job 
WHERE jobname = 'generate-daily-tasks-http';

-- 3. Check extensions
SELECT 
  extname,
  CASE 
    WHEN extname = 'pg_cron' AND EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN '✅ Enabled'
    WHEN extname = 'pg_net' AND EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN '✅ Enabled'
    ELSE '❌ Missing'
  END as status
FROM (VALUES ('pg_cron'), ('pg_net')) AS required(extname)
WHERE EXISTS (SELECT 1 FROM pg_extension WHERE extname = required.extname);

-- 4. Summary
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM cron.job 
      WHERE jobname = 'generate-daily-tasks-http' 
      AND active = true
      AND command NOT LIKE '%YOUR_SERVICE_ROLE_KEY%'
    ) THEN 
      '🎉 SUCCESS! Cron job is fully configured and will run at 3:00 AM UTC daily.'
    WHEN EXISTS (
      SELECT 1 FROM cron.job 
      WHERE jobname = 'generate-daily-tasks-http' 
      AND active = false
    ) THEN 
      '⚠️ Cron job exists but is INACTIVE. Check why it was disabled.'
    WHEN EXISTS (
      SELECT 1 FROM cron.job 
      WHERE jobname = 'generate-daily-tasks-http' 
      AND command LIKE '%YOUR_SERVICE_ROLE_KEY%'
    ) THEN 
      '❌ Service role key not replaced. Edit the script and replace YOUR_SERVICE_ROLE_KEY_HERE.'
    ELSE 
      '❌ Cron job does not exist. Run the setup script again.'
  END as setup_status;

