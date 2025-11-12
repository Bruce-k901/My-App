-- Migration: Clean up orphaned tasks from deleted pest control template
-- Description: Removes any tasks that reference the deleted template ID
-- This handles the case where tasks weren't cascade deleted

-- Delete orphaned tasks (if any exist)
-- These would have been cascade deleted, but just in case
DELETE FROM public.task_completion_records
WHERE template_id NOT IN (SELECT id FROM public.task_templates);

DELETE FROM public.checklist_tasks
WHERE template_id NOT IN (SELECT id FROM public.task_templates);

-- Note: This is safe to run multiple times - it only deletes orphaned records


