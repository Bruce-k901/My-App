-- Delete the specific Fridge/Freezer task that's showing as 3 instances
-- This is the task ID from the console logs: f9a9dd04-651a-4aa0-920f-4d34f2df5e29

DELETE FROM public.checklist_tasks
WHERE id = 'f9a9dd04-651a-4aa0-920f-4d34f2df5e29';

-- OR if you want to delete ALL fridge/freezer tasks for today:
-- DELETE FROM public.checklist_tasks
-- WHERE template_id IN (
--   SELECT id FROM public.task_templates 
--   WHERE slug = 'fridge-freezer-temperature-check'
-- )
-- AND due_date = CURRENT_DATE;

