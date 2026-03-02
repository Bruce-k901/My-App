-- ============================================================================
-- Manual Notification Test Script
-- ============================================================================
-- This script helps you test notification creation manually to see why
-- notifications aren't being created automatically
-- ============================================================================

-- Step 1: Check if you have tasks due today
-- ============================================================================
SELECT '=== TASKS DUE TODAY ===' AS step;

SELECT 
  id,
  custom_name,
  due_date,
  due_time,
  assigned_to_user_id,
  status,
  site_id,
  company_id,
  task_data->>'due_time' AS due_time_in_task_data,
  task_data->'daypart_times' AS daypart_times
FROM checklist_tasks
WHERE due_date = CURRENT_DATE
  AND status IN ('pending', 'in_progress')
ORDER BY created_at DESC
LIMIT 10;

-- Step 2: Check if assigned users are clocked in
-- ============================================================================
SELECT '=== CHECKING IF ASSIGNED USERS ARE CLOCKED IN ===' AS step;

SELECT 
  ct.id AS task_id,
  ct.custom_name,
  ct.assigned_to_user_id,
  p.full_name AS assigned_user_name,
  p.email AS assigned_user_email,
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
  END AS clock_in_status
FROM checklist_tasks ct
LEFT JOIN profiles p ON p.id = ct.assigned_to_user_id
WHERE ct.due_date = CURRENT_DATE
  AND ct.status IN ('pending', 'in_progress')
  AND ct.assigned_to_user_id IS NOT NULL
ORDER BY ct.created_at DESC
LIMIT 10;

-- Step 3: Test notification functions directly
-- ============================================================================
SELECT '=== TESTING NOTIFICATION FUNCTIONS ===' AS step;

-- Replace these UUIDs with actual values from your tasks
-- Get a task ID from Step 1 above
DO $$
DECLARE
  v_task_id UUID;
  v_company_id UUID;
  v_site_id UUID;
  v_user_id UUID;
  v_task_name TEXT;
  v_due_time TEXT;
  v_notification_id UUID;
  v_notification_count INTEGER;
BEGIN
  -- Get first task due today with assigned user
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
  
  RAISE NOTICE 'Testing with task: % (ID: %)', v_task_name, v_task_id;
  RAISE NOTICE 'Assigned user: %', v_user_id;
  RAISE NOTICE 'Due time: %', v_due_time;
  
  -- Test is_user_clocked_in function
  IF is_user_clocked_in(v_user_id, v_site_id) THEN
    RAISE NOTICE '✅ User IS clocked in';
    
    -- Test creating ready notification
    SELECT create_task_ready_notification(
      v_task_id,
      v_company_id,
      v_site_id,
      v_user_id,
      v_task_name,
      v_due_time
    ) INTO v_notification_id;
    
    IF v_notification_id IS NOT NULL THEN
      RAISE NOTICE '✅ Created ready notification: %', v_notification_id;
    ELSE
      RAISE NOTICE '❌ Failed to create ready notification (function returned NULL)';
    END IF;
  ELSE
    RAISE NOTICE '❌ User is NOT clocked in - ready notifications require clock-in';
  END IF;
  
  -- Test getting managers on shift
  SELECT COUNT(*) INTO v_notification_count
  FROM get_managers_on_shift(v_site_id, v_company_id);
  
  IF v_notification_count > 0 THEN
    RAISE NOTICE '✅ Found % manager(s) on shift', v_notification_count;
    
    -- Test creating late notification
    SELECT create_late_task_notification(
      v_task_id,
      v_company_id,
      v_site_id,
      v_task_name,
      v_due_time,
      v_user_id
    ) INTO v_notification_count;
    
    RAISE NOTICE '✅ Created % late notification(s)', v_notification_count;
  ELSE
    RAISE NOTICE '⚠️ No managers on shift - late notifications require managers';
  END IF;
  
END $$;

-- Step 4: Check if notifications were created
-- ============================================================================
SELECT '=== CHECKING CREATED NOTIFICATIONS ===' AS step;

-- Check if task_id and site_id columns exist
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'notifications' 
      AND column_name = 'task_id'
    ) THEN '✅ task_id column exists'
    ELSE '⚠️ task_id column MISSING - run FIX_NOTIFICATIONS_NO_DUE_TIME.sql to add it'
  END AS task_id_column_status,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'notifications' 
      AND column_name = 'site_id'
    ) THEN '✅ site_id column exists'
    ELSE '⚠️ site_id column MISSING'
  END AS site_id_column_status;

-- Show recent notifications (basic columns that always exist)
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
WHERE created_at::date = CURRENT_DATE
ORDER BY created_at DESC
LIMIT 20;

-- Step 5: Check cron job status
-- ============================================================================
SELECT '=== CRON JOB STATUS ===' AS step;

SELECT 
  jobid,
  jobname,
  schedule,
  active,
  CASE 
    WHEN active THEN '✅ Active'
    ELSE '❌ Inactive'
  END AS status
FROM cron.job
WHERE jobname = 'check-task-notifications-cron';

-- Check recent executions
SELECT 
  start_time,
  end_time,
  status,
  return_message,
  CASE 
    WHEN status = 'succeeded' THEN '✅ Success'
    WHEN status = 'failed' THEN '❌ Failed'
    ELSE '⚠️ Unknown'
  END AS execution_status
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'check-task-notifications-cron')
ORDER BY start_time DESC
LIMIT 5;

