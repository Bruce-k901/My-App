-- Check what tasks exist for today
-- This will help diagnose why tasks are still showing

-- 1. Count tasks by status for today
SELECT 
  status,
  COUNT(*) as count
FROM checklist_tasks
WHERE due_date = CURRENT_DATE
GROUP BY status
ORDER BY status;

-- 2. Show all tasks due today with their status
SELECT 
  id,
  custom_name,
  status,
  due_date,
  due_time,
  site_id,
  template_id,
  completed_at,
  updated_at
FROM checklist_tasks
WHERE due_date = CURRENT_DATE
ORDER BY status, due_time;

-- 3. Check for tasks that should be marked as missed
SELECT 
  id,
  custom_name,
  status,
  due_date,
  due_time,
  CASE 
    WHEN status = 'pending' AND due_date < CURRENT_DATE THEN 'SHOULD BE MISSED'
    WHEN status = 'pending' AND due_date = CURRENT_DATE AND due_time IS NOT NULL 
      AND (CURRENT_TIME - due_time) > INTERVAL '1 hour' THEN 'SHOULD BE MISSED (daily task)'
    ELSE 'OK'
  END as status_check
FROM checklist_tasks
WHERE due_date <= CURRENT_DATE
  AND status = 'pending'
ORDER BY due_date DESC, due_time;

