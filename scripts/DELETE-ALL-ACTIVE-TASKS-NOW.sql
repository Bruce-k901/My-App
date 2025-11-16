-- ============================================================================
-- DELETE ALL ACTIVE TASKS - QUICK VERSION
-- This deletes ALL tasks for your company (everything shown on active page)
-- ============================================================================

-- STEP 1: See your company ID
SELECT id, name FROM companies ORDER BY created_at DESC LIMIT 5;

-- STEP 2: Preview what will be deleted
SELECT 
  COUNT(*) as total_tasks_to_delete,
  COUNT(DISTINCT template_id) as unique_templates,
  COUNT(DISTINCT site_id) as unique_sites
FROM checklist_tasks
WHERE company_id = 'YOUR_COMPANY_ID'; -- REPLACE WITH YOUR COMPANY ID

-- STEP 3: DELETE ALL TASKS (UNCOMMENT TO EXECUTE)
-- Replace 'YOUR_COMPANY_ID' with your actual company ID
/*
DELETE FROM checklist_tasks
WHERE company_id = 'YOUR_COMPANY_ID'; -- REPLACE THIS
*/

-- STEP 4: Verify deletion
/*
SELECT COUNT(*) as remaining_tasks 
FROM checklist_tasks
WHERE company_id = 'YOUR_COMPANY_ID'; -- REPLACE THIS
-- Should return 0
*/







