-- ============================================================================
-- DELETE TODAY'S TASKS AND REGENERATE
-- ============================================================================
-- This script deletes all tasks with due_date = today, then you can
-- run the edge function to regenerate them.
-- ============================================================================

-- Step 1: Check how many tasks will be deleted
SELECT 
  COUNT(*) as tasks_to_delete,
  COUNT(DISTINCT site_id) as sites_affected,
  COUNT(DISTINCT company_id) as companies_affected
FROM public.checklist_tasks
WHERE due_date = CURRENT_DATE;

-- Step 2: Show sample of tasks that will be deleted
SELECT 
  id,
  template_id,
  company_id,
  site_id,
  due_date,
  due_time,
  daypart,
  status,
  custom_name
FROM public.checklist_tasks
WHERE due_date = CURRENT_DATE
ORDER BY site_id, due_time
LIMIT 20;

-- Step 3: Delete today's tasks
-- WARNING: This will delete ALL tasks with due_date = today
-- This includes pending, in_progress, and even completed tasks for today
DELETE FROM public.checklist_tasks
WHERE due_date = CURRENT_DATE;

-- Step 4: Verify deletion
SELECT 
  COUNT(*) as remaining_today_tasks
FROM public.checklist_tasks
WHERE due_date = CURRENT_DATE;
-- Should return 0

-- Step 5: Also delete completion records for today's tasks (optional)
-- Only if you want to completely clean up today's data
-- Uncomment the following if needed:
/*
DELETE FROM public.task_completion_records tcr
WHERE EXISTS (
  SELECT 1 FROM public.checklist_tasks ct
  WHERE ct.id = tcr.task_id
    AND ct.due_date = CURRENT_DATE
);
*/

-- ============================================================================
-- NEXT STEP: Run the Edge Function to regenerate tasks
-- ============================================================================
-- After running this script, you need to trigger the edge function to
-- regenerate today's tasks. See instructions below.
--
-- Option 1: Use the API route (from your app)
--   POST /api/admin/generate-tasks
--   Headers: Authorization: Bearer <your_token>
--
-- Option 2: Call the edge function directly
--   POST https://<your-project>.supabase.co/functions/v1/generate-daily-tasks
--   Headers: Authorization: Bearer <your_anon_key>
--
-- Option 3: Use Supabase Dashboard
--   Go to Edge Functions → generate-daily-tasks → Invoke
-- ============================================================================



