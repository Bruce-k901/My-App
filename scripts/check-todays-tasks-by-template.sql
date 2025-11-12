-- ============================================================================
-- CHECK TODAY'S TASKS BY TEMPLATE
-- See if tasks were created for all dayparts
-- ============================================================================

-- Check tasks created today for templates with multiple dayparts
SELECT 
  'Today''s Tasks by Template' as check_type,
  tt.id as template_id,
  tt.name as template_name,
  tt.dayparts as template_dayparts,
  tt.recurrence_pattern->'daypart_times' as template_daypart_times,
  COUNT(ct.id) as tasks_created,
  array_agg(DISTINCT ct.daypart ORDER BY ct.daypart) as created_dayparts,
  array_agg(DISTINCT ct.due_time ORDER BY ct.due_time) as created_times
FROM task_templates tt
LEFT JOIN checklist_tasks ct ON ct.template_id = tt.id 
  AND ct.due_date = CURRENT_DATE
WHERE tt.is_active = true
  AND (
    (tt.dayparts IS NOT NULL AND array_length(tt.dayparts, 1) > 1)
    OR (tt.recurrence_pattern->'daypart_times' IS NOT NULL)
  )
GROUP BY tt.id, tt.name, tt.dayparts, tt.recurrence_pattern->'daypart_times'
ORDER BY tasks_created DESC, tt.name;

-- Check specific template: "Check refuse storage area cleanliness"
SELECT 
  'Specific Template Tasks' as check_type,
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

