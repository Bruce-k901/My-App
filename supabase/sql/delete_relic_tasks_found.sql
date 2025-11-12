-- Delete the orphaned task with null template_id (definitely a relic)
DELETE FROM public.checklist_tasks
WHERE id = '0855206a-a7b7-4325-b812-8da6f8eaa11c';

-- Check what template the other task belongs to
SELECT 
  ct.id,
  ct.template_id,
  tt.name as template_name,
  tt.slug as template_slug,
  ct.status,
  ct.due_date,
  ct.daypart
FROM public.checklist_tasks ct
LEFT JOIN public.task_templates tt ON tt.id = ct.template_id
WHERE ct.id = '0cf44be5-6467-4f35-b006-1bcf308011c2';

-- Also find the fridge/freezer task that's showing as 3 instances
-- (The task ID from console logs was: f9a9dd04-651a-4aa0-920f-4d34f2df5e29)
SELECT 
  ct.id,
  ct.template_id,
  tt.name as template_name,
  tt.slug as template_slug,
  ct.status,
  ct.due_date,
  ct.daypart,
  ct.task_data->>'dayparts' as dayparts_in_data
FROM public.checklist_tasks ct
LEFT JOIN public.task_templates tt ON tt.id = ct.template_id
WHERE ct.id = 'f9a9dd04-651a-4aa0-920f-4d34f2df5e29'
   OR (tt.slug = 'fridge-freezer-temperature-check' AND ct.due_date = CURRENT_DATE);

-- If you find the fridge task, delete it with:
-- DELETE FROM public.checklist_tasks WHERE id = 'f9a9dd04-651a-4aa0-920f-4d34f2df5e29';

