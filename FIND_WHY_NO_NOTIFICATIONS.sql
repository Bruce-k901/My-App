-- ============================================================================
-- Find Why No Notifications - Shows Actual Data
-- ============================================================================
-- This script shows you EXACTLY what's happening with your tasks and notifications
-- ============================================================================

-- 1. Show tasks due today with all details
-- ============================================================================
SELECT '=== TASKS DUE TODAY ===' AS section;

SELECT 
  ct.id AS task_id,
  ct.custom_name AS task_name,
  ct.due_date,
  COALESCE(NULLIF(ct.due_time, ''), ct.task_data->>'due_time', 'NO TIME SET') AS due_time,
  ct.assigned_to_user_id,
  p.full_name AS assigned_user,
  ct.status,
  ct.company_id,
  ct.site_id,
  -- Check clock-in status
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM staff_attendance sa
      WHERE sa.user_id = ct.assigned_to_user_id
        AND sa.clock_out_time IS NULL
        AND sa.shift_status = 'on_shift'
        AND sa.clock_in_time::date = CURRENT_DATE
    ) THEN '✅ CLOCKED IN'
    WHEN EXISTS (
      SELECT 1 FROM attendance_logs al
      WHERE al.user_id = ct.assigned_to_user_id
        AND al.clock_out_at IS NULL
        AND al.clock_in_at::date = CURRENT_DATE
    ) THEN '✅ CLOCKED IN (attendance_logs)'
    ELSE '❌ NOT CLOCKED IN'
  END AS clock_status,
  -- Check if notification exists
  (SELECT COUNT(*) FROM notifications n 
   WHERE n.user_id = ct.assigned_to_user_id 
   AND n.created_at::date = CURRENT_DATE
   AND n.type IN ('task_ready', 'task_late', 'task')) AS notifications_for_user_today
FROM checklist_tasks ct
LEFT JOIN profiles p ON p.id = ct.assigned_to_user_id
WHERE ct.due_date = CURRENT_DATE
  AND ct.status IN ('pending', 'in_progress')
ORDER BY ct.created_at DESC;

-- 2. Show summary statistics
-- ============================================================================
SELECT '=== SUMMARY ===' AS section;

SELECT 
  (SELECT COUNT(*) FROM checklist_tasks WHERE due_date = CURRENT_DATE AND status IN ('pending', 'in_progress')) AS total_tasks_due_today,
  (SELECT COUNT(*) FROM checklist_tasks ct 
   WHERE ct.due_date = CURRENT_DATE 
   AND ct.status IN ('pending', 'in_progress')
   AND ct.assigned_to_user_id IS NOT NULL) AS tasks_with_assigned_user,
  (SELECT COUNT(*) FROM checklist_tasks ct
   JOIN staff_attendance sa ON sa.user_id = ct.assigned_to_user_id
   WHERE ct.due_date = CURRENT_DATE 
   AND ct.status IN ('pending', 'in_progress')
   AND ct.assigned_to_user_id IS NOT NULL
   AND sa.clock_out_time IS NULL
   AND sa.shift_status = 'on_shift'
   AND sa.clock_in_time::date = CURRENT_DATE) AS tasks_with_clocked_in_user,
  (SELECT COUNT(*) FROM checklist_tasks ct
   WHERE ct.due_date = CURRENT_DATE 
   AND ct.status IN ('pending', 'in_progress')
   AND (ct.due_time IS NOT NULL AND ct.due_time != '')
   OR (ct.task_data->>'due_time' IS NOT NULL AND ct.task_data->>'due_time' != '')) AS tasks_with_due_time,
  (SELECT COUNT(*) FROM notifications WHERE created_at::date = CURRENT_DATE) AS notifications_created_today;

-- 3. Show who is currently clocked in
-- ============================================================================
SELECT '=== USERS CURRENTLY CLOCKED IN ===' AS section;

SELECT 
  p.id AS user_id,
  p.full_name,
  p.email,
  sa.clock_in_time,
  sa.site_id,
  s.name AS site_name
FROM profiles p
JOIN staff_attendance sa ON sa.user_id = p.id
LEFT JOIN sites s ON s.id = sa.site_id
WHERE sa.clock_out_time IS NULL
  AND sa.shift_status = 'on_shift'
  AND sa.clock_in_time::date = CURRENT_DATE
ORDER BY sa.clock_in_time DESC;

-- 4. Show all notifications created today
-- ============================================================================
SELECT '=== NOTIFICATIONS CREATED TODAY ===' AS section;

SELECT 
  id,
  type,
  title,
  LEFT(message, 80) AS message_preview,
  user_id,
  company_id,
  read,
  created_at,
  severity
FROM notifications
WHERE created_at::date = CURRENT_DATE
ORDER BY created_at DESC;

-- 5. Test creating a notification manually
-- ============================================================================
SELECT '=== MANUAL TEST ===' AS section;

DO $$
DECLARE
  v_task RECORD;
  v_notification_id UUID;
  v_result TEXT := '';
BEGIN
  -- Find first task due today with assigned user
  SELECT ct.*, p.full_name AS user_name
  INTO v_task
  FROM checklist_tasks ct
  LEFT JOIN profiles p ON p.id = ct.assigned_to_user_id
  WHERE ct.due_date = CURRENT_DATE
    AND ct.status IN ('pending', 'in_progress')
    AND ct.assigned_to_user_id IS NOT NULL
  LIMIT 1;
  
  IF v_task.id IS NULL THEN
    RAISE NOTICE '❌ NO TASKS FOUND: No tasks due today with assigned users';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Found task: % (ID: %)', v_task.custom_name, v_task.id;
  RAISE NOTICE 'Assigned to: % (%)', v_task.user_name, v_task.assigned_to_user_id;
  RAISE NOTICE 'Due time: %', COALESCE(NULLIF(v_task.due_time, ''), v_task.task_data->>'due_time', 'NO TIME');
  
  -- Check if user is clocked in
  IF is_user_clocked_in(v_task.assigned_to_user_id, v_task.site_id) THEN
    RAISE NOTICE '✅ User IS clocked in';
    
    -- Try to create notification
    SELECT create_task_ready_notification(
      v_task.id,
      v_task.company_id,
      v_task.site_id,
      v_task.assigned_to_user_id,
      COALESCE(v_task.custom_name, 'Task'),
      COALESCE(NULLIF(v_task.due_time, ''), v_task.task_data->>'due_time', NULL)
    ) INTO v_notification_id;
    
    IF v_notification_id IS NOT NULL THEN
      RAISE NOTICE '✅✅✅ SUCCESS! Created notification: %', v_notification_id;
      RAISE NOTICE 'Check notifications table - you should see it now!';
    ELSE
      RAISE NOTICE '❌ Function returned NULL - notification NOT created';
      RAISE NOTICE 'This means: notification already exists OR function has an error';
    END IF;
  ELSE
    RAISE NOTICE '❌ User is NOT clocked in';
    RAISE NOTICE 'This is why no notifications are being created!';
    RAISE NOTICE 'The is_user_clocked_in() function returned FALSE';
  END IF;
END $$;

-- 6. Check what is_user_clocked_in actually returns
-- ============================================================================
SELECT '=== TESTING is_user_clocked_in FUNCTION ===' AS section;

SELECT 
  ct.id AS task_id,
  ct.custom_name,
  ct.assigned_to_user_id,
  p.full_name,
  is_user_clocked_in(ct.assigned_to_user_id, ct.site_id) AS function_result,
  -- Also check manually
  EXISTS (
    SELECT 1 FROM staff_attendance sa
    WHERE sa.user_id = ct.assigned_to_user_id
      AND sa.clock_out_time IS NULL
      AND sa.shift_status = 'on_shift'
      AND sa.clock_in_time::date = CURRENT_DATE
  ) AS manual_check_staff_attendance,
  EXISTS (
    SELECT 1 FROM attendance_logs al
    WHERE al.user_id = ct.assigned_to_user_id
      AND al.clock_out_at IS NULL
      AND al.clock_in_at::date = CURRENT_DATE
  ) AS manual_check_attendance_logs
FROM checklist_tasks ct
LEFT JOIN profiles p ON p.id = ct.assigned_to_user_id
WHERE ct.due_date = CURRENT_DATE
  AND ct.status IN ('pending', 'in_progress')
  AND ct.assigned_to_user_id IS NOT NULL
LIMIT 5;

