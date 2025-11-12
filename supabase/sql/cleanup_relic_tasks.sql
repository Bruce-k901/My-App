-- ============================================================================
-- Script: cleanup_relic_tasks.sql
-- Description: Identify and delete relic/old test tasks from checklist_tasks
-- ============================================================================

-- STEP 1: First, see what tasks exist for today and recent days
-- Run this SELECT to see what we're dealing with:
SELECT 
  id,
  template_id,
  status,
  due_date,
  daypart,
  due_time,
  created_at,
  site_id,
  task_data->>'name' as task_name,
  task_data->>'template_slug' as template_slug,
  (SELECT name FROM public.task_templates WHERE id = checklist_tasks.template_id) as template_name
FROM public.checklist_tasks
WHERE due_date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY created_at DESC;

-- STEP 2: Delete tasks based on your criteria (uncomment the one you want):

-- Option A: Delete tasks with no matching template (orphaned tasks)
-- DELETE FROM public.checklist_tasks ct
-- WHERE NOT EXISTS (
--   SELECT 1 FROM public.task_templates tt WHERE tt.id = ct.template_id
-- );

-- Option B: Delete tasks created before a certain date (e.g., before Nov 11, 2025)
-- DELETE FROM public.checklist_tasks
-- WHERE created_at < '2025-11-11'::date;

-- Option C: Delete specific task IDs (safest - copy IDs from the SELECT above)
-- DELETE FROM public.checklist_tasks
-- WHERE id IN (
--   'task-id-1-here',
--   'task-id-2-here'
-- );

-- Option D: Delete tasks with specific template slugs (if you know the old template slugs)
-- DELETE FROM public.checklist_tasks
-- WHERE task_data->>'template_slug' IN ('old_slug_1', 'old_slug_2');

-- Option E: Delete all tasks for today and recreate them fresh (nuclear option)
-- DELETE FROM public.checklist_tasks
-- WHERE due_date = CURRENT_DATE;
