-- ============================================================================
-- COMPREHENSIVE DELETE ALL TASKS
-- This script finds and deletes ALL tasks for a company, including:
-- - Tasks from all statuses
-- - Tasks from all templates
-- - Orphaned tasks (no template_id)
-- - Tasks from automated generation
-- - Tasks from old "Save & Deploy" method
-- ============================================================================

-- SET YOUR COMPANY ID HERE
\set company_id 'f99510bc-b290-47c6-8f12-282bea67bd91'

-- ============================================================================
-- STEP 1: COMPREHENSIVE ANALYSIS
-- ============================================================================

-- 1a. Total tasks count
SELECT 
  'TOTAL TASKS' as analysis,
  COUNT(*) as count
FROM checklist_tasks
WHERE company_id = :'company_id';

-- 1b. Tasks by status
SELECT 
  'BY STATUS' as analysis,
  COALESCE(status, 'NULL') as status,
  COUNT(*) as count
FROM checklist_tasks
WHERE company_id = :'company_id'
GROUP BY status
ORDER BY count DESC;

-- 1c. Tasks by template
SELECT 
  'BY TEMPLATE' as analysis,
  COALESCE(tt.name, 'NO TEMPLATE (orphaned)') as template_name,
  COUNT(*) as task_count
FROM checklist_tasks ct
LEFT JOIN task_templates tt ON ct.template_id = tt.id
WHERE ct.company_id = :'company_id'
GROUP BY tt.name
ORDER BY task_count DESC;

-- 1d. Tasks by site
SELECT 
  'BY SITE' as analysis,
  COALESCE(s.name, 'NO SITE') as site_name,
  COUNT(*) as task_count
FROM checklist_tasks ct
LEFT JOIN sites s ON ct.site_id = s.id
WHERE ct.company_id = :'company_id'
GROUP BY s.name
ORDER BY task_count DESC;

-- 1e. Tasks created in last 24 hours (recent tasks)
SELECT 
  'RECENT TASKS (last 24h)' as analysis,
  COUNT(*) as count
FROM checklist_tasks
WHERE company_id = :'company_id'
  AND created_at > NOW() - INTERVAL '24 hours';

-- 1f. Check for tasks with unusual patterns
SELECT 
  'UNUSUAL PATTERNS' as analysis,
  COUNT(*) as tasks_with_null_template,
  COUNT(CASE WHEN template_id IS NULL THEN 1 END) as null_template_id,
  COUNT(CASE WHEN site_id IS NULL THEN 1 END) as null_site_id,
  COUNT(CASE WHEN due_date IS NULL THEN 1 END) as null_due_date
FROM checklist_tasks
WHERE company_id = :'company_id';

-- ============================================================================
-- STEP 2: DELETE ALL TASKS (UNCOMMENT TO EXECUTE)
-- ============================================================================

/*
-- Delete ALL tasks for this company
DELETE FROM checklist_tasks
WHERE company_id = :'company_id';

-- Verify deletion
SELECT 
  'VERIFICATION' as result,
  COUNT(*) as remaining_tasks
FROM checklist_tasks
WHERE company_id = :'company_id';
-- Should return 0
*/

-- ============================================================================
-- ALTERNATIVE: Delete using direct UUID (if above doesn't work)
-- ============================================================================

/*
DELETE FROM checklist_tasks
WHERE company_id = 'f99510bc-b290-47c6-8f12-282bea67bd91'::uuid;
*/




