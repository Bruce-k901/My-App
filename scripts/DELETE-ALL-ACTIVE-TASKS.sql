-- ============================================================================
-- DELETE ALL TASKS FROM ACTIVE TASKS PAGE
-- This will delete ALL tasks shown on the active tasks page for your company
-- ============================================================================

-- STEP 1: Find your company ID (if you don't know it)
SELECT 
  'Your Companies' as info,
  id,
  name,
  created_at
FROM companies
ORDER BY created_at DESC;

-- STEP 2: Preview tasks that will be deleted
-- Replace 'YOUR_COMPANY_ID' with your actual company ID from Step 1
SELECT 
  'Tasks on Active Page' as info,
  COUNT(*) as total_tasks,
  COUNT(DISTINCT template_id) as unique_templates,
  COUNT(DISTINCT site_id) as unique_sites,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_tasks,
  COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_tasks,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tasks,
  MIN(created_at) as oldest_task,
  MAX(created_at) as newest_task
FROM checklist_tasks
WHERE company_id = 'YOUR_COMPANY_ID'; -- REPLACE THIS

-- STEP 3: Show sample of tasks that will be deleted (first 10)
SELECT 
  id,
  template_id,
  site_id,
  due_date,
  due_time,
  daypart,
  status,
  priority,
  created_at
FROM checklist_tasks
WHERE company_id = 'YOUR_COMPANY_ID' -- REPLACE THIS
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================================
-- STEP 4: DELETE ALL TASKS (UNCOMMENT AFTER REVIEWING ABOVE)
-- ============================================================================
-- WARNING: This will permanently delete ALL tasks for your company!
-- This includes pending, in_progress, and completed tasks.

/*
DELETE FROM checklist_tasks
WHERE company_id = 'YOUR_COMPANY_ID'; -- REPLACE THIS
*/

-- ============================================================================
-- STEP 5: Verify deletion (should return 0)
-- ============================================================================
/*
SELECT 
  'Verification' as info,
  COUNT(*) as remaining_tasks
FROM checklist_tasks
WHERE company_id = 'YOUR_COMPANY_ID'; -- REPLACE THIS
-- Should return 0 if deletion was successful
*/






