-- Migration: Find and cleanup orphaned tasks
-- Description: Finds tasks referencing deleted templates and handles them

-- First, find any tasks referencing the deleted template
DO $$
DECLARE
  orphaned_count INTEGER;
  orphaned_task_ids UUID[];
BEGIN
  -- Find tasks with template_id that doesn't exist
  SELECT COUNT(*), array_agg(id)
  INTO orphaned_count, orphaned_task_ids
  FROM checklist_tasks
  WHERE template_id NOT IN (SELECT id FROM task_templates)
     OR template_id = '9ec8e2c4-d3a7-47d6-a653-116b07e4bf06';
  
  IF orphaned_count > 0 THEN
    RAISE NOTICE 'Found % orphaned tasks referencing deleted templates', orphaned_count;
    RAISE NOTICE 'Task IDs: %', orphaned_task_ids;
    
    -- Delete orphaned completion records first (due to foreign key)
    DELETE FROM task_completion_records
    WHERE task_id = ANY(orphaned_task_ids);
    
    -- Delete orphaned tasks
    DELETE FROM checklist_tasks
    WHERE id = ANY(orphaned_task_ids);
    
    RAISE NOTICE '✅ Deleted % orphaned tasks and their completion records', orphaned_count;
  ELSE
    RAISE NOTICE '✅ No orphaned tasks found';
  END IF;
END $$;

-- Verify cleanup
SELECT 
  COUNT(*) as orphaned_tasks_remaining
FROM checklist_tasks
WHERE template_id NOT IN (SELECT id FROM task_templates);


