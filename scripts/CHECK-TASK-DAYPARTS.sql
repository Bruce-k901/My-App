-- Check task dayparts data for debugging
-- Run this in Supabase SQL Editor to see what's stored in task_data

SELECT 
  id,
  custom_name,
  template_id,
  daypart,
  due_time,
  due_date,
  status,
  task_data->'dayparts' as dayparts_in_task_data,
  jsonb_typeof(task_data->'dayparts') as dayparts_type,
  task_data
FROM checklist_tasks
WHERE template_id IN (
  SELECT id FROM task_templates 
  WHERE slug = 'fridge-freezer-temperature-check' 
     OR name ILIKE '%fridge%freezer%'
)
ORDER BY created_at DESC
LIMIT 10;

-- Expected format for task_data.dayparts:
-- [
--   { "daypart": "before_open", "due_time": "10:00" },
--   { "daypart": "during_service", "due_time": "15:00" },
--   { "daypart": "after_service", "due_time": "20:00" }
-- ]

