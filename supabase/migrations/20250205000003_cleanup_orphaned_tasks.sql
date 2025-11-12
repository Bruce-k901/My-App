-- ============================================================================
-- Migration: 20250205000003_cleanup_orphaned_tasks.sql
-- Description: Clean up checklist_tasks that reference non-existent templates
-- This prevents 406 errors when trying to load tasks with deleted templates
-- ============================================================================

-- Find and report orphaned tasks (tasks with template_id that don't exist)
DO $$
DECLARE
  orphaned_count INTEGER;
  orphaned_tasks UUID[];
BEGIN
  -- Find orphaned tasks
  SELECT COUNT(*), array_agg(id)
  INTO orphaned_count, orphaned_tasks
  FROM checklist_tasks
  WHERE template_id IS NOT NULL
    AND template_id NOT IN (SELECT id FROM task_templates);
  
  IF orphaned_count > 0 THEN
    RAISE NOTICE '⚠️ Found % orphaned task(s) referencing deleted templates:', orphaned_count;
    RAISE NOTICE '   Task IDs: %', array_to_string(orphaned_tasks, ', ');
    RAISE NOTICE '   These tasks will be deleted to prevent errors.';
    
    -- Delete orphaned tasks
    DELETE FROM checklist_tasks
    WHERE template_id IS NOT NULL
      AND template_id NOT IN (SELECT id FROM task_templates);
    
    RAISE NOTICE '✅ Cleaned up % orphaned task(s)', orphaned_count;
  ELSE
    RAISE NOTICE '✅ No orphaned tasks found. All tasks have valid template references.';
  END IF;
END $$;

-- Verification: Check if there are any remaining orphaned tasks
DO $$
DECLARE
  remaining_orphaned INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO remaining_orphaned
  FROM checklist_tasks
  WHERE template_id IS NOT NULL
    AND template_id NOT IN (SELECT id FROM task_templates);
  
  IF remaining_orphaned > 0 THEN
    RAISE WARNING '⚠️ Still have % orphaned task(s) after cleanup', remaining_orphaned;
  ELSE
    RAISE NOTICE '✅ Verification passed: No orphaned tasks remain';
  END IF;
END $$;

