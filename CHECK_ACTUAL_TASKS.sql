-- ============================================================================
-- Check Actual Tasks and Why They're Not Matching Notification Criteria
-- ============================================================================

-- First, check what columns actually exist in checklist_tasks table
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'checklist_tasks'
  AND column_name IN ('assigned_to_user_id', 'assigned_to', 'user_id', 'assigned_user_id', 'due_time', 'due_date', 'daypart', 'status', 'task_data')
ORDER BY 
  CASE column_name
    WHEN 'assigned_to_user_id' THEN 1
    WHEN 'assigned_to' THEN 2
    WHEN 'user_id' THEN 3
    WHEN 'assigned_user_id' THEN 4
    WHEN 'due_time' THEN 5
    WHEN 'due_date' THEN 6
    ELSE 7
  END;

-- First, let's see ALL tasks due today with all their fields
SELECT 
  id,
  custom_name,
  template_id,
  due_date,
  due_time,
  assigned_to_user_id,
  daypart,
  status,
  company_id,
  site_id,
  -- Check if task_data has dayparts
  CASE 
    WHEN task_data IS NOT NULL AND task_data ? 'dayparts' THEN 'Has dayparts in task_data'
    ELSE 'No dayparts in task_data'
  END as dayparts_info,
  created_at
FROM checklist_tasks
WHERE due_date = CURRENT_DATE
ORDER BY due_time NULLS LAST, created_at DESC;

-- Check the exact fields the notification cron is looking for
-- (Based on check-task-notifications function)
SELECT 
  id,
  template_id,
  site_id,
  assigned_to_user_id,
  due_date,
  due_time,
  daypart,
  status,
  company_id,
  -- Check if task_data has source = 'cron' (these are excluded)
  CASE 
    WHEN task_data IS NOT NULL AND task_data->>'source' = 'cron' THEN '❌ Cron-generated (excluded)'
    ELSE '✅ Not cron-generated'
  END as cron_source_check,
  -- Check if due_time exists
  CASE 
    WHEN due_time IS NULL THEN '❌ Missing due_time'
    ELSE '✅ Has due_time'
  END as due_time_check,
  -- Check if assigned_to_user_id exists
  CASE 
    WHEN assigned_to_user_id IS NULL THEN '❌ Missing assigned_to_user_id'
    ELSE '✅ Has assigned_to_user_id'
  END as assignment_check,
  -- Check status
  CASE 
    WHEN status IN ('pending', 'in_progress') THEN '✅ Valid status'
    ELSE '❌ Invalid status: ' || status
  END as status_check
FROM checklist_tasks
WHERE due_date = CURRENT_DATE
ORDER BY due_time NULLS LAST;

-- Count by the exact criteria the notification cron uses
SELECT 
  'Total tasks due today' as category,
  COUNT(*) as count
FROM checklist_tasks
WHERE due_date = CURRENT_DATE

UNION ALL

SELECT 
  'Tasks with status pending/in_progress',
  COUNT(*)
FROM checklist_tasks
WHERE due_date = CURRENT_DATE
  AND status IN ('pending', 'in_progress')

UNION ALL

SELECT 
  'Tasks with due_time set',
  COUNT(*)
FROM checklist_tasks
WHERE due_date = CURRENT_DATE
  AND due_time IS NOT NULL

UNION ALL

SELECT 
  'Tasks with assigned_to_user_id',
  COUNT(*)
FROM checklist_tasks
WHERE due_date = CURRENT_DATE
  AND assigned_to_user_id IS NOT NULL

UNION ALL

SELECT 
  'Tasks NOT cron-generated',
  COUNT(*)
FROM checklist_tasks
WHERE due_date = CURRENT_DATE
  AND NOT (task_data IS NOT NULL AND task_data->>'source' = 'cron')

UNION ALL

SELECT 
  'Tasks matching ALL criteria for notifications',
  COUNT(*)
FROM checklist_tasks
WHERE due_date = CURRENT_DATE
  AND status IN ('pending', 'in_progress')
  AND due_time IS NOT NULL
  AND NOT (task_data IS NOT NULL AND task_data->>'source' = 'cron');

-- Check if tasks have dayparts that need expansion
SELECT 
  id,
  custom_name,
  due_time,
  daypart,
  task_data->'dayparts' as dayparts_from_task_data,
  CASE 
    WHEN task_data->'dayparts' IS NOT NULL AND jsonb_typeof(task_data->'dayparts') = 'array' THEN
      'Has ' || jsonb_array_length(task_data->'dayparts') || ' dayparts in task_data'
    WHEN daypart IS NOT NULL THEN
      'Has daypart: ' || daypart
    ELSE
      'No dayparts'
  END as dayparts_summary
FROM checklist_tasks
WHERE due_date = CURRENT_DATE
  AND status IN ('pending', 'in_progress')
  AND due_time IS NOT NULL
ORDER BY due_time;

-- Check what the notification cron would actually process
-- (This simulates what the edge function does)
SELECT 
  ct.id,
  ct.custom_name,
  ct.due_time,
  ct.assigned_to_user_id,
  ct.status,
  -- Show task_data source
  ct.task_data->>'source' as task_source,
  CASE 
    WHEN ct.task_data IS NOT NULL AND ct.task_data->>'source' = 'cron' THEN '❌ EXCLUDED (cron-generated)'
    ELSE '✅ Included'
  END as cron_exclusion_status,
  -- Check if user is clocked in
  CASE 
    WHEN ct.assigned_to_user_id IS NULL THEN 'N/A (no assignment)'
    WHEN EXISTS (
      SELECT 1 FROM attendance_logs a
      WHERE a.user_id = ct.assigned_to_user_id
        AND a.clock_out_at IS NULL
        AND a.clock_in_at::date = CURRENT_DATE
    ) THEN '✅ Clocked in'
    ELSE '❌ Not clocked in'
  END as user_clocked_in,
  -- Calculate notification windows
  CASE 
    WHEN ct.due_time IS NOT NULL THEN
      CASE 
        -- Ready window: 1 hour before due time
        WHEN (EXTRACT(HOUR FROM NOW()) * 60 + EXTRACT(MINUTE FROM NOW())) >= 
             (CAST(SPLIT_PART(ct.due_time, ':', 1) AS INTEGER) * 60 + 
              CAST(SPLIT_PART(ct.due_time, ':', 2) AS INTEGER) - 60)
         AND (EXTRACT(HOUR FROM NOW()) * 60 + EXTRACT(MINUTE FROM NOW())) < 
             (CAST(SPLIT_PART(ct.due_time, ':', 1) AS INTEGER) * 60 + 
              CAST(SPLIT_PART(ct.due_time, ':', 2) AS INTEGER))
        THEN 'READY_WINDOW (1hr before)'
        -- Late window: 1 hour after due time
        WHEN (EXTRACT(HOUR FROM NOW()) * 60 + EXTRACT(MINUTE FROM NOW())) > 
             (CAST(SPLIT_PART(ct.due_time, ':', 1) AS INTEGER) * 60 + 
              CAST(SPLIT_PART(ct.due_time, ':', 2) AS INTEGER) + 60)
        THEN 'LATE_WINDOW (1hr after)'
        ELSE 'OUTSIDE_WINDOW'
      END
    ELSE 'NO_DUE_TIME'
  END as notification_window,
  CURRENT_TIME as current_time_for_reference
FROM checklist_tasks ct
WHERE ct.due_date = CURRENT_DATE
  AND ct.status IN ('pending', 'in_progress')
  AND ct.due_time IS NOT NULL
ORDER BY 
  CASE 
    WHEN ct.task_data IS NOT NULL AND ct.task_data->>'source' = 'cron' THEN 2
    ELSE 1
  END,
  ct.due_time;

-- Summary: Why tasks are/aren't being processed
SELECT 
  'Total tasks due today' as category,
  COUNT(*) as count
FROM checklist_tasks
WHERE due_date = CURRENT_DATE

UNION ALL

SELECT 
  'Tasks with status pending/in_progress',
  COUNT(*)
FROM checklist_tasks
WHERE due_date = CURRENT_DATE
  AND status IN ('pending', 'in_progress')

UNION ALL

SELECT 
  'Tasks with due_time set',
  COUNT(*)
FROM checklist_tasks
WHERE due_date = CURRENT_DATE
  AND due_time IS NOT NULL

UNION ALL

SELECT 
  'Tasks EXCLUDED (cron-generated)',
  COUNT(*)
FROM checklist_tasks
WHERE due_date = CURRENT_DATE
  AND task_data IS NOT NULL 
  AND task_data->>'source' = 'cron'

UNION ALL

SELECT 
  'Tasks that WILL be processed by notification cron',
  COUNT(*)
FROM checklist_tasks
WHERE due_date = CURRENT_DATE
  AND status IN ('pending', 'in_progress')
  AND due_time IS NOT NULL
  AND NOT (task_data IS NOT NULL AND task_data->>'source' = 'cron');

