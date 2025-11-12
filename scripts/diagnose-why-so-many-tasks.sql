-- ============================================================================
-- DIAGNOSE WHY SO MANY TASKS EXIST
-- This will help identify the root cause
-- ============================================================================

-- STEP 1: Count tasks by template
SELECT 
  'Tasks by Template' as check_type,
  tt.id as template_id,
  tt.name as template_name,
  tt.frequency,
  tt.is_active,
  COUNT(ct.id) as task_count,
  COUNT(DISTINCT ct.site_id) as sites_count,
  COUNT(DISTINCT ct.due_date) as dates_count,
  MIN(ct.due_date) as earliest_date,
  MAX(ct.due_date) as latest_date
FROM task_templates tt
LEFT JOIN checklist_tasks ct ON ct.template_id = tt.id
WHERE ct.due_date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY tt.id, tt.name, tt.frequency, tt.is_active
ORDER BY task_count DESC
LIMIT 20;

-- STEP 2: Check for duplicate tasks (same template, site, date, daypart, time)
SELECT 
  'Duplicate Tasks' as check_type,
  template_id,
  site_id,
  due_date,
  daypart,
  due_time,
  COUNT(*) as duplicate_count,
  array_agg(id ORDER BY created_at) as task_ids,
  array_agg(created_at ORDER BY created_at) as created_times
FROM checklist_tasks
WHERE due_date >= CURRENT_DATE - INTERVAL '7 days'
  AND template_id IS NOT NULL
GROUP BY template_id, site_id, due_date, daypart, due_time
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, due_date DESC
LIMIT 20;

-- STEP 3: Check tasks created today
SELECT 
  'Today\'s Tasks' as check_type,
  COUNT(*) as total_tasks,
  COUNT(DISTINCT template_id) as unique_templates,
  COUNT(DISTINCT site_id) as unique_sites,
  COUNT(DISTINCT daypart) as unique_dayparts
FROM checklist_tasks
WHERE due_date = CURRENT_DATE;

-- STEP 4: Check tasks by daypart for today
SELECT 
  'Today\'s Tasks by Daypart' as check_type,
  daypart,
  COUNT(*) as task_count,
  COUNT(DISTINCT template_id) as unique_templates
FROM checklist_tasks
WHERE due_date = CURRENT_DATE
GROUP BY daypart
ORDER BY task_count DESC;

-- STEP 5: Check if same template created multiple tasks for same daypart today
SELECT 
  'Same Template, Same Daypart, Multiple Tasks Today' as check_type,
  template_id,
  tt.name as template_name,
  site_id,
  daypart,
  COUNT(*) as task_count,
  array_agg(id) as task_ids,
  array_agg(due_time ORDER BY due_time) as times
FROM checklist_tasks ct
INNER JOIN task_templates tt ON tt.id = ct.template_id
WHERE ct.due_date = CURRENT_DATE
  AND ct.template_id IS NOT NULL
GROUP BY template_id, tt.name, site_id, daypart
HAVING COUNT(*) > 1
ORDER BY task_count DESC;

-- STEP 6: Check active templates count
SELECT 
  'Active Templates Summary' as check_type,
  frequency,
  COUNT(*) as template_count,
  COUNT(DISTINCT company_id) as companies_count
FROM task_templates
WHERE is_active = true
GROUP BY frequency;

-- STEP 7: Check recent task creation (last hour)
SELECT 
  'Recent Task Creation' as check_type,
  DATE_TRUNC('minute', created_at) as created_minute,
  COUNT(*) as tasks_created,
  COUNT(DISTINCT template_id) as unique_templates
FROM checklist_tasks
WHERE created_at >= NOW() - INTERVAL '1 hour'
GROUP BY DATE_TRUNC('minute', created_at)
ORDER BY created_minute DESC;

