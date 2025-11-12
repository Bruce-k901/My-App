-- ============================================================================
-- DIAGNOSE TASK GENERATION SOURCES
-- This script identifies all sources that might be creating duplicate tasks
-- ============================================================================

-- STEP 1: Check for duplicate cron jobs
SELECT 
  'Cron Jobs' as info,
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
WHERE jobname LIKE '%task%' OR jobname LIKE '%generate%' OR command LIKE '%task%'
ORDER BY jobname;

-- STEP 2: Check for multiple task generation functions
SELECT 
  'Task Generation Functions' as info,
  routine_name,
  routine_type,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND (
    routine_name LIKE '%task%' 
    OR routine_name LIKE '%generate%'
  )
ORDER BY routine_name;

-- STEP 3: Check for legacy/inactive templates that might still be generating tasks
SELECT 
  'Template Status' as info,
  is_active,
  is_template_library,
  COUNT(*) as template_count,
  COUNT(DISTINCT company_id) as company_count
FROM task_templates
GROUP BY is_active, is_template_library
ORDER BY is_active DESC, is_template_library DESC;

-- STEP 4: Check for templates with same name (potential duplicates)
SELECT 
  'Duplicate Template Names' as info,
  name,
  COUNT(*) as count,
  array_agg(id ORDER BY created_at) as template_ids,
  array_agg(company_id ORDER BY created_at) as company_ids,
  array_agg(is_active ORDER BY created_at) as active_statuses
FROM task_templates
GROUP BY name
HAVING COUNT(*) > 1
ORDER BY count DESC, name;

-- STEP 5: Check for tasks created by different sources
-- Look at generated_at timestamps to see if tasks are being created in batches
SELECT 
  'Task Creation Patterns' as info,
  DATE(generated_at) as generation_date,
  DATE_TRUNC('hour', generated_at) as generation_hour,
  COUNT(*) as tasks_created,
  COUNT(DISTINCT template_id) as unique_templates,
  COUNT(DISTINCT site_id) as unique_sites
FROM checklist_tasks
WHERE generated_at IS NOT NULL
GROUP BY DATE(generated_at), DATE_TRUNC('hour', generated_at)
ORDER BY generation_date DESC, generation_hour DESC
LIMIT 20;

-- STEP 6: Check for tasks with same template/site/date but different creation times
-- This might indicate multiple generation runs
WITH task_groups AS (
  SELECT 
    template_id,
    site_id,
    due_date,
    COUNT(*) as task_count,
    array_agg(DISTINCT DATE(generated_at)) as generation_dates,
    array_agg(DISTINCT DATE(created_at)) as creation_dates,
    MIN(generated_at) as first_generated,
    MAX(generated_at) as last_generated
  FROM checklist_tasks
  WHERE template_id IS NOT NULL
  GROUP BY template_id, site_id, due_date
  HAVING COUNT(*) > 1
)
SELECT 
  'Multiple Generation Runs' as info,
  tg.template_id,
  tt.name as template_name,
  tg.site_id,
  s.name as site_name,
  tg.due_date,
  tg.task_count,
  tg.generation_dates,
  tg.creation_dates,
  tg.first_generated,
  tg.last_generated
FROM task_groups tg
LEFT JOIN task_templates tt ON tt.id = tg.template_id
LEFT JOIN sites s ON s.id = tg.site_id
ORDER BY tg.task_count DESC, tg.due_date DESC
LIMIT 20;

-- STEP 7: Check for legacy edge function schedules (Supabase Dashboard)
-- Note: This won't show Supabase Dashboard schedules, but we can check for HTTP calls
SELECT 
  'Recent Task Creation Activity' as info,
  DATE(created_at) as creation_date,
  COUNT(*) as total_tasks,
  COUNT(*) FILTER (WHERE generated_at IS NOT NULL) as auto_generated,
  COUNT(*) FILTER (WHERE generated_at IS NULL) as manually_created
FROM checklist_tasks
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY creation_date DESC;

-- STEP 8: Check for tasks without templates (orphaned)
SELECT 
  'Orphaned Tasks' as info,
  COUNT(*) as orphaned_count,
  COUNT(DISTINCT site_id) as affected_sites
FROM checklist_tasks
WHERE template_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM task_templates tt WHERE tt.id = checklist_tasks.template_id
  );

