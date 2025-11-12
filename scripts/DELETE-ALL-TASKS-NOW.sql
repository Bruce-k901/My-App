-- ============================================================================
-- DELETE ALL TASKS - RUN THIS NOW
-- ============================================================================

-- STEP 1: See your company ID
SELECT id, name FROM companies ORDER BY created_at DESC LIMIT 5;

-- STEP 2: Delete ALL tasks (no company filter needed if you want everything)
DELETE FROM checklist_tasks;

-- STEP 3: Verify deletion
SELECT COUNT(*) as remaining_tasks FROM checklist_tasks;

