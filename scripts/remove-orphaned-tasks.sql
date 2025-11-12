-- ============================================================================
-- REMOVE ORPHANED TASKS
-- This script removes tasks that don't have valid templates
-- Only tasks from templates should exist in the active tasks page
-- ============================================================================

-- STEP 1: Preview what will be deleted (RUN THIS FIRST!)
-- This shows you exactly which orphaned tasks will be removed
SELECT 
  'Orphaned Tasks to Remove' as action,
  ct.id,
  ct.template_id,
  ct.site_id,
  ct.due_date,
  ct.daypart,
  ct.due_time,
  ct.status,
  ct.created_at,
  CASE 
    WHEN ct.template_id IS NULL THEN 'No template_id'
    WHEN NOT EXISTS (SELECT 1 FROM task_templates tt WHERE tt.id = ct.template_id) 
    THEN 'Template does not exist'
    ELSE 'Valid'
  END as issue_type,
  s.name as site_name
FROM checklist_tasks ct
LEFT JOIN sites s ON s.id = ct.site_id
WHERE ct.template_id IS NULL
   OR NOT EXISTS (
     SELECT 1 FROM task_templates tt WHERE tt.id = ct.template_id
   )
ORDER BY ct.created_at DESC;

-- STEP 2: Count how many orphaned tasks will be removed
SELECT 
  'Summary' as info,
  COUNT(*) as orphaned_tasks_to_remove,
  COUNT(*) FILTER (WHERE template_id IS NULL) as null_template_id,
  COUNT(*) FILTER (WHERE template_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM task_templates tt WHERE tt.id = checklist_tasks.template_id
  )) as missing_template,
  COUNT(DISTINCT site_id) as affected_sites
FROM checklist_tasks
WHERE template_id IS NULL
   OR NOT EXISTS (
     SELECT 1 FROM task_templates tt WHERE tt.id = checklist_tasks.template_id
   );

-- STEP 3: Actually remove orphaned tasks (UNCOMMENT TO RUN)
-- WARNING: This will permanently delete orphaned tasks!
-- Only run after reviewing Step 1 and Step 2 results
/*
DELETE FROM checklist_tasks
WHERE template_id IS NULL
   OR NOT EXISTS (
     SELECT 1 FROM task_templates tt WHERE tt.id = checklist_tasks.template_id
   );
*/

-- STEP 4: Verify cleanup (run after Step 3)
-- This should show 0 orphaned tasks remaining
SELECT 
  'Verification' as info,
  COUNT(*) as remaining_orphaned_tasks
FROM checklist_tasks
WHERE template_id IS NULL
   OR NOT EXISTS (
     SELECT 1 FROM task_templates tt WHERE tt.id = checklist_tasks.template_id
   );

