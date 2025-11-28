-- ============================================================================
-- Notification System Diagnostic Script (Schema-Aware)
-- This script first checks what columns actually exist, then runs queries
-- ============================================================================

-- ============================================================================
-- STEP 0: CHECK ACTUAL NOTIFICATIONS TABLE SCHEMA
-- ============================================================================

-- Show all columns that actually exist in the notifications table
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default,
  CASE 
    WHEN column_name IN ('task_id', 'push_sent', 'conversation_id') THEN '⚠️ Optional (for task notifications)'
    WHEN column_name = 'severity' THEN '⚠️ Should exist for notifications'
    ELSE '✅ Standard column'
  END as notes
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'notifications'
ORDER BY ordinal_position;

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

-- Check if notifications table has required columns for task notifications
SELECT 
  column_name,
  CASE 
    WHEN column_name IS NOT NULL THEN '✅ Column exists'
    ELSE '❌ Column missing'
  END as status
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'notifications'
  AND column_name IN ('task_id', 'push_sent', 'type', 'user_id', 'company_id', 'severity')
ORDER BY 
  CASE column_name
    WHEN 'task_id' THEN 1
    WHEN 'push_sent' THEN 2
    WHEN 'severity' THEN 3
    ELSE 4
  END;

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
  (SELECT COUNT(*) FROM get_managers_on_shift(ct.site_id, ct.company_id)) as managers_on_shift
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

-- Check managers on shift (only if function exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND routine_name = 'get_managers_on_shift'
  ) THEN
    RAISE NOTICE 'get_managers_on_shift function exists';
  ELSE
    RAISE NOTICE 'get_managers_on_shift function does NOT exist';
  END IF;
END $$;

-- ============================================================================
-- PART 6: CHECK EXISTING NOTIFICATIONS (Dynamic based on schema)
-- ============================================================================

-- Build query dynamically based on what columns exist
-- First, check what columns we have
DO $$
DECLARE
  has_severity BOOLEAN;
  has_task_id BOOLEAN;
  has_push_sent BOOLEAN;
  query_text TEXT;
BEGIN
  -- Check which columns exist
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'severity'
  ) INTO has_severity;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'task_id'
  ) INTO has_task_id;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'push_sent'
  ) INTO has_push_sent;
  
  -- Build and execute query based on what exists
  query_text := 'SELECT id, type, title, message, user_id, created_at';
  
  IF has_severity THEN
    query_text := query_text || ', severity';
  END IF;
  
  IF has_task_id THEN
    query_text := query_text || ', task_id';
  END IF;
  
  IF has_push_sent THEN
    query_text := query_text || ', push_sent';
  END IF;
  
  query_text := query_text || ', read FROM notifications WHERE created_at::date = CURRENT_DATE ORDER BY created_at DESC LIMIT 20';
  
  RAISE NOTICE 'Query: %', query_text;
END $$;

-- Simple query with only columns that should definitely exist
SELECT 
  id,
  type,
  title,
  message,
  user_id,
  created_at,
  read
FROM notifications
WHERE created_at::date = CURRENT_DATE
ORDER BY created_at DESC
LIMIT 20;

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
-- PART 7: SUMMARY OF ISSUES
-- ============================================================================

-- Summary of notification system status
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
          AND routine_name IN ('create_task_ready_notification', 'create_late_task_notification', 'is_user_clocked_in', 'get_managers_on_shift')) = 4
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
  END as status
UNION ALL
SELECT 
  'Users Clocked In',
  CASE 
    WHEN EXISTS (SELECT 1 FROM attendance_logs WHERE clock_out_at IS NULL AND clock_in_at::date = CURRENT_DATE)
    THEN '✅ Users clocked in'
    ELSE '❌ No users clocked in'
  END
UNION ALL
SELECT 
  'Notifications Created Today',
  CASE 
    WHEN (SELECT COUNT(*) FROM notifications WHERE created_at::date = CURRENT_DATE) > 0
    THEN '✅ ' || (SELECT COUNT(*)::text FROM notifications WHERE created_at::date = CURRENT_DATE) || ' notifications'
    ELSE '❌ No notifications created today'
  END
UNION ALL
SELECT 
  'severity Column',
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'severity')
    THEN '✅ Exists'
    ELSE '❌ Missing'
  END
UNION ALL
SELECT 
  'task_id Column',
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'task_id')
    THEN '✅ Exists'
    ELSE '❌ Missing (needed for task notifications)'
  END
UNION ALL
SELECT 
  'push_sent Column',
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'push_sent')
    THEN '✅ Exists'
    ELSE '❌ Missing (optional, for push notifications)'
  END;

