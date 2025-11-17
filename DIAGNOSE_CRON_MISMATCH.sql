-- Diagnostic Query: Check what tasks exist vs what cron is looking for
-- Run this in Supabase SQL Editor to see the mismatch

-- 1. Check tasks due today
SELECT 
  COUNT(*) as total_tasks_today,
  COUNT(CASE WHEN due_time IS NOT NULL THEN 1 END) as tasks_with_due_time,
  COUNT(CASE WHEN due_time IS NULL THEN 1 END) as tasks_without_due_time,
  COUNT(CASE WHEN status IN ('pending', 'in_progress') THEN 1 END) as tasks_pending_or_in_progress,
  COUNT(CASE WHEN status NOT IN ('pending', 'in_progress') THEN 1 END) as tasks_other_status
FROM checklist_tasks
WHERE due_date = CURRENT_DATE;

-- 2. Show sample tasks due today
SELECT 
  id,
  template_id,
  site_id,
  due_date,
  due_time,
  status,
  assigned_to_user_id,
  daypart,
  created_at
FROM checklist_tasks
WHERE due_date = CURRENT_DATE
ORDER BY created_at DESC
LIMIT 20;

-- 3. Check status distribution for today's tasks
SELECT 
  status,
  COUNT(*) as count,
  COUNT(CASE WHEN due_time IS NOT NULL THEN 1 END) as with_due_time,
  COUNT(CASE WHEN due_time IS NULL THEN 1 END) as without_due_time
FROM checklist_tasks
WHERE due_date = CURRENT_DATE
GROUP BY status
ORDER BY count DESC;

-- 4. Check if tasks have due_time but cron still can't find them
SELECT 
  id,
  due_date,
  due_time,
  status,
  CASE 
    WHEN due_time IS NULL THEN 'MISSING due_time'
    WHEN status NOT IN ('pending', 'in_progress') THEN 'WRONG STATUS: ' || status
    ELSE 'SHOULD MATCH'
  END as issue
FROM checklist_tasks
WHERE due_date = CURRENT_DATE
  AND (
    due_time IS NULL 
    OR status NOT IN ('pending', 'in_progress')
  )
ORDER BY created_at DESC
LIMIT 50;

