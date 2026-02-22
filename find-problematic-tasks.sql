-- ============================================================================
-- FIND PROBLEMATIC TASKS CREATED TODAY
-- ============================================================================

-- 1. See what templates created the most tasks
SELECT 
  tt.name as template_name,
  tt.frequency,
  COUNT(*) as task_count,
  COUNT(DISTINCT ct.site_id) as sites,
  COUNT(DISTINCT ct.due_time) as unique_times,
  STRING_AGG(DISTINCT ct.due_time, ', ' ORDER BY ct.due_time) as all_times,
  STRING_AGG(DISTINCT s.name, ', ') as site_names
FROM checklist_tasks ct
JOIN task_templates tt ON ct.template_id = tt.id
LEFT JOIN sites s ON ct.site_id = s.id
WHERE ct.due_date = CURRENT_DATE
  AND ct.generated_at::date = CURRENT_DATE
GROUP BY tt.id, tt.name, tt.frequency
ORDER BY task_count DESC;

-- 2. Check for tasks with invalid time formats (dayparts instead of times)
SELECT 
  ct.due_time,
  ct.daypart,
  tt.name as template_name,
  s.name as site_name,
  COUNT(*) as count
FROM checklist_tasks ct
JOIN task_templates tt ON ct.template_id = tt.id
LEFT JOIN sites s ON ct.site_id = s.id
WHERE ct.due_date = CURRENT_DATE
  AND ct.generated_at::date = CURRENT_DATE
  AND (ct.due_time NOT SIMILAR TO '[0-9]{2}:[0-9]{2}' AND ct.due_time IS NOT NULL)
GROUP BY ct.due_time, ct.daypart, tt.name, s.name
ORDER BY count DESC;

-- 3. Check tasks by site to see which sites have tasks
SELECT 
  s.id as site_id,
  s.name as site_name,
  s.company_id,
  COUNT(*) as task_count,
  COUNT(DISTINCT ct.template_id) as unique_templates
FROM checklist_tasks ct
LEFT JOIN sites s ON ct.site_id = s.id
WHERE ct.due_date = CURRENT_DATE
  AND ct.generated_at::date = CURRENT_DATE
GROUP BY s.id, s.name, s.company_id
ORDER BY task_count DESC;

-- 4. Check if there are duplicate tasks (same template, site, time)
SELECT 
  tt.name as template_name,
  s.name as site_name,
  ct.due_time,
  ct.daypart,
  COUNT(*) as duplicate_count,
  MIN(ct.created_at) as first_created,
  MAX(ct.created_at) as last_created
FROM checklist_tasks ct
JOIN task_templates tt ON ct.template_id = tt.id
LEFT JOIN sites s ON ct.site_id = s.id
WHERE ct.due_date = CURRENT_DATE
  AND ct.generated_at::date = CURRENT_DATE
GROUP BY tt.name, s.name, ct.due_time, ct.daypart
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- 5. Check template configuration that might be causing issues
SELECT 
  tt.name,
  tt.frequency,
  tt.company_id,
  tt.site_id,
  tt.dayparts,
  tt.time_of_day,
  tt.recurrence_pattern->'daypart_times' as daypart_times,
  COUNT(ct.id) as tasks_created
FROM task_templates tt
LEFT JOIN checklist_tasks ct ON ct.template_id = tt.id 
  AND ct.due_date = CURRENT_DATE 
  AND ct.generated_at::date = CURRENT_DATE
WHERE tt.is_active = true
  AND tt.frequency = 'daily'
GROUP BY tt.id, tt.name, tt.frequency, tt.company_id, tt.site_id, 
         tt.dayparts, tt.time_of_day, tt.recurrence_pattern
ORDER BY tasks_created DESC;

