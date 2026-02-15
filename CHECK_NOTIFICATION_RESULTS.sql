-- ============================================================================
-- Check Notification Results - Understand What's Happening
-- ============================================================================
-- This script helps you understand if notifications are being created
-- and why you might not be seeing them
--
-- IMPORTANT: Run FIX_NOTIFICATIONS_NO_DUE_TIME.sql FIRST to add the
-- task_id column to the notifications table. Otherwise some checks will
-- be skipped.
-- ============================================================================

-- 1. Check if any notifications exist at all
-- ============================================================================
SELECT '=== NOTIFICATIONS SUMMARY ===' AS section;

SELECT 
  COUNT(*) AS total_notifications,
  COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE) AS notifications_today,
  COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE AND read = false) AS unread_today,
  type,
  COUNT(*) AS count_by_type
FROM notifications
GROUP BY type
ORDER BY count_by_type DESC;

-- 2. Show recent notifications (last 24 hours)
-- ============================================================================
SELECT '=== RECENT NOTIFICATIONS (LAST 24 HOURS) ===' AS section;

SELECT 
  id,
  type,
  title,
  message,
  user_id,
  company_id,
  read,
  created_at,
  severity,
  priority
FROM notifications
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 20;

-- 3. Check tasks due today that should trigger notifications
-- ============================================================================
SELECT '=== TASKS DUE TODAY THAT SHOULD CREATE NOTIFICATIONS ===' AS section;

SELECT 
  ct.id AS task_id,
  ct.custom_name,
  ct.due_date,
  COALESCE(NULLIF(ct.due_time, ''), ct.task_data->>'due_time', 'No time') AS due_time,
  ct.assigned_to_user_id,
  p.full_name AS assigned_user_name,
  ct.status,
  -- Check if user is clocked in
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM staff_attendance sa
      WHERE sa.user_id = ct.assigned_to_user_id
        AND sa.clock_out_time IS NULL
        AND sa.shift_status = 'on_shift'
        AND sa.clock_in_time::date = CURRENT_DATE
    ) THEN '✅ Clocked in'
    WHEN EXISTS (
      SELECT 1 FROM attendance_logs al
      WHERE al.user_id = ct.assigned_to_user_id
        AND al.clock_out_at IS NULL
        AND al.clock_in_at::date = CURRENT_DATE
    ) THEN '✅ Clocked in (attendance_logs)'
    ELSE '❌ NOT clocked in'
  END AS user_clock_status,
  -- Note: Cannot check notification status without task_id column
  -- Run FIX_NOTIFICATIONS_NO_DUE_TIME.sql first to add task_id column
  '⚠️ Check manually' AS notification_status
FROM checklist_tasks ct
LEFT JOIN profiles p ON p.id = ct.assigned_to_user_id
WHERE ct.due_date = CURRENT_DATE
  AND ct.status IN ('pending', 'in_progress')
ORDER BY ct.created_at DESC
LIMIT 10;

-- 4. Check cron job details - what is it actually doing?
-- ============================================================================
SELECT '=== CRON JOB DETAILS ===' AS section;

SELECT 
  jobid,
  jobname,
  schedule,
  command,
  active,
  CASE 
    WHEN active THEN '✅ Active'
    ELSE '❌ Inactive'
  END AS status
FROM cron.job
WHERE jobname = 'check-task-notifications-cron';

-- 5. Check what the edge function URL is
-- ============================================================================
SELECT '=== EDGE FUNCTION URL ===' AS section;

-- Extract the URL from the cron job command
SELECT 
  jobname,
  -- Try to extract URL from command (this is approximate)
  CASE 
    WHEN command LIKE '%check-task-notifications%' THEN '✅ Points to check-task-notifications function'
    ELSE '⚠️ Check command manually'
  END AS function_check,
  command
FROM cron.job
WHERE jobname = 'check-task-notifications-cron';

-- 6. Test notification creation manually
-- ============================================================================
SELECT '=== MANUAL NOTIFICATION TEST ===' AS section;

-- Get a sample task
DO $$
DECLARE
  v_task_id UUID;
  v_company_id UUID;
  v_site_id UUID;
  v_user_id UUID;
  v_task_name TEXT;
  v_due_time TEXT;
  v_notification_id UUID;
BEGIN
  -- Get first task due today
  SELECT 
    ct.id,
    ct.company_id,
    ct.site_id,
    ct.assigned_to_user_id,
    COALESCE(ct.custom_name, 'Test Task'),
    COALESCE(NULLIF(ct.due_time, ''), ct.task_data->>'due_time', '09:00')
  INTO v_task_id, v_company_id, v_site_id, v_user_id, v_task_name, v_due_time
  FROM checklist_tasks ct
  WHERE ct.due_date = CURRENT_DATE
    AND ct.status IN ('pending', 'in_progress')
    AND ct.assigned_to_user_id IS NOT NULL
  LIMIT 1;
  
  IF v_task_id IS NULL THEN
    RAISE NOTICE '❌ No tasks found with assigned users';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Testing notification creation for task: %', v_task_name;
  RAISE NOTICE 'Task ID: %', v_task_id;
  RAISE NOTICE 'User ID: %', v_user_id;
  RAISE NOTICE 'Due time: %', v_due_time;
  
  -- Check if user is clocked in
  IF is_user_clocked_in(v_user_id, v_site_id) THEN
    RAISE NOTICE '✅ User IS clocked in';
    
    -- Try to create notification
    SELECT create_task_ready_notification(
      v_task_id,
      v_company_id,
      v_site_id,
      v_user_id,
      v_task_name,
      v_due_time
    ) INTO v_notification_id;
    
    IF v_notification_id IS NOT NULL THEN
      RAISE NOTICE '✅ SUCCESS! Created notification: %', v_notification_id;
      RAISE NOTICE 'Check the notifications table to see it!';
    ELSE
      RAISE NOTICE '❌ Function returned NULL - notification not created';
      RAISE NOTICE 'Possible reasons:';
      RAISE NOTICE '  - User not clocked in (but we checked - they are)';
      RAISE NOTICE '  - Notification already exists for today';
      RAISE NOTICE '  - Function error (check logs)';
    END IF;
  ELSE
    RAISE NOTICE '❌ User is NOT clocked in';
    RAISE NOTICE 'Ready notifications require the user to be clocked in';
  END IF;
END $$;

-- 7. Check if notifications were just created
-- ============================================================================
SELECT '=== CHECK IF NOTIFICATIONS WERE CREATED (LAST 5 MINUTES) ===' AS section;

SELECT 
  COUNT(*) AS notifications_in_last_5_minutes
FROM notifications
WHERE created_at > NOW() - INTERVAL '5 minutes';

-- If no notifications in last 5 minutes, show why
SELECT 
  '=== WHY NO NOTIFICATIONS? ===' AS section,
  CASE 
    WHEN NOT EXISTS (
      SELECT 1 FROM checklist_tasks 
      WHERE due_date = CURRENT_DATE 
      AND status IN ('pending', 'in_progress')
    ) THEN '❌ No tasks due today'
    WHEN NOT EXISTS (
      SELECT 1 FROM checklist_tasks ct
      WHERE ct.due_date = CURRENT_DATE 
      AND ct.status IN ('pending', 'in_progress')
      AND ct.assigned_to_user_id IS NOT NULL
    ) THEN '❌ Tasks exist but none have assigned users'
    WHEN NOT EXISTS (
      SELECT 1 FROM checklist_tasks ct
      JOIN staff_attendance sa ON sa.user_id = ct.assigned_to_user_id
      WHERE ct.due_date = CURRENT_DATE 
      AND ct.status IN ('pending', 'in_progress')
      AND ct.assigned_to_user_id IS NOT NULL
      AND sa.clock_out_time IS NULL
      AND sa.shift_status = 'on_shift'
      AND sa.clock_in_time::date = CURRENT_DATE
    ) AND NOT EXISTS (
      SELECT 1 FROM checklist_tasks ct
      JOIN attendance_logs al ON al.user_id = ct.assigned_to_user_id
      WHERE ct.due_date = CURRENT_DATE 
      AND ct.status IN ('pending', 'in_progress')
      AND ct.assigned_to_user_id IS NOT NULL
      AND al.clock_out_at IS NULL
      AND al.clock_in_at::date = CURRENT_DATE
    ) THEN '❌ Tasks exist with assigned users, but NO users are clocked in (required for ready notifications)'
    WHEN EXISTS (
      SELECT 1 FROM checklist_tasks ct
      WHERE ct.due_date = CURRENT_DATE 
      AND ct.status IN ('pending', 'in_progress')
      AND ct.assigned_to_user_id IS NOT NULL
      AND (ct.due_time IS NULL OR ct.due_time = '')
      AND (ct.task_data->>'due_time' IS NULL OR ct.task_data->>'due_time' = '')
      AND (ct.task_data->'daypart_times' IS NULL)
    ) THEN '⚠️ Some tasks have no due_time - edge function may skip them (run FIX_NOTIFICATIONS_NO_DUE_TIME.sql)'
    ELSE '✅ Tasks and users look good - check edge function logs'
  END AS reason;

-- Show recent notifications (all time, not just 5 minutes)
SELECT 
  '=== ALL RECENT NOTIFICATIONS (LAST 24 HOURS) ===' AS section;

SELECT 
  id,
  type,
  title,
  LEFT(message, 100) AS message_preview,
  user_id,
  company_id,
  read,
  created_at,
  severity
FROM notifications
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 20;

-- If still no notifications, provide actionable steps
SELECT 
  '=== NEXT STEPS ===' AS section,
  CASE 
    WHEN NOT EXISTS (
      SELECT 1 FROM notifications WHERE created_at > NOW() - INTERVAL '24 hours'
    ) THEN 
      '1. Run FIX_NOTIFICATIONS_NO_DUE_TIME.sql to add task_id column and fix functions' || E'\n' ||
      '2. Ensure users are clocked in (required for ready notifications)' || E'\n' ||
      '3. Check edge function logs in Supabase Dashboard' || E'\n' ||
      '4. Manually trigger edge function to test: curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/check-task-notifications -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"'
    ELSE 'Notifications exist! Check if they are showing in your dashboard UI'
  END AS action_items;

