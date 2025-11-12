-- ============================================================================
-- DELETE ALL TASKS - START FRESH
-- WARNING: This will delete ALL tasks from checklist_tasks table
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

-- STEP 2: Show breakdown by status
SELECT 
  'Breakdown by Status' as info,
  status,
  COUNT(*) as count
FROM checklist_tasks
GROUP BY status
ORDER BY count DESC;

-- STEP 3: DELETE ALL TASKS (UNCOMMENT TO RUN)
-- WARNING: This will permanently delete ALL tasks!
/*
DELETE FROM checklist_tasks;
*/

-- STEP 4: Verify deletion (should return 0)
SELECT 
  'Verification' as info,
  COUNT(*) as remaining_tasks
FROM checklist_tasks;

