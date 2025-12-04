-- ============================================================================
-- Check Why Tasks Are Not Ready for Notifications
-- ============================================================================

-- Check all tasks due today
SELECT 
  id,
  custom_name as task_name,
  due_date,
  due_time,
  assigned_to_user_id,
  status,
  company_id,
  site_id,
  CASE 
    WHEN due_time IS NULL THEN '❌ Missing due_time'
    WHEN assigned_to_user_id IS NULL THEN '❌ Missing assigned_to_user_id'
    WHEN status NOT IN ('pending', 'in_progress') THEN '⚠️ Status: ' || status
    ELSE '✅ Ready for notifications'
  END as notification_readiness
FROM checklist_tasks
WHERE due_date = CURRENT_DATE
ORDER BY 
  CASE 
    WHEN due_time IS NULL THEN 1
    WHEN assigned_to_user_id IS NULL THEN 2
    ELSE 3
  END,
  due_time NULLS LAST;

-- Summary of issues
SELECT 
  'Tasks Due Today' as category,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE due_time IS NULL) as missing_due_time,
  COUNT(*) FILTER (WHERE assigned_to_user_id IS NULL) as missing_assignment,
  COUNT(*) FILTER (WHERE status NOT IN ('pending', 'in_progress')) as wrong_status,
  COUNT(*) FILTER (
    WHERE due_time IS NOT NULL 
    AND assigned_to_user_id IS NOT NULL 
    AND status IN ('pending', 'in_progress')
  ) as ready_for_notifications
FROM checklist_tasks
WHERE due_date = CURRENT_DATE;

-- Check tasks due in the next few days (to see if they have required fields)
SELECT 
  due_date,
  COUNT(*) as total_tasks,
  COUNT(*) FILTER (WHERE due_time IS NOT NULL) as with_due_time,
  COUNT(*) FILTER (WHERE assigned_to_user_id IS NOT NULL) as with_assignment,
  COUNT(*) FILTER (
    WHERE due_time IS NOT NULL 
    AND assigned_to_user_id IS NOT NULL 
    AND status IN ('pending', 'in_progress')
  ) as ready_for_notifications
FROM checklist_tasks
WHERE due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
  AND status IN ('pending', 'in_progress')
GROUP BY due_date
ORDER BY due_date;

-- Check if tasks have dayparts (which might affect notification timing)
SELECT 
  COUNT(*) as tasks_with_dayparts,
  COUNT(*) FILTER (WHERE task_data->>'dayparts' IS NOT NULL) as has_dayparts_in_task_data,
  COUNT(*) FILTER (WHERE daypart IS NOT NULL) as has_daypart_column
FROM checklist_tasks
WHERE due_date = CURRENT_DATE
  AND status IN ('pending', 'in_progress');





