-- ============================================================================
-- DELETE ALL TASKS FOR COMPANY: f99510bc-b290-47c6-8f12-282bea67bd91
-- Comprehensive deletion script
-- ============================================================================

-- STEP 1: Show ALL tasks for this company (regardless of status or source)
SELECT 
  'ALL TASKS FOR COMPANY' as info,
  COUNT(*) as total_tasks,
  COUNT(DISTINCT template_id) as unique_templates,
  COUNT(DISTINCT site_id) as unique_sites,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
  COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
  COUNT(CASE WHEN status IS NULL THEN 1 END) as null_status,
  MIN(created_at) as oldest_task,
  MAX(created_at) as newest_task
FROM checklist_tasks
WHERE company_id = 'f99510bc-b290-47c6-8f12-282bea67bd91';

-- STEP 2: Show tasks grouped by template (to see where they're coming from)
SELECT 
  tt.name as template_name,
  tt.slug as template_slug,
  COUNT(*) as task_count,
  MIN(ct.created_at) as first_task_created,
  MAX(ct.created_at) as last_task_created
FROM checklist_tasks ct
LEFT JOIN task_templates tt ON ct.template_id = tt.id
WHERE ct.company_id = 'f99510bc-b290-47c6-8f12-282bea67bd91'
GROUP BY tt.name, tt.slug
ORDER BY task_count DESC;

-- STEP 3: Show tasks with NULL template_id (orphaned tasks)
SELECT 
  'ORPHANED TASKS (no template)' as info,
  COUNT(*) as count
FROM checklist_tasks
WHERE company_id = 'f99510bc-b290-47c6-8f12-282bea67bd91'
  AND template_id IS NULL;

-- STEP 4: Show tasks by status
SELECT 
  status,
  COUNT(*) as count
FROM checklist_tasks
WHERE company_id = 'f99510bc-b290-47c6-8f12-282bea67bd91'
GROUP BY status
ORDER BY count DESC;

-- STEP 5: Show all task IDs that will be deleted (for verification)
SELECT 
  id,
  template_id,
  site_id,
  due_date,
  status,
  priority,
  created_at
FROM checklist_tasks
WHERE company_id = 'f99510bc-b290-47c6-8f12-282bea67bd91'
ORDER BY created_at DESC;

-- ============================================================================
-- STEP 6: DELETE ALL TASKS FOR THIS COMPANY
-- ============================================================================
-- This will delete ALL tasks regardless of status, template, or source

DELETE FROM checklist_tasks
WHERE company_id = 'f99510bc-b290-47c6-8f12-282bea67bd91';

-- ============================================================================
-- STEP 7: Verify deletion (should return 0)
-- ============================================================================
SELECT 
  'VERIFICATION' as info,
  COUNT(*) as remaining_tasks
FROM checklist_tasks
WHERE company_id = 'f99510bc-b290-47c6-8f12-282bea67bd91';
-- Should return 0 if deletion was successful

-- STEP 8: Check for any tasks that might have different company_id format
-- (in case there are any data inconsistencies)
SELECT 
  'CHECKING FOR OTHER TASKS' as info,
  COUNT(*) as count,
  company_id
FROM checklist_tasks
WHERE company_id::text LIKE '%f99510bc%' 
   OR company_id::text LIKE '%b290-47c6%'
GROUP BY company_id;






