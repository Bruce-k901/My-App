-- ============================================================================
-- DELETE 66 TASKS FROM INACTIVE TEMPLATES
-- This will remove all tasks from inactive templates
-- ============================================================================

-- DELETE: Remove all tasks from inactive templates
DELETE FROM checklist_tasks
WHERE id IN (
  SELECT ct.id
  FROM checklist_tasks ct
  INNER JOIN task_templates tt ON tt.id = ct.template_id
  WHERE tt.is_active = false
);

-- Verify deletion
SELECT 
  'Verification' as info,
  COUNT(*) as remaining_tasks_from_inactive_templates
FROM checklist_tasks ct
INNER JOIN task_templates tt ON tt.id = ct.template_id
WHERE tt.is_active = false;

