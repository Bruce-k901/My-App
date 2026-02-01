-- Migration: Find and cleanup orphaned tasks
-- Description: Finds tasks referencing deleted templates and handles them
-- Note: This migration will be skipped if required tables don't exist yet

-- First, find any tasks referencing the deleted template
-- Only run if all required tables exist
DO $$
DECLARE
  orphaned_count INTEGER;
  orphaned_task_ids UUID[];
BEGIN
  -- Check if all required tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_templates')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'checklist_tasks') THEN
    
    -- Find tasks with template_id that doesn't exist
    SELECT COUNT(*), array_agg(id)
    INTO orphaned_count, orphaned_task_ids
    FROM checklist_tasks
    WHERE template_id NOT IN (SELECT id FROM task_templates)
       OR template_id = '9ec8e2c4-d3a7-47d6-a653-116b07e4bf06';
    
    IF orphaned_count > 0 THEN
      RAISE NOTICE 'Found % orphaned tasks referencing deleted templates', orphaned_count;
      RAISE NOTICE 'Task IDs: %', orphaned_task_ids;
      
      -- Delete orphaned completion records first (due to foreign key) if table exists
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_completion_records') THEN
        DELETE FROM task_completion_records
        WHERE task_id = ANY(orphaned_task_ids);
      END IF;
      
      -- Delete orphaned tasks
      DELETE FROM checklist_tasks
      WHERE id = ANY(orphaned_task_ids);
      
      RAISE NOTICE '✅ Deleted % orphaned tasks and their completion records', orphaned_count;
    ELSE
      RAISE NOTICE '✅ No orphaned tasks found';
    END IF;
  ELSE
    RAISE NOTICE '⚠️  Required tables do not exist yet - skipping cleanup';
  END IF;
END $$;

-- Verify cleanup (only if tables exist)
DO $$
DECLARE
  orphaned_count INTEGER;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_templates')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'checklist_tasks') THEN
    SELECT COUNT(*) INTO orphaned_count
    FROM checklist_tasks
    WHERE template_id NOT IN (SELECT id FROM task_templates);
    
    RAISE NOTICE 'Orphaned tasks remaining: %', orphaned_count;
  END IF;
END $$;


