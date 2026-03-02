-- Quick check: Why are 0 notifications being created?

-- 1. Show your tasks
SELECT 
  id,
  custom_name,
  due_date,
  due_time,
  assigned_to_user_id,
  status,
  -- Check if user is clocked in
  EXISTS (
    SELECT 1 FROM staff_attendance sa
    WHERE sa.user_id = checklist_tasks.assigned_to_user_id
    AND sa.clock_out_time IS NULL
    AND sa.shift_status = 'on_shift'
    AND sa.clock_in_time::date = CURRENT_DATE
  ) AS user_is_clocked_in
FROM checklist_tasks
WHERE due_date = CURRENT_DATE
AND status IN ('pending', 'in_progress')
LIMIT 10;

-- 2. Check if is_user_clocked_in function works
SELECT 
  p.id AS user_id,
  p.full_name,
  is_user_clocked_in(p.id, NULL) AS function_says_clocked_in,
  EXISTS (
    SELECT 1 FROM staff_attendance sa
    WHERE sa.user_id = p.id
    AND sa.clock_out_time IS NULL
    AND sa.shift_status = 'on_shift'
    AND sa.clock_in_time::date = CURRENT_DATE
  ) AS actually_clocked_in
FROM profiles p
WHERE p.id IN (
  SELECT DISTINCT assigned_to_user_id 
  FROM checklist_tasks 
  WHERE due_date = CURRENT_DATE
)
LIMIT 5;

-- 3. Try creating a notification manually - this will show the error
DO $$
DECLARE
  v_task RECORD;
  v_notification_id UUID;
BEGIN
  -- Get first task
  SELECT * INTO v_task
  FROM checklist_tasks
  WHERE due_date = CURRENT_DATE
  AND status IN ('pending', 'in_progress')
  AND assigned_to_user_id IS NOT NULL
  LIMIT 1;
  
  IF v_task.id IS NULL THEN
    RAISE NOTICE 'No tasks found';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Task: %', v_task.custom_name;
  RAISE NOTICE 'User ID: %', v_task.assigned_to_user_id;
  RAISE NOTICE 'Due time: %', COALESCE(v_task.due_time, 'NULL');
  
  -- Check clock-in
  IF is_user_clocked_in(v_task.assigned_to_user_id, v_task.site_id) THEN
    RAISE NOTICE 'User IS clocked in';
    
    -- Try to create notification
    BEGIN
      SELECT create_task_ready_notification(
        v_task.id,
        v_task.company_id,
        v_task.site_id,
        v_task.assigned_to_user_id,
        COALESCE(v_task.custom_name, 'Task'),
        COALESCE(NULLIF(v_task.due_time, ''), '09:00')
      ) INTO v_notification_id;
      
      IF v_notification_id IS NOT NULL THEN
        RAISE NOTICE 'SUCCESS! Notification created: %', v_notification_id;
      ELSE
        RAISE NOTICE 'FAILED: Function returned NULL';
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'ERROR: %', SQLERRM;
    END;
  ELSE
    RAISE NOTICE 'User is NOT clocked in - this is why no notifications!';
  END IF;
END $$;

