-- ============================================================================
-- FIX DUPLICATE TASK GENERATION SOURCES
-- This script removes duplicate cron jobs and identifies legacy sources
-- ============================================================================

-- STEP 1: List ALL cron jobs (to see what's scheduled)
SELECT 
  'All Cron Jobs' as info,
  jobid,
  jobname,
  schedule,
  command,
  active
FROM cron.job
ORDER BY jobname;

-- STEP 2: Remove duplicate/old cron jobs
-- Keep only 'generate-daily-tasks-cron' and remove any others
DO $$
DECLARE
  v_job RECORD;
BEGIN
  FOR v_job IN 
    SELECT jobid, jobname 
    FROM cron.job 
    WHERE (jobname LIKE '%task%' OR jobname LIKE '%generate%')
      AND jobname != 'generate-daily-tasks-cron'
  LOOP
    RAISE NOTICE 'Removing duplicate cron job: % (ID: %)', v_job.jobname, v_job.jobid;
    PERFORM cron.unschedule(v_job.jobname);
  END LOOP;
  
  -- Also ensure we only have one 'generate-daily-tasks-cron'
  IF (SELECT COUNT(*) FROM cron.job WHERE jobname = 'generate-daily-tasks-cron') > 1 THEN
    RAISE NOTICE 'Multiple generate-daily-tasks-cron jobs found, keeping only the first one';
    -- Keep the first one, remove others
    FOR v_job IN 
      SELECT jobid 
      FROM cron.job 
      WHERE jobname = 'generate-daily-tasks-cron'
      ORDER BY jobid
      OFFSET 1
    LOOP
      PERFORM cron.unschedule(v_job.jobid::text);
    END LOOP;
  END IF;
END $$;

-- STEP 3: Verify only one cron job remains
SELECT 
  'Remaining Cron Jobs' as info,
  jobid,
  jobname,
  schedule,
  active
FROM cron.job
WHERE jobname LIKE '%task%' OR jobname LIKE '%generate%'
ORDER BY jobname;

-- STEP 4: Check for inactive/legacy templates that should be deactivated
SELECT 
  'Inactive Templates Still Generating Tasks' as info,
  tt.id,
  tt.name,
  tt.frequency,
  tt.is_active,
  COUNT(ct.id) as task_count,
  MAX(ct.created_at) as latest_task_created
FROM task_templates tt
LEFT JOIN checklist_tasks ct ON ct.template_id = tt.id
WHERE tt.is_active = false
  AND ct.created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY tt.id, tt.name, tt.frequency, tt.is_active
ORDER BY latest_task_created DESC;

-- STEP 5: Deactivate templates that are creating duplicate tasks
-- This will prevent them from generating new tasks
-- UNCOMMENT TO RUN - Review Step 4 first!
/*
UPDATE task_templates
SET is_active = false
WHERE id IN (
  SELECT DISTINCT template_id
  FROM (
    SELECT 
      template_id,
      site_id,
      due_date,
      COALESCE(daypart, '') as daypart,
      COALESCE(due_time::text, '') as due_time,
      COUNT(*) as duplicate_count
    FROM checklist_tasks
    WHERE template_id IS NOT NULL
      AND created_at >= CURRENT_DATE - INTERVAL '7 days'
    GROUP BY template_id, site_id, due_date, COALESCE(daypart, ''), COALESCE(due_time::text, '')
    HAVING COUNT(*) > 3  -- If more than 3 duplicates, likely a problem template
  ) duplicates
);
*/

