-- ============================================================================
-- CLEANUP TODAY'S TASKS (Use with caution!)
-- ============================================================================
-- This will delete all tasks created today so we can regenerate them correctly
-- ONLY RUN THIS IF YOU WANT TO START FRESH

-- First, check what will be deleted:
SELECT 
  COUNT(*) as tasks_to_delete,
  COUNT(DISTINCT template_id) as unique_templates,
  COUNT(DISTINCT site_id) as unique_sites
FROM checklist_tasks
WHERE due_date = CURRENT_DATE
  AND generated_at::date = CURRENT_DATE;

-- If the above looks correct, uncomment the DELETE below:
-- DELETE FROM checklist_tasks
-- WHERE due_date = CURRENT_DATE
--   AND generated_at::date = CURRENT_DATE;

-- After cleanup, run the Edge Function again to regenerate tasks correctly

