-- ============================================================================
-- Notification System Diagnostic & Fix Script
-- Run this in your Supabase SQL Editor to diagnose notification issues
-- ============================================================================

-- ============================================================================
-- PART 1: CHECK CRON JOB SETUP
-- ============================================================================

-- Check if pg_cron extension is enabled
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') 
    THEN '✅ pg_cron extension is enabled'
    ELSE '❌ pg_cron extension is NOT enabled - Run: CREATE EXTENSION pg_cron;'
  END as cron_status;

-- Check if cron job exists
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'check-task-notifications-cron')
    THEN '✅ Cron job exists'
    ELSE '❌ Cron job does NOT exist - Need to create it'
  END as cron_job_status;

-- Show cron job details if it exists
SELECT 
  jobid,
  jobname,
  schedule,
  command,
  active,
  nodename,
  nodeport
FROM cron.job 
WHERE jobname = 'check-task-notifications-cron';

-- Check recent cron job executions
SELECT 
  jobid,
  runid,
  job_pid,
  database,
  username,
  command,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'check-task-notifications-cron')
ORDER BY start_time DESC 
LIMIT 10;

-- ============================================================================
-- PART 2: CHECK DATABASE FUNCTIONS
-- ============================================================================

-- Check if notification functions exist
SELECT 
  routine_name,
  CASE 
    WHEN routine_name IS NOT NULL THEN '✅ Function exists'
    ELSE '❌ Function missing'
  END as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN (
    'create_task_ready_notification',
    'create_late_task_notification',
    'is_user_clocked_in',
    'get_managers_on_shift',
    'get_active_staff_on_site'
  )
ORDER BY routine_name;

-- ============================================================================
-- PART 3: CHECK NOTIFICATIONS TABLE SCHEMA
-- ============================================================================

-- Check if notifications table has required columns
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'notifications'
  AND column_name IN ('task_id', 'push_sent', 'type', 'user_id', 'company_id')
ORDER BY ordinal_position;

-- Check notification type constraint
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.notifications'::regclass
  AND conname LIKE '%type%';

-- ============================================================================
-- PART 4: CHECK TASKS DUE TODAY
-- ============================================================================

-- Find tasks due today that should trigger notifications
SELECT 
  ct.id,
  ct.custom_name as task_name,
  ct.due_date,
  ct.due_time,
  ct.assigned_to_user_id,
  ct.status,
  ct.company_id,
  ct.site_id,
  -- Check if user is clocked in
  EXISTS (
    SELECT 1 FROM attendance_logs a
    WHERE a.user_id = ct.assigned_to_user_id
      AND a.clock_out_at IS NULL
      AND a.clock_in_at::date = CURRENT_DATE
  ) as user_clocked_in,
  -- Check if managers are on shift
  (SELECT COUNT(*) FROM get_managers_on_shift(ct.site_id, ct.company_id)) as managers_on_shift,
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
        THEN 'READY_WINDOW'
        -- Late window: 1 hour after due time
        WHEN (EXTRACT(HOUR FROM NOW()) * 60 + EXTRACT(MINUTE FROM NOW())) > 
             (CAST(SPLIT_PART(ct.due_time, ':', 1) AS INTEGER) * 60 + 
              CAST(SPLIT_PART(ct.due_time, ':', 2) AS INTEGER) + 60)
        THEN 'LATE_WINDOW'
        ELSE 'OUTSIDE_WINDOW'
      END
    ELSE 'NO_DUE_TIME'
  END as notification_window
FROM checklist_tasks ct
WHERE ct.due_date = CURRENT_DATE
  AND ct.status IN ('pending', 'in_progress')
ORDER BY ct.due_time NULLS LAST;

-- Count tasks by notification readiness
SELECT 
  COUNT(*) FILTER (WHERE due_time IS NULL) as tasks_without_due_time,
  COUNT(*) FILTER (WHERE due_time IS NOT NULL AND assigned_to_user_id IS NULL) as tasks_without_assignment,
  COUNT(*) FILTER (WHERE due_time IS NOT NULL AND assigned_to_user_id IS NOT NULL) as tasks_ready_for_notifications,
  COUNT(*) as total_tasks_due_today
FROM checklist_tasks
WHERE due_date = CURRENT_DATE
  AND status IN ('pending', 'in_progress');

-- ============================================================================
-- PART 5: CHECK CLOCK-IN STATUS
-- ============================================================================

-- Check users who are currently clocked in
SELECT 
  p.id as user_id,
  p.full_name,
  p.email,
  p.app_role,
  a.clock_in_at,
  a.site_id,
  s.name as site_name
FROM profiles p
LEFT JOIN attendance_logs a ON a.user_id = p.id 
  AND a.clock_out_at IS NULL 
  AND a.clock_in_at::date = CURRENT_DATE
LEFT JOIN sites s ON s.id = a.site_id
WHERE p.app_role IN ('Staff', 'Manager', 'General Manager', 'Admin', 'Owner')
ORDER BY a.clock_in_at DESC NULLS LAST;

-- Check managers on shift
SELECT * FROM get_managers_on_shift(NULL, NULL);

-- ============================================================================
-- PART 6: CHECK EXISTING NOTIFICATIONS
-- ============================================================================

-- Check if task_id column exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'notifications' 
      AND column_name = 'task_id'
    ) THEN '✅ task_id column exists'
    ELSE '❌ task_id column missing - Run Fix 4 to add it'
  END as task_id_status;

-- Check notifications created today (basic columns that should always exist)
SELECT 
  id,
  type,
  title,
  message,
  user_id,
  severity,
  read,
  created_at
FROM notifications
WHERE created_at::date = CURRENT_DATE
ORDER BY created_at DESC
LIMIT 20;

-- If task_id column exists, show notifications with task_id
-- (Uncomment and run this separately if task_id column exists)
/*
SELECT 
  id,
  type,
  title,
  message,
  user_id,
  task_id,
  severity,
  read,
  created_at
FROM notifications
WHERE created_at::date = CURRENT_DATE
ORDER BY created_at DESC
LIMIT 20;
*/

-- Count notifications by type today
SELECT 
  type,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE read = false) as unread_count
FROM notifications
WHERE created_at::date = CURRENT_DATE
GROUP BY type
ORDER BY count DESC;

-- ============================================================================
-- PART 7: TEST NOTIFICATION FUNCTIONS (Replace IDs with actual values)
-- ============================================================================

-- Test if a user is clocked in (replace USER_ID and SITE_ID)
-- SELECT is_user_clocked_in('USER_ID_HERE', 'SITE_ID_HERE');

-- Test getting managers on shift (replace SITE_ID and COMPANY_ID)
-- SELECT * FROM get_managers_on_shift('SITE_ID_HERE', 'COMPANY_ID_HERE');

-- Test creating a ready notification (replace all values)
-- SELECT create_task_ready_notification(
--   'TASK_ID_HERE',
--   'COMPANY_ID_HERE',
--   'SITE_ID_HERE',
--   'USER_ID_HERE',
--   'Test Task Name',
--   '09:00'
-- );

-- Test creating a late notification (replace all values)
-- SELECT create_late_task_notification(
--   'TASK_ID_HERE',
--   'COMPANY_ID_HERE',
--   'SITE_ID_HERE',
--   'Test Task Name',
--   '09:00',
--   'ASSIGNED_USER_ID_HERE'
-- );

-- ============================================================================
-- PART 8: FIXES (Uncomment and run as needed)
-- ============================================================================

-- Fix 1: Enable pg_cron extension (if not enabled)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Fix 2: Enable http extension (if not enabled)
-- CREATE EXTENSION IF NOT EXISTS http;

-- Fix 3: Create cron job (replace YOUR_SERVICE_ROLE_KEY with actual key)
-- First, get your service role key from: Supabase Dashboard → Settings → API → service_role key
-- Then update the URL and key below:
-- NOTE: Replace YOUR_PROJECT_ID and YOUR_SERVICE_ROLE_KEY with actual values
-- IMPORTANT: Uncomment the block below and replace placeholders before running
-- NOTE: The cron schedule '*/15 * * * *' means "every 15 minutes"
-- To avoid SQL comment issues, we use string concatenation
/*
DO $cron_setup$
DECLARE
  cron_schedule TEXT;
  function_url TEXT;
  service_key TEXT;
BEGIN
  -- Set these values (replace placeholders)
  cron_schedule := '*' || '/15 * * * *';  -- Every 15 minutes (concatenated to avoid comment issue)
  function_url := 'https://YOUR_PROJECT_ID.supabase.co/functions/v1/check-task-notifications';
  service_key := 'YOUR_SERVICE_ROLE_KEY';
  
  -- Drop existing cron job if it exists
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'check-task-notifications-cron') THEN
    PERFORM cron.unschedule('check-task-notifications-cron');
  END IF;
  
  -- Schedule the cron job
  PERFORM cron.schedule(
    'check-task-notifications-cron',
    cron_schedule,
    format($$SELECT net.http_post(
      url := %L,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer %s'
      )
    ) AS request_id;$$, function_url, service_key)
  );
  
  RAISE NOTICE 'Cron job scheduled successfully';
END $cron_setup$;
*/

-- Fix 4: Add missing columns to notifications table (if needed)
-- ALTER TABLE notifications ADD COLUMN IF NOT EXISTS task_id UUID REFERENCES checklist_tasks(id) ON DELETE CASCADE;
-- ALTER TABLE notifications ADD COLUMN IF NOT EXISTS push_sent BOOLEAN DEFAULT false;
-- CREATE INDEX IF NOT EXISTS idx_notifications_task_id ON notifications(task_id) WHERE task_id IS NOT NULL;
-- CREATE INDEX IF NOT EXISTS idx_notifications_push_pending ON notifications(push_sent, created_at) WHERE push_sent = false;

-- Fix 5: Update notification type constraint to include task_ready and task_late
/*
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
  CHECK (type IN (
    'incident',
    'temperature',
    'task',
    'task_ready',
    'task_late',
    'maintenance',
    'digest',
    'ppm_due_soon',
    'ppm_overdue',
    'ppm_completed',
    'message',
    'message_mention'
  ));
*/

-- ============================================================================
-- SUMMARY QUERIES
-- ============================================================================

-- Quick summary of notification system status
SELECT 
  'Cron Job' as component,
  CASE 
    WHEN EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'check-task-notifications-cron')
    THEN '✅ Configured'
    ELSE '❌ Missing'
  END as status
UNION ALL
SELECT 
  'Notification Functions',
  CASE 
    WHEN (SELECT COUNT(*) FROM information_schema.routines 
          WHERE routine_schema = 'public' 
          AND routine_name IN ('create_task_ready_notification', 'create_late_task_notification', 'is_user_clocked_in', 'get_managers_on_shift')) = 5
    THEN '✅ All Functions Exist'
    ELSE '❌ Some Functions Missing'
  END
UNION ALL
SELECT 
  'Tasks Due Today',
  CASE 
    WHEN (SELECT COUNT(*) FROM checklist_tasks 
          WHERE due_date = CURRENT_DATE 
          AND due_time IS NOT NULL 
          AND assigned_to_user_id IS NOT NULL
          AND status IN ('pending', 'in_progress')) > 0
    THEN '✅ ' || (SELECT COUNT(*)::text FROM checklist_tasks 
                   WHERE due_date = CURRENT_DATE 
                   AND due_time IS NOT NULL 
                   AND assigned_to_user_id IS NOT NULL
                   AND status IN ('pending', 'in_progress')) || ' tasks ready'
    ELSE '❌ No tasks ready for notifications'
  END
UNION ALL
SELECT 
  'Users Clocked In',
  CASE 
    WHEN (SELECT COUNT(*) FROM attendance_logs 
          WHERE clock_out_at IS NULL 
          AND clock_in_at::date = CURRENT_DATE) > 0
    THEN '✅ ' || (SELECT COUNT(*)::text FROM attendance_logs 
                   WHERE clock_out_at IS NULL 
                   AND clock_in_at::date = CURRENT_DATE) || ' users clocked in'
    ELSE '❌ No users clocked in'
  END
UNION ALL
SELECT 
  'Notifications Created Today',
  CASE 
    WHEN (SELECT COUNT(*) FROM notifications WHERE created_at::date = CURRENT_DATE) > 0
    THEN '✅ ' || (SELECT COUNT(*)::text FROM notifications WHERE created_at::date = CURRENT_DATE) || ' notifications'
    ELSE '❌ No notifications created today'
  END;

