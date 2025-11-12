-- Find Fridge/Freezer Temperature Check tasks
SELECT 
  id,
  template_id,
  status,
  due_date,
  daypart,
  due_time,
  created_at,
  site_id,
  (SELECT name FROM public.task_templates WHERE id = checklist_tasks.template_id) as template_name
FROM public.checklist_tasks
WHERE template_id IN (
  SELECT id FROM public.task_templates 
  WHERE slug = 'fridge-freezer-temperature-check' 
     OR name ILIKE '%fridge%freezer%temperature%'
)
AND due_date >= CURRENT_DATE - INTERVAL '1 day'
ORDER BY created_at DESC;

-- After running the SELECT above and seeing the task IDs, delete them with:
-- DELETE FROM public.checklist_tasks
-- WHERE id IN (
--   'paste-task-id-1-here',
--   'paste-task-id-2-here',
--   'paste-task-id-3-here'
-- );

-- OR delete all fridge/freezer tasks for today:
-- DELETE FROM public.checklist_tasks
-- WHERE template_id IN (
--   SELECT id FROM public.task_templates 
--   WHERE slug = 'fridge-freezer-temperature-check'
-- )
-- AND due_date >= CURRENT_DATE - INTERVAL '1 day';

