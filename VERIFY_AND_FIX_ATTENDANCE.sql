-- ============================================================================
-- VERIFY AND FIX: Check for remaining triggers and remove them
-- Run this FIRST to see what triggers exist, then run FIX_ATTENDANCE_NOW_COMPLETE.sql
-- ============================================================================

-- Step 1: List ALL triggers on staff_attendance
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'staff_attendance'
  AND event_object_schema = 'public'
ORDER BY trigger_name;

-- Step 2: List ALL triggers on attendance_logs (if it's a table, not a view)
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'attendance_logs'
  AND event_object_schema = 'public'
ORDER BY trigger_name;

-- Step 3: List ALL functions that might sync attendance
SELECT 
  proname as function_name,
  pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname LIKE '%sync%attendance%'
   OR proname LIKE '%attendance%sync%'
   OR proname LIKE '%attendance%logs%'
ORDER BY proname;

-- Step 4: Check if attendance_logs is a view or table
SELECT 
  table_type,
  table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'attendance_logs';

-- Step 5: Check RLS policies on attendance_logs
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'attendance_logs';

