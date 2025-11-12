-- ============================================================================
-- MANUAL TASK GENERATION TRIGGER
-- Run this to immediately generate today's tasks
-- Use this while setting up automated scheduling
-- ============================================================================

-- Check if function exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_name = 'generate_daily_tasks_direct'
  ) THEN
    RAISE EXCEPTION 'Function generate_daily_tasks_direct() does not exist. Please run the migration first.';
  END IF;
END $$;

-- Generate tasks and show results
SELECT 
  'Task Generation Started' as status,
  NOW() as started_at;

-- Call the function
SELECT 
  daily_created,
  weekly_created,
  monthly_created,
  errors,
  NOW() as completed_at
FROM generate_daily_tasks_direct();

-- Show summary of generated tasks
SELECT 
  'Summary' as info_type,
  COUNT(*) as total_tasks_today,
  COUNT(DISTINCT template_id) as unique_templates,
  COUNT(DISTINCT site_id) as unique_sites,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_tasks,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_tasks
FROM checklist_tasks
WHERE due_date = CURRENT_DATE;

-- Show tasks by frequency (from templates)
SELECT 
  t.frequency,
  COUNT(ct.id) as task_count,
  COUNT(DISTINCT ct.template_id) as template_count
FROM checklist_tasks ct
JOIN task_templates t ON t.id = ct.template_id
WHERE ct.due_date = CURRENT_DATE
GROUP BY t.frequency
ORDER BY t.frequency;

