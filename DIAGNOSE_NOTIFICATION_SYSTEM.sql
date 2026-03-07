-- ============================================================================
-- Comprehensive Notification System Diagnostic
-- ============================================================================
-- This script checks all aspects of the notification system to identify
-- why notifications aren't appearing for tasks, messages, and calendar events
-- 
-- Note: If you get errors about missing columns, it means your database schema
-- may need to be updated. Run FIX_NOTIFICATION_SYSTEM.sql to add missing columns.
-- ============================================================================

-- 1. CHECK CRON JOB STATUS
-- ============================================================================
SELECT '=== CRON JOB STATUS ===' AS section;

-- Check if cron extension is enabled
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') 
    THEN '✅ pg_cron extension is enabled'
    ELSE '❌ pg_cron extension is NOT enabled'
  END AS cron_extension_status;

-- Check if cron job exists
SELECT 
  jobid,
  jobname,
  schedule,
  command,
  active,
  CASE 
    WHEN EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'check-task-notifications-cron')
    THEN '✅ Cron job exists'
    ELSE '❌ Cron job does NOT exist'
  END AS cron_job_status
FROM cron.job 
WHERE jobname = 'check-task-notifications-cron';

-- Check recent cron job executions
SELECT 
  '=== RECENT CRON EXECUTIONS ===' AS section,
  runid,
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
LIMIT 10;

-- 2. CHECK NOTIFICATION FUNCTIONS
-- ============================================================================
SELECT '=== NOTIFICATION FUNCTIONS ===' AS section;

SELECT 
  routine_name,
  routine_type,
  CASE 
    WHEN routine_name IN ('create_task_ready_notification', 'create_late_task_notification', 'is_user_clocked_in', 'get_managers_on_shift')
    THEN '✅ Exists'
    ELSE '⚠️ Missing'
  END AS status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'create_task_ready_notification',
    'create_late_task_notification',
    'is_user_clocked_in',
    'get_managers_on_shift'
  );

-- 3. CHECK NOTIFICATIONS TABLE STRUCTURE
-- ============================================================================
SELECT '=== NOTIFICATIONS TABLE STRUCTURE ===' AS section;

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'notifications'
ORDER BY ordinal_position;

-- Check if required columns exist
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'notifications' AND column_name = 'task_id'
    ) THEN '✅ task_id column exists'
    ELSE '❌ task_id column MISSING'
  END AS task_id_status,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'notifications' AND column_name = 'push_sent'
    ) THEN '✅ push_sent column exists'
    ELSE '❌ push_sent column MISSING'
  END AS push_sent_status;

-- 4. CHECK TASKS DUE TODAY
-- ============================================================================
SELECT '=== TASKS DUE TODAY ===' AS section;

SELECT 
  COUNT(*) AS total_tasks_due_today,
  -- Check due_time column (not null and not empty)
  COUNT(*) FILTER (WHERE due_time IS NOT NULL AND due_time != '') AS tasks_with_due_time_column,
  -- Check if due_time is in task_data (for multi-daypart tasks)
  COUNT(*) FILTER (WHERE (due_time IS NOT NULL AND due_time != '') 
                     OR (task_data->>'due_time' IS NOT NULL AND task_data->>'due_time' != '')
                     OR (task_data->'daypart_times' IS NOT NULL)) AS tasks_with_due_time_anywhere,
  COUNT(*) FILTER (WHERE (due_time IS NULL OR due_time = '') 
                     AND (task_data->>'due_time' IS NULL OR task_data->>'due_time' = '')
                     AND (task_data->'daypart_times' IS NULL)) AS tasks_without_due_time,
  COUNT(*) FILTER (WHERE assigned_to_user_id IS NOT NULL) AS tasks_with_assigned_user,
  COUNT(*) FILTER (WHERE assigned_to_user_id IS NULL) AS tasks_without_assigned_user,
  COUNT(*) FILTER (WHERE status IN ('pending', 'in_progress')) AS tasks_pending_or_in_progress,
  COUNT(*) FILTER (WHERE task_data->>'source' = 'cron') AS cron_generated_tasks
FROM checklist_tasks
WHERE due_date = CURRENT_DATE;

-- Show sample tasks that should trigger notifications
SELECT 
  '=== SAMPLE TASKS DUE TODAY ===' AS section,
  id,
  custom_name,
  due_date,
  due_time AS due_time_column,
  task_data->>'due_time' AS due_time_in_task_data,
  task_data->'daypart_times' AS daypart_times_in_task_data,
  -- Get effective due_time (from column, task_data, or daypart_times)
  COALESCE(
    NULLIF(due_time, ''),
    task_data->>'due_time',
    (SELECT value->>'due_time' FROM jsonb_array_elements(task_data->'daypart_times') WHERE value->>'due_time' IS NOT NULL LIMIT 1)
  ) AS effective_due_time,
  assigned_to_user_id,
  status,
  site_id,
  company_id,
  CASE 
    WHEN COALESCE(NULLIF(due_time, ''), task_data->>'due_time', 
                  (SELECT value->>'due_time' FROM jsonb_array_elements(task_data->'daypart_times') WHERE value->>'due_time' IS NOT NULL LIMIT 1)) IS NULL 
    THEN '❌ Missing due_time (check column and task_data)'
    WHEN assigned_to_user_id IS NULL THEN '❌ Missing assigned user'
    WHEN status NOT IN ('pending', 'in_progress') THEN '❌ Wrong status'
    WHEN task_data->>'source' = 'cron' THEN '⚠️ Cron-generated (excluded)'
    ELSE '✅ Should trigger notification'
  END AS notification_readiness
FROM checklist_tasks
WHERE due_date = CURRENT_DATE
  AND status IN ('pending', 'in_progress')
ORDER BY COALESCE(NULLIF(due_time, ''), task_data->>'due_time') NULLS LAST
LIMIT 10;

-- 5. CHECK USERS CLOCKED IN
-- ============================================================================
SELECT '=== CLOCKED IN USERS ===' AS section;

-- Check using staff_attendance table
SELECT 
  COUNT(*) AS total_clocked_in_users,
  COUNT(DISTINCT sa.user_id) AS unique_users_clocked_in
FROM staff_attendance sa
WHERE sa.clock_out_time IS NULL
  AND sa.shift_status = 'on_shift'
  AND sa.clock_in_time::date = CURRENT_DATE;

-- Show users who are clocked in
SELECT 
  '=== USERS CURRENTLY CLOCKED IN ===' AS section,
  p.id AS user_id,
  p.full_name,
  p.email,
  sa.clock_in_time,
  sa.site_id,
  CASE 
    WHEN sa.clock_out_time IS NULL AND sa.shift_status = 'on_shift' 
    THEN '✅ Clocked in'
    ELSE '❌ Not clocked in'
  END AS status
FROM profiles p
JOIN staff_attendance sa ON sa.user_id = p.id
WHERE sa.clock_out_time IS NULL
  AND sa.shift_status = 'on_shift'
  AND sa.clock_in_time::date = CURRENT_DATE
ORDER BY sa.clock_in_time DESC;

-- 6. CHECK MANAGERS ON SHIFT
-- ============================================================================
SELECT '=== MANAGERS ON SHIFT ===' AS section;

SELECT 
  COUNT(*) AS managers_on_shift_count
FROM staff_attendance sa
JOIN profiles p ON p.id = sa.user_id
WHERE sa.clock_out_time IS NULL
  AND sa.shift_status = 'on_shift'
  AND sa.clock_in_time::date = CURRENT_DATE
  AND p.app_role IN ('Manager', 'General Manager', 'Admin', 'Owner');

-- 7. CHECK EXISTING NOTIFICATIONS
-- ============================================================================
SELECT '=== EXISTING NOTIFICATIONS ===' AS section;

SELECT 
  COUNT(*) AS total_notifications_today,
  COUNT(*) FILTER (WHERE read = false) AS unread_notifications,
  COUNT(*) FILTER (WHERE read = true) AS read_notifications,
  type,
  COUNT(*) AS count_by_type
FROM notifications
WHERE created_at::date = CURRENT_DATE
GROUP BY type
ORDER BY count_by_type DESC;

-- Show recent notifications
-- Note: site_id may not exist in all database versions
SELECT 
  '=== RECENT NOTIFICATIONS ===' AS section,
  id,
  type,
  title,
  message,
  user_id,
  company_id,
  read,
  created_at,
  CASE 
    WHEN read = false THEN '🔔 Unread'
    ELSE '✅ Read'
  END AS status
FROM notifications
WHERE created_at::date = CURRENT_DATE
ORDER BY created_at DESC
LIMIT 20;

-- Check if site_id column exists (separate query)
SELECT 
  '=== NOTIFICATIONS TABLE COLUMNS ===' AS section,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'notifications' 
      AND column_name = 'site_id'
    ) THEN '✅ site_id column exists'
    ELSE '⚠️ site_id column MISSING - may need to add it'
  END AS site_id_status;

-- 8. CHECK NOTIFICATION TYPES ALLOWED
-- ============================================================================
SELECT '=== NOTIFICATION TYPE CONSTRAINTS ===' AS section;

-- Check what types are allowed in the notifications table
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.notifications'::regclass
  AND contype = 'c'
  AND conname LIKE '%type%';

-- 9. CHECK MESSAGES WITH MENTIONS
-- ============================================================================
SELECT '=== MESSAGES WITH MENTIONS ===' AS section;

-- Check if there are messages with @mentions that should create notifications
SELECT 
  COUNT(*) AS messages_with_mentions_today
FROM messages m
WHERE m.created_at::date = CURRENT_DATE
  AND m.content LIKE '%@%';

-- 10. CHECK CALENDAR REMINDERS
-- ============================================================================
SELECT '=== CALENDAR REMINDERS ===' AS section;

-- Check if there are calendar reminders that should create notifications
-- Note: This depends on how reminders are stored in your system
SELECT 
  'Check your calendar/reminder system for reminders due today' AS note;

-- 11. SUMMARY AND RECOMMENDATIONS
-- ============================================================================
SELECT '=== SUMMARY AND RECOMMENDATIONS ===' AS section;

SELECT 
  CASE 
    WHEN NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
    THEN '❌ CRITICAL: Enable pg_cron extension'
    WHEN NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'check-task-notifications-cron')
    THEN '❌ CRITICAL: Cron job does not exist - needs to be created'
    WHEN NOT EXISTS (
      SELECT 1 FROM cron.job_run_details 
      WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'check-task-notifications-cron')
      AND status = 'succeeded'
      AND start_time > NOW() - INTERVAL '1 hour'
    )
    THEN '⚠️ WARNING: Cron job exists but has not run successfully in the last hour'
    ELSE '✅ Cron job appears to be set up correctly'
  END AS cron_status,
  
  CASE 
    WHEN NOT EXISTS (
      SELECT 1 FROM information_schema.routines 
      WHERE routine_name = 'create_task_ready_notification'
    )
    THEN '❌ CRITICAL: create_task_ready_notification function missing'
    WHEN NOT EXISTS (
      SELECT 1 FROM information_schema.routines 
      WHERE routine_name = 'create_late_task_notification'
    )
    THEN '❌ CRITICAL: create_late_task_notification function missing'
    ELSE '✅ Notification functions exist'
  END AS functions_status,
  
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM checklist_tasks 
      WHERE due_date = CURRENT_DATE 
      AND status IN ('pending', 'in_progress')
      AND (due_time IS NULL OR due_time = '')
      AND (task_data->>'due_time' IS NULL OR task_data->>'due_time' = '')
      AND (task_data->'daypart_times' IS NULL)
    )
    THEN '⚠️ WARNING: Some tasks due today are missing due_time (check column and task_data)'
    ELSE '✅ All tasks due today have due_time (in column or task_data)'
  END AS tasks_status;

