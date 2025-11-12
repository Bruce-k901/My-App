-- ============================================================================
-- VERIFY TASK GENERATION SETUP
-- Checks cron job, unique constraint, and task generation function
-- ============================================================================

-- STEP 1: Check if cron job exists and is scheduled correctly
SELECT 
  'Cron Job Status' as check_type,
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

-- STEP 2: Check if unique constraint exists to prevent duplicates
SELECT 
  'Unique Constraint Check' as check_type,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'checklist_tasks'
  AND indexdef LIKE '%UNIQUE%'
  AND indexdef LIKE '%template_id%';

-- STEP 3: Check if generate_daily_tasks_direct function exists
SELECT 
  'Function Check' as check_type,
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'generate_daily_tasks_direct';

-- STEP 4: Check active templates with multiple dayparts/times
SELECT 
  'Templates with Multiple Dayparts/Times' as check_type,
  id,
  name,
  frequency,
  dayparts,
  time_of_day,
  recurrence_pattern->'daypart_times' as daypart_times,
  is_active
FROM task_templates
WHERE is_active = true
  AND (
    (dayparts IS NOT NULL AND array_length(dayparts, 1) > 1)
    OR (recurrence_pattern->'daypart_times' IS NOT NULL)
  )
ORDER BY frequency, name;

-- STEP 5: Test run the function (commented out - uncomment to test)
/*
SELECT * FROM generate_daily_tasks_direct();
*/

