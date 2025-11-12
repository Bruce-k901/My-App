-- ============================================================================
-- DELETE ALL TASKS - START FRESH
-- This will delete ALL tasks so you can start with just 1 template
-- ============================================================================

-- STEP 1: Preview what will be deleted
SELECT 
  'Tasks to Delete' as action,
  COUNT(*) as total_tasks,
  COUNT(DISTINCT template_id) as unique_templates,
  COUNT(DISTINCT site_id) as unique_sites,
  MIN(created_at) as oldest_task,
  MAX(created_at) as newest_task
FROM checklist_tasks;

-- STEP 2: DELETE ALL TASKS
DELETE FROM checklist_tasks;

-- STEP 3: Verify deletion (should return 0)
SELECT 
  'Verification' as info,
  COUNT(*) as remaining_tasks
FROM checklist_tasks;

