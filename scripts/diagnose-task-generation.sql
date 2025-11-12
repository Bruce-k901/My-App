-- ============================================================================
-- TASK GENERATION DIAGNOSTIC SCRIPT
-- Run this in Supabase SQL Editor to diagnose why task generation isn't working
-- ============================================================================

-- ===== CHECK 1: pg_cron Extension Status =====
SELECT 
  'CHECK 1: pg_cron Extension' as check_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') 
    THEN '✅ INSTALLED' 
    ELSE '❌ NOT INSTALLED (This is likely the problem!)' 
  END as status,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') 
    THEN 'pg_cron extension is available' 
    ELSE 'pg_cron is NOT available on standard Supabase. Use Edge Function scheduling instead.' 
  END as message;

-- ===== CHECK 2: Cron Job Status =====
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE NOTICE 'CHECK 2: Cron Job Status';
    RAISE NOTICE 'Checking cron.job table...';
  ELSE
    RAISE WARNING 'CHECK 2: Cron Job Status - SKIPPED (pg_cron not installed)';
  END IF;
END $$;

-- Only run if pg_cron exists
SELECT 
  'CHECK 2: Cron Job' as check_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') 
      AND EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'generate-daily-tasks-cron')
    THEN '✅ EXISTS' 
    WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
    THEN '❌ NOT FOUND'
    ELSE '⚠️ CANNOT CHECK (pg_cron not installed)'
  END as status,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') 
      AND EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'generate-daily-tasks-cron')
    THEN 'Cron job is scheduled' 
    WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
    THEN 'Cron job does not exist - migration may have failed'
    ELSE 'Cannot check - pg_cron extension not available'
  END as message;

-- Show cron job details if it exists
SELECT 
  'Cron Job Details' as info_type,
  jobid,
  jobname,
  schedule,
  command,
  nodename,
  nodeport,
  database,
  username,
  active
FROM cron.job 
WHERE jobname = 'generate-daily-tasks-cron';

-- ===== CHECK 3: Database Function Status =====
SELECT 
  'CHECK 3: Database Function' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.routines 
      WHERE routine_name = 'generate_daily_tasks_direct'
    )
    THEN '✅ EXISTS' 
    ELSE '❌ NOT FOUND' 
  END as status,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.routines 
      WHERE routine_name = 'generate_daily_tasks_direct'
    )
    THEN 'Function generate_daily_tasks_direct() exists and can be called manually' 
    ELSE 'Function does not exist - migration may not have run' 
  END as message;

-- Show function details
SELECT 
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_name = 'generate_daily_tasks_direct';

-- ===== CHECK 4: Active Templates =====
SELECT 
  'CHECK 4: Active Templates' as check_name,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ FOUND (' || COUNT(*) || ' templates)' 
    ELSE '❌ NONE FOUND' 
  END as status,
  CASE 
    WHEN COUNT(*) > 0 
    THEN 'You have active templates that should generate tasks' 
    ELSE 'No active templates found - create templates first' 
  END as message
FROM task_templates
WHERE is_active = true;

-- Show active templates breakdown
SELECT 
  frequency,
  COUNT(*) as template_count,
  array_agg(DISTINCT category) as categories
FROM task_templates
WHERE is_active = true
GROUP BY frequency
ORDER BY frequency;

-- ===== CHECK 5: Today's Tasks =====
SELECT 
  'CHECK 5: Today''s Tasks' as check_name,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ FOUND (' || COUNT(*) || ' tasks)' 
    ELSE '❌ NONE FOUND' 
  END as status,
  CASE 
    WHEN COUNT(*) > 0 
    THEN 'Tasks exist for today - generation may have worked' 
    ELSE 'No tasks for today - generation has not run' 
  END as message
FROM checklist_tasks
WHERE due_date = CURRENT_DATE;

-- Show today's tasks breakdown
SELECT 
  status,
  COUNT(*) as task_count,
  COUNT(DISTINCT template_id) as unique_templates,
  COUNT(DISTINCT site_id) as unique_sites
FROM checklist_tasks
WHERE due_date = CURRENT_DATE
GROUP BY status
ORDER BY status;

-- ===== CHECK 6: Recent Task Generation =====
SELECT 
  'CHECK 6: Recent Generation' as check_name,
  CASE 
    WHEN MAX(generated_at) >= CURRENT_DATE THEN '✅ TODAY' 
    WHEN MAX(generated_at) >= CURRENT_DATE - INTERVAL '7 days' THEN '⚠️ THIS WEEK' 
    WHEN MAX(generated_at) IS NOT NULL THEN '❌ OLD (' || MAX(generated_at)::date || ')' 
    ELSE '❌ NEVER' 
  END as status,
  CASE 
    WHEN MAX(generated_at) >= CURRENT_DATE 
    THEN 'Tasks were generated today' 
    WHEN MAX(generated_at) IS NOT NULL
    THEN 'Last generation: ' || MAX(generated_at)::text
    ELSE 'No tasks have been generated yet' 
  END as message
FROM checklist_tasks
WHERE generated_at IS NOT NULL;

-- ===== CHECK 7: Sites Available =====
SELECT 
  'CHECK 7: Active Sites' as check_name,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ FOUND (' || COUNT(*) || ' sites)' 
    ELSE '❌ NONE FOUND' 
  END as status,
  CASE 
    WHEN COUNT(*) > 0 
    THEN 'You have active sites for task generation' 
    ELSE 'No active sites found - tasks need sites to be assigned to' 
  END as message
FROM sites
WHERE status IS NULL OR status != 'inactive';

-- ===== SUMMARY & RECOMMENDATIONS =====
SELECT 
  'SUMMARY' as section,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
    THEN 'pg_cron is available - database cron should work'
    ELSE 'pg_cron is NOT available - use Edge Function scheduling instead'
  END as pg_cron_status,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'generate_daily_tasks_direct')
    THEN 'Database function exists - can be called manually'
    ELSE 'Database function missing - run migration'
  END as function_status,
  CASE 
    WHEN COUNT(*) > 0 THEN 'Active templates found'
    ELSE 'No active templates - create templates first'
  END as templates_status
FROM task_templates
WHERE is_active = true;

-- ===== RECOMMENDED ACTION =====
SELECT 
  'RECOMMENDED ACTION' as action_type,
  CASE 
    WHEN NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
    THEN '1. Set up Edge Function scheduling in Supabase Dashboard (recommended)'
    WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') 
      AND NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'generate-daily-tasks-cron')
    THEN '1. Re-run migration to create cron job'
    ELSE '1. Verify cron job is running (check cron.job_run_details)'
  END as step_1,
  CASE 
    WHEN NOT EXISTS (
      SELECT 1 FROM checklist_tasks WHERE due_date = CURRENT_DATE
    )
    THEN '2. Manually trigger task generation: SELECT * FROM generate_daily_tasks_direct();'
    ELSE '2. Tasks exist for today - verify they appear on Today''s Tasks page'
  END as step_2,
  '3. Monitor Edge Function logs or cron.job_run_details after 3am UTC' as step_3;

