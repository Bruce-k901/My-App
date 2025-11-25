-- ============================================================================
-- COMPREHENSIVE CRON DIAGNOSTIC SCRIPT
-- ============================================================================
-- Run this in Supabase SQL Editor to diagnose why the daily tasks function
-- is not running automatically.
-- ============================================================================

-- ============================================================================
-- SECTION 1: EXTENSION STATUS
-- ============================================================================
SELECT 
  '🔧 SECTION 1: EXTENSIONS' as section,
  extname as extension_name,
  extversion as version,
  CASE 
    WHEN extname = 'pg_cron' THEN '✅ Required for database cron'
    WHEN extname = 'pg_net' THEN '✅ Required for HTTP calls from cron'
    ELSE 'ℹ️ Other extension'
  END as purpose
FROM pg_extension 
WHERE extname IN ('pg_cron', 'pg_net')
ORDER BY extname;

-- ============================================================================
-- SECTION 2: DATABASE CRON JOBS
-- ============================================================================
SELECT 
  '🔧 SECTION 2: DATABASE CRON JOBS' as section,
  jobid,
  jobname,
  schedule,
  active,
  nodename,
  nodeport,
  CASE 
    WHEN jobname LIKE '%generate%daily%tasks%' THEN 
      CASE 
        WHEN active = true THEN '✅ Active - Should run at 3:00 AM UTC'
        ELSE '❌ INACTIVE - This is the problem!'
      END
    ELSE 'ℹ️ Other cron job'
  END as status
FROM cron.job
ORDER BY jobname;

-- ============================================================================
-- SECTION 3: CRON JOB COMMAND DETAILS
-- ============================================================================
SELECT 
  '🔧 SECTION 3: CRON JOB COMMAND' as section,
  jobname,
  command,
  CASE 
    WHEN command LIKE '%YOUR_SERVICE_ROLE_KEY%' OR command LIKE '%YOUR_SERVICE_ROLE_KEY_HERE%' THEN 
      '❌ CRITICAL: Service role key not replaced!'
    WHEN command LIKE '%Bearer%' AND command NOT LIKE '%YOUR_SERVICE_ROLE_KEY%' THEN 
      '✅ Service role key appears to be set'
    ELSE 
      '⚠️ Cannot verify key status'
  END as key_status,
  CASE 
    WHEN command LIKE '%xijoybubtrgbrhquqwrx%' THEN '✅ Correct project URL'
    ELSE '⚠️ Check project URL'
  END as url_status
FROM cron.job
WHERE jobname LIKE '%generate%daily%tasks%';

-- ============================================================================
-- SECTION 4: RECENT CRON EXECUTIONS
-- ============================================================================
SELECT 
  '🔧 SECTION 4: RECENT CRON EXECUTIONS (Last 7 Days)' as section,
  runid,
  jobid,
  status,
  return_message,
  start_time,
  end_time,
  CASE 
    WHEN status = 'succeeded' THEN '✅ Success'
    WHEN status = 'failed' THEN '❌ Failed'
    WHEN status = 'running' THEN '⏳ Running'
    ELSE '⚠️ Unknown status'
  END as execution_status
FROM cron.job_run_details
WHERE jobid IN (SELECT jobid FROM cron.job WHERE jobname LIKE '%generate%daily%tasks%')
  AND start_time > NOW() - INTERVAL '7 days'
ORDER BY start_time DESC
LIMIT 10;

-- ============================================================================
-- SECTION 5: EDGE FUNCTION AVAILABILITY
-- ============================================================================
-- Check if we can see any references to the Edge Function
SELECT 
  '🔧 SECTION 5: EDGE FUNCTION CHECK' as section,
  'The Edge Function should be deployed at:' as info,
  'https://xijoybubtrgbrhquqwrx.supabase.co/functions/v1/generate-daily-tasks' as function_url,
  'Check Supabase Dashboard → Edge Functions → generate-daily-tasks' as verification_step;

-- ============================================================================
-- SECTION 6: TASK GENERATION HISTORY
-- ============================================================================
SELECT 
  '🔧 SECTION 6: TASK GENERATION HISTORY' as section,
  DATE(generated_at) as generation_date,
  COUNT(*) as tasks_generated,
  MIN(generated_at) as first_task_time,
  MAX(generated_at) as last_task_time,
  CASE 
    WHEN DATE(generated_at) = CURRENT_DATE THEN '✅ Tasks generated today'
    WHEN DATE(generated_at) = CURRENT_DATE - INTERVAL '1 day' THEN '⚠️ Last generated yesterday'
    ELSE '❌ No recent generation'
  END as status
FROM checklist_tasks
WHERE generated_at IS NOT NULL
GROUP BY DATE(generated_at)
ORDER BY generation_date DESC
LIMIT 7;

-- ============================================================================
-- SECTION 7: ACTIVE CONFIGURATIONS
-- ============================================================================
SELECT 
  '🔧 SECTION 7: ACTIVE SITE CHECKLISTS' as section,
  frequency,
  COUNT(*) as config_count,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Has configurations'
    ELSE '⚠️ No active configurations'
  END as status
FROM site_checklists
WHERE active = true
GROUP BY frequency
ORDER BY frequency;

-- ============================================================================
-- SECTION 8: SUMMARY & RECOMMENDATIONS
-- ============================================================================
SELECT 
  '📋 SECTION 8: DIAGNOSTIC SUMMARY' as section,
  CASE 
    WHEN NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN 
      '❌ ISSUE: pg_cron extension not enabled'
    WHEN NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN 
      '❌ ISSUE: pg_net extension not enabled'
    WHEN NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname LIKE '%generate%daily%tasks%') THEN 
      '❌ ISSUE: No cron job exists for task generation'
    WHEN EXISTS (SELECT 1 FROM cron.job WHERE jobname LIKE '%generate%daily%tasks%' AND active = false) THEN 
      '❌ ISSUE: Cron job exists but is INACTIVE'
    WHEN EXISTS (SELECT 1 FROM cron.job WHERE jobname LIKE '%generate%daily%tasks%' AND command LIKE '%YOUR_SERVICE_ROLE_KEY%') THEN 
      '❌ ISSUE: Service role key not replaced in cron job'
    WHEN NOT EXISTS (
      SELECT 1 FROM cron.job_run_details 
      WHERE jobid IN (SELECT jobid FROM cron.job WHERE jobname LIKE '%generate%daily%tasks%')
      AND start_time > CURRENT_DATE - INTERVAL '2 days'
    ) THEN 
      '⚠️ WARNING: No recent cron executions found (may be normal if just set up)'
    ELSE 
      '✅ All checks passed - cron should be working. Check Edge Function logs if tasks not generating.'
  END as primary_issue,
  CASE 
    WHEN NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN 
      'Run: CREATE EXTENSION IF NOT EXISTS pg_cron;'
    WHEN NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN 
      'Run: CREATE EXTENSION IF NOT EXISTS pg_net;'
    WHEN NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname LIKE '%generate%daily%tasks%') THEN 
      'Set up cron job using scripts/setup-cron-simple.sql'
    WHEN EXISTS (SELECT 1 FROM cron.job WHERE jobname LIKE '%generate%daily%tasks%' AND active = false) THEN 
      'Activate the cron job or recreate it'
    WHEN EXISTS (SELECT 1 FROM cron.job WHERE jobname LIKE '%generate%daily%tasks%' AND command LIKE '%YOUR_SERVICE_ROLE_KEY%') THEN 
      'Replace service role key in cron job command'
    ELSE 
      'Check Supabase Dashboard → Edge Functions → generate-daily-tasks → Logs'
  END as recommended_action;

