-- Check existing tasks for today
-- This will show if tasks are correctly created with multiple instances

-- Summary by template and time
SELECT 
  tt.name as template_name,
  ct.due_time,
  ct.daypart,
  COUNT(*) as instance_count,
  STRING_AGG(DISTINCT s.name, ', ') as sites
FROM checklist_tasks ct
JOIN task_templates tt ON ct.template_id = tt.id
LEFT JOIN sites s ON ct.site_id = s.id
WHERE ct.due_date = CURRENT_DATE
GROUP BY tt.name, ct.due_time, ct.daypart
ORDER BY tt.name, ct.due_time;

-- Total count by template
SELECT 
  tt.name as template_name,
  COUNT(*) as total_instances,
  COUNT(DISTINCT ct.due_time) as unique_times,
  COUNT(DISTINCT ct.site_id) as unique_sites
FROM checklist_tasks ct
JOIN task_templates tt ON ct.template_id = tt.id
WHERE ct.due_date = CURRENT_DATE
GROUP BY tt.name
ORDER BY total_instances DESC;

-- Check if tasks have correct structure
SELECT 
  COUNT(*) as total_tasks,
  COUNT(DISTINCT template_id) as unique_templates,
  COUNT(DISTINCT site_id) as unique_sites,
  COUNT(DISTINCT due_time) as unique_times,
  MIN(due_time) as earliest_time,
  MAX(due_time) as latest_time
FROM checklist_tasks
WHERE due_date = CURRENT_DATE;

