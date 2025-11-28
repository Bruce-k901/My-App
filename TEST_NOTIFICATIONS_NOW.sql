-- ============================================================================
-- Quick Test: Will Notifications Work Right Now?
-- Run this to see if notifications will be created
-- ============================================================================

-- 1. Check if tasks are in notification windows RIGHT NOW
SELECT 
  ct.id,
  ct.custom_name,
  ct.due_time,
  ct.assigned_to_user_id,
  p.full_name as assigned_to_name,
  -- Check if user is clocked in
  EXISTS (
    SELECT 1 FROM attendance_logs a
    WHERE a.user_id = ct.assigned_to_user_id
      AND a.clock_out_at IS NULL
      AND a.clock_in_at::date = CURRENT_DATE
  ) as user_clocked_in,
  -- Calculate which notification window we're in
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
        THEN '✅ READY_WINDOW - Ready notification WILL be created (if user clocked in)'
        -- Late window: 1 hour after due time
        WHEN (EXTRACT(HOUR FROM NOW()) * 60 + EXTRACT(MINUTE FROM NOW())) > 
             (CAST(SPLIT_PART(ct.due_time, ':', 1) AS INTEGER) * 60 + 
              CAST(SPLIT_PART(ct.due_time, ':', 2) AS INTEGER) + 60)
        THEN '✅ LATE_WINDOW - Late notification WILL be created (if managers on shift)'
        ELSE '⏳ OUTSIDE_WINDOW - No notification yet (wait for window)'
      END
    ELSE '❌ NO_DUE_TIME'
  END as notification_status,
  CURRENT_TIME as current_time,
  ct.due_time as task_due_time
FROM checklist_tasks ct
LEFT JOIN profiles p ON p.id = ct.assigned_to_user_id
WHERE ct.due_date = CURRENT_DATE
  AND ct.status IN ('pending', 'in_progress')
  AND ct.due_time IS NOT NULL
  AND NOT (ct.task_data IS NOT NULL AND ct.task_data->>'source' = 'cron')
ORDER BY ct.due_time;

-- 2. Summary: How many tasks are in each window?
SELECT 
  'Tasks in READY window (1hr before due)' as window_type,
  COUNT(*) as count,
  COUNT(*) FILTER (
    WHERE EXISTS (
      SELECT 1 FROM attendance_logs a
      WHERE a.user_id = ct.assigned_to_user_id
        AND a.clock_out_at IS NULL
        AND a.clock_in_at::date = CURRENT_DATE
    )
  ) as with_clocked_in_user
FROM checklist_tasks ct
WHERE ct.due_date = CURRENT_DATE
  AND ct.status IN ('pending', 'in_progress')
  AND ct.due_time IS NOT NULL
  AND NOT (ct.task_data IS NOT NULL AND ct.task_data->>'source' = 'cron')
  AND (EXTRACT(HOUR FROM NOW()) * 60 + EXTRACT(MINUTE FROM NOW())) >= 
      (CAST(SPLIT_PART(ct.due_time, ':', 1) AS INTEGER) * 60 + 
       CAST(SPLIT_PART(ct.due_time, ':', 2) AS INTEGER) - 60)
  AND (EXTRACT(HOUR FROM NOW()) * 60 + EXTRACT(MINUTE FROM NOW())) < 
      (CAST(SPLIT_PART(ct.due_time, ':', 1) AS INTEGER) * 60 + 
       CAST(SPLIT_PART(ct.due_time, ':', 2) AS INTEGER))

UNION ALL

SELECT 
  'Tasks in LATE window (1hr after due)' as window_type,
  COUNT(*) as count,
  0 as with_clocked_in_user  -- Will show managers separately
FROM checklist_tasks ct
WHERE ct.due_date = CURRENT_DATE
  AND ct.status IN ('pending', 'in_progress')
  AND ct.due_time IS NOT NULL
  AND NOT (ct.task_data IS NOT NULL AND ct.task_data->>'source' = 'cron')
  AND (EXTRACT(HOUR FROM NOW()) * 60 + EXTRACT(MINUTE FROM NOW())) > 
      (CAST(SPLIT_PART(ct.due_time, ':', 1) AS INTEGER) * 60 + 
       CAST(SPLIT_PART(ct.due_time, ':', 2) AS INTEGER) + 60);

-- 2b. Check managers on shift (for late notifications)
SELECT 
  'Managers on shift' as summary,
  COUNT(*) as count,
  site_id,
  company_id
FROM get_managers_on_shift(NULL, NULL)
GROUP BY site_id, company_id;

-- 3. Check existing notifications today
SELECT 
  'Notifications created today' as summary,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE type = 'task_ready') as ready_notifications,
  COUNT(*) FILTER (WHERE type = 'task_late') as late_notifications,
  COUNT(*) FILTER (WHERE read = false) as unread
FROM notifications
WHERE created_at::date = CURRENT_DATE;

-- 4. Show recent notifications
SELECT 
  type,
  title,
  message,
  severity,
  read,
  created_at,
  CASE 
    WHEN created_at > NOW() - INTERVAL '15 minutes' THEN '✅ Just created'
    ELSE '⏰ Older'
  END as recency
FROM notifications
WHERE created_at::date = CURRENT_DATE
ORDER BY created_at DESC
LIMIT 10;

