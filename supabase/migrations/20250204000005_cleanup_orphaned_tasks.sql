-- Migration: Clean up orphaned tasks from deleted pest control template
-- Description: Removes any tasks that reference the deleted template ID
-- This handles the case where tasks weren't cascade deleted
-- Note: This migration will be skipped if required tables don't exist yet

-- Delete orphaned tasks (if any exist)
-- These would have been cascade deleted, but just in case
-- Only delete if all required tables exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_templates')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'checklist_tasks') THEN
    
    -- Delete orphaned completion records if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_completion_records') THEN
      DELETE FROM public.task_completion_records
      WHERE template_id NOT IN (SELECT id FROM public.task_templates);
    END IF;
    
    -- Delete orphaned tasks
    DELETE FROM public.checklist_tasks
    WHERE template_id NOT IN (SELECT id FROM public.task_templates);
    
    RAISE NOTICE '✅ Cleaned up orphaned tasks (if any existed)';
  ELSE
    RAISE NOTICE '⚠️  Required tables do not exist yet - skipping cleanup';
  END IF;
END $$;

-- Note: This is safe to run multiple times - it only deletes orphaned records


