-- ============================================================================
-- DELETE TODAY'S TASKS AND REGENERATE - SIMPLE VERSION
-- ============================================================================
-- Run this in Supabase SQL Editor, then trigger the edge function
-- ============================================================================

-- Step 1: Show what will be deleted
SELECT 
  COUNT(*) as total_tasks,
  COUNT(DISTINCT site_id) as sites,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
  COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
FROM public.checklist_tasks
WHERE due_date = CURRENT_DATE;

-- Step 2: Delete today's tasks
DELETE FROM public.checklist_tasks
WHERE due_date = CURRENT_DATE;

-- Step 3: Verify deletion
SELECT COUNT(*) as remaining_tasks
FROM public.checklist_tasks
WHERE due_date = CURRENT_DATE;
-- Should be 0

-- ============================================================================
-- NEXT: Call the edge function to regenerate tasks
-- See REGENERATE_TODAYS_TASKS.md for instructions
-- ============================================================================



