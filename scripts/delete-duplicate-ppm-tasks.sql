-- ============================================================================
-- CLEANUP: Remove Duplicate PPM Tasks Created Today
-- ============================================================================
-- This removes the duplicate PPM tasks that were created today
-- Run this AFTER running cleanup-asset-service-dates.sql
-- ============================================================================

-- First, let's see what we're about to delete
SELECT 
  id,
  custom_name,
  due_date,
  status,
  task_data->>'source_type' as source_type,
  generated_at
FROM checklist_tasks
WHERE 
  DATE(generated_at) = CURRENT_DATE
  AND task_data->>'source_type' = 'ppm_overdue'
  AND status = 'pending'
ORDER BY custom_name;

-- Show count
SELECT 
  COUNT(*) as ppm_tasks_to_delete,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_tasks,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_tasks
FROM checklist_tasks
WHERE 
  DATE(generated_at) = CURRENT_DATE
  AND task_data->>'source_type' = 'ppm_overdue';

-- ============================================================================
-- UNCOMMENT THE LINES BELOW TO DELETE THE DUPLICATE PPM TASKS
-- ============================================================================
-- Only delete if you're sure these are duplicates!
-- This will delete ALL PPM tasks created today that are still pending

-- DELETE FROM checklist_tasks
-- WHERE 
--   DATE(generated_at) = CURRENT_DATE
--   AND task_data->>'source_type' = 'ppm_overdue'
--   AND status = 'pending';

-- After deletion, verify:
-- SELECT COUNT(*) as remaining_ppm_tasks
-- FROM checklist_tasks
-- WHERE 
--   DATE(generated_at) = CURRENT_DATE
--   AND task_data->>'source_type' = 'ppm_overdue';

-- ============================================================================
-- INSTRUCTIONS
-- ============================================================================
-- 1. Run the SELECT queries above first to see what will be deleted
-- 2. Verify these are indeed duplicate PPM tasks
-- 3. Uncomment the DELETE statement
-- 4. Run the script again to delete the duplicates
-- 5. Run the verification query to confirm deletion
-- ============================================================================
