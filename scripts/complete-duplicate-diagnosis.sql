-- ============================================================================
-- COMPLETE DUPLICATE DIAGNOSIS
-- Comprehensive check for all sources of duplicate tasks
-- ============================================================================

-- STEP 1: Check for duplicate cron jobs
SELECT 
  'Cron Jobs Check' as step,
  COUNT(*) as total_cron_jobs,
  COUNT(*) FILTER (WHERE jobname LIKE '%task%' OR jobname LIKE '%generate%') as task_related_jobs
FROM cron.job;

-- List all task-related cron jobs
SELECT 
  'Cron Job Details' as info,
  jobid,
  jobname,
  schedule,
  command,
  active
FROM cron.job
WHERE jobname LIKE '%task%' OR jobname LIKE '%generate%' OR command LIKE '%task%' OR command LIKE '%generate%'
ORDER BY jobname;

-- STEP 2: Check for tasks created in rapid succession (indicates multiple runs)
WITH task_creation_groups AS (
  SELECT 
    template_id,
    site_id,
    due_date,
    daypart,
    due_time,
    DATE_TRUNC('minute', created_at) as creation_minute,
    COUNT(*) as tasks_in_minute
  FROM checklist_tasks
  WHERE template_id IS NOT NULL
    AND created_at >= CURRENT_DATE - INTERVAL '7 days'
  GROUP BY template_id, site_id, due_date, daypart, due_time, DATE_TRUNC('minute', created_at)
  HAVING COUNT(*) > 1
)
SELECT 
  'Rapid Task Creation' as info,
  COUNT(*) as suspicious_groups,
  SUM(tasks_in_minute) as total_duplicate_tasks
FROM task_creation_groups;

-- STEP 3: Check for templates that are creating too many tasks
SELECT 
  'Templates Creating Many Tasks' as info,
  tt.id,
  tt.name,
  tt.frequency,
  tt.is_active,
  COUNT(DISTINCT ct.site_id) as sites_with_tasks,
  COUNT(ct.id) as total_tasks_last_7_days,
  COUNT(DISTINCT ct.due_date) as unique_dates,
  MAX(ct.created_at) as latest_task_created
FROM task_templates tt
LEFT JOIN checklist_tasks ct ON ct.template_id = tt.id
  AND ct.created_at >= CURRENT_DATE - INTERVAL '7 days'
WHERE tt.is_active = true
GROUP BY tt.id, tt.name, tt.frequency, tt.is_active
HAVING COUNT(ct.id) > 20  -- More than 20 tasks in 7 days is suspicious
ORDER BY total_tasks_last_7_days DESC;

-- STEP 4: Check for actual duplicates in checklist_tasks (by our criteria)
WITH duplicates AS (
  SELECT 
    template_id,
    site_id,
    due_date,
    COALESCE(daypart, '') as daypart,
    COALESCE(due_time::text, '') as due_time,
    COUNT(*) as duplicate_count,
    array_agg(id ORDER BY created_at) as task_ids,
    array_agg(created_at ORDER BY created_at) as created_times
  FROM checklist_tasks
  WHERE template_id IS NOT NULL
    AND created_at >= CURRENT_DATE - INTERVAL '7 days'
  GROUP BY template_id, site_id, due_date, COALESCE(daypart, ''), COALESCE(due_time::text, '')
  HAVING COUNT(*) > 1
)
SELECT 
  'Current Duplicates (Last 7 Days)' as info,
  COUNT(*) as duplicate_groups,
  SUM(duplicate_count) as total_duplicate_tasks,
  SUM(duplicate_count - 1) as tasks_to_delete
FROM duplicates;

-- STEP 5: Show duplicate groups with details
WITH duplicates AS (
  SELECT 
    template_id,
    site_id,
    due_date,
    COALESCE(daypart, '') as daypart,
    COALESCE(due_time::text, '') as due_time,
    COUNT(*) as duplicate_count,
    array_agg(id ORDER BY created_at) as task_ids,
    array_agg(created_at ORDER BY created_at) as created_times
  FROM checklist_tasks
  WHERE template_id IS NOT NULL
    AND created_at >= CURRENT_DATE - INTERVAL '7 days'
  GROUP BY template_id, site_id, due_date, COALESCE(daypart, ''), COALESCE(due_time::text, '')
  HAVING COUNT(*) > 1
)
SELECT 
  'Duplicate Details' as info,
  d.template_id,
  tt.name as template_name,
  d.site_id,
  s.name as site_name,
  d.due_date,
  d.daypart,
  d.due_time,
  d.duplicate_count,
  d.task_ids[1] as keep_task_id,
  d.task_ids[2:] as delete_task_ids,
  d.created_times
FROM duplicates d
LEFT JOIN task_templates tt ON tt.id = d.template_id
LEFT JOIN sites s ON s.id = d.site_id
ORDER BY d.duplicate_count DESC, d.due_date DESC
LIMIT 20;

-- STEP 6: Check if unique constraint exists
SELECT 
  'Unique Constraint Check' as info,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'checklist_tasks'
  AND indexdef LIKE '%unique%'
ORDER BY indexname;

