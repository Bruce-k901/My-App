-- ============================================================================
-- CHECK WHAT TASKS EXIST TODAY
-- Run this first to see what's actually in the database
-- ============================================================================

-- Check tasks for the template with 3 dayparts
SELECT 
  'Tasks for "Check refuse storage area cleanliness"' as check_type,
  ct.id,
  ct.template_id,
  tt.name as template_name,
  ct.due_date,
  ct.daypart,
  ct.due_time,
  ct.status,
  ct.created_at
FROM checklist_tasks ct
INNER JOIN task_templates tt ON tt.id = ct.template_id
WHERE tt.id = '3b0bc660-9693-4bd1-b8d8-bd15a8638fe7'
  AND ct.due_date = CURRENT_DATE
ORDER BY ct.daypart, ct.due_time;

-- Check all templates with multiple dayparts
SELECT 
  'Summary by Template' as check_type,
  tt.id as template_id,
  tt.name as template_name,
  tt.dayparts as template_dayparts,
  tt.time_of_day,
  COUNT(ct.id) as tasks_created,
  array_agg(DISTINCT ct.daypart ORDER BY ct.daypart) FILTER (WHERE ct.id IS NOT NULL) as created_dayparts
FROM task_templates tt
LEFT JOIN checklist_tasks ct ON ct.template_id = tt.id 
  AND ct.due_date = CURRENT_DATE
WHERE tt.is_active = true
  AND tt.dayparts IS NOT NULL 
  AND array_length(tt.dayparts, 1) > 1
GROUP BY tt.id, tt.name, tt.dayparts, tt.time_of_day
ORDER BY tasks_created DESC, tt.name;

