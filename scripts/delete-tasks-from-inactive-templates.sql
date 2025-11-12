-- ============================================================================
-- DELETE TASKS FROM INACTIVE TEMPLATES
-- Simple script to remove tasks created by inactive templates
-- ============================================================================

-- STEP 1: Preview what will be deleted
SELECT 
  'Tasks to Delete' as action,
  ct.id,
  ct.template_id,
  tt.name as template_name,
  ct.site_id,
  s.name as site_name,
  ct.due_date,
  ct.status,
  ct.created_at
FROM checklist_tasks ct
INNER JOIN task_templates tt ON tt.id = ct.template_id
LEFT JOIN sites s ON s.id = ct.site_id
WHERE tt.is_active = false
ORDER BY ct.created_at DESC;

-- STEP 2: Count how many will be deleted
SELECT 
  'Summary' as info,
  COUNT(*) as tasks_to_delete,
  COUNT(DISTINCT ct.template_id) as affected_templates,
  COUNT(DISTINCT ct.site_id) as affected_sites
FROM checklist_tasks ct
INNER JOIN task_templates tt ON tt.id = ct.template_id
WHERE tt.is_active = false;

-- STEP 3: Actually delete (UNCOMMENT TO RUN)
-- WARNING: This will permanently delete tasks from inactive templates!
/*
DELETE FROM checklist_tasks
WHERE id IN (
  SELECT ct.id
  FROM checklist_tasks ct
  INNER JOIN task_templates tt ON tt.id = ct.template_id
  WHERE tt.is_active = false
);
*/

-- STEP 4: Verify cleanup
SELECT 
  'Verification' as info,
  COUNT(*) as remaining_tasks_from_inactive_templates
FROM checklist_tasks ct
INNER JOIN task_templates tt ON tt.id = ct.template_id
WHERE tt.is_active = false;

