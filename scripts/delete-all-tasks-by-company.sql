-- ============================================================================
-- DELETE ALL TASKS FOR A SPECIFIC COMPANY
-- Replace 'YOUR_COMPANY_ID' with your actual company ID
-- ============================================================================

-- STEP 1: Find your company ID (if you don't know it)
SELECT 
  'Your Companies' as info,
  id,
  name,
  created_at
FROM companies
ORDER BY created_at DESC;

-- STEP 2: Preview tasks for your company
-- Replace 'YOUR_COMPANY_ID' with your actual company ID from Step 1
SELECT 
  'Tasks to Delete' as action,
  COUNT(*) as total_tasks,
  COUNT(DISTINCT template_id) as unique_templates,
  COUNT(DISTINCT site_id) as unique_sites,
  MIN(created_at) as oldest_task,
  MAX(created_at) as newest_task
FROM checklist_tasks
WHERE company_id = 'YOUR_COMPANY_ID'; -- REPLACE THIS

-- STEP 3: DELETE ALL TASKS FOR YOUR COMPANY (UNCOMMENT AND REPLACE COMPANY_ID)
-- WARNING: This will permanently delete ALL tasks for this company!
/*
DELETE FROM checklist_tasks
WHERE company_id = 'YOUR_COMPANY_ID'; -- REPLACE THIS
*/

-- STEP 4: Verify deletion (should return 0)
SELECT 
  'Verification' as info,
  COUNT(*) as remaining_tasks
FROM checklist_tasks
WHERE company_id = 'YOUR_COMPANY_ID'; -- REPLACE THIS

