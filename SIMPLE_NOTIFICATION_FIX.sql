-- Run this ONE script to fix notifications
-- It will show you exactly what's wrong and fix it

-- Step 1: Add missing columns
ALTER TABLE public.notifications 
  ADD COLUMN IF NOT EXISTS task_id UUID REFERENCES public.checklist_tasks(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_notifications_task_id ON public.notifications(task_id) WHERE task_id IS NOT NULL;

-- Step 2: Check if you have tasks due today
SELECT 'TASKS DUE TODAY:' AS info, COUNT(*) AS count
FROM checklist_tasks 
WHERE due_date = CURRENT_DATE AND status IN ('pending', 'in_progress');

-- Step 3: Check if users are clocked in
SELECT 'CLOCKED IN USERS:' AS info, COUNT(*) AS count
FROM staff_attendance 
WHERE clock_out_time IS NULL AND shift_status = 'on_shift' AND clock_in_time::date = CURRENT_DATE;

-- Step 4: Try to create ONE notification manually
DO $$
DECLARE
  v_task_id UUID;
  v_user_id UUID;
  v_company_id UUID;
  v_site_id UUID;
  v_result UUID;
BEGIN
  -- Get first task
  SELECT id, assigned_to_user_id, company_id, site_id
  INTO v_task_id, v_user_id, v_company_id, v_site_id
  FROM checklist_tasks
  WHERE due_date = CURRENT_DATE 
    AND status IN ('pending', 'in_progress')
    AND assigned_to_user_id IS NOT NULL
  LIMIT 1;
  
  IF v_task_id IS NULL THEN
    RAISE NOTICE 'NO TASKS FOUND';
    RETURN;
  END IF;
  
  -- Try to create notification
  SELECT create_task_ready_notification(
    v_task_id, v_company_id, v_site_id, v_user_id, 'Test Task', '09:00'
  ) INTO v_result;
  
  IF v_result IS NULL THEN
    RAISE NOTICE 'FAILED - User not clocked in OR notification already exists';
  ELSE
    RAISE NOTICE 'SUCCESS! Notification ID: %', v_result;
  END IF;
END $$;

-- Step 5: Show notifications
SELECT 'NOTIFICATIONS TODAY:' AS info, COUNT(*) AS count
FROM notifications 
WHERE created_at::date = CURRENT_DATE;

SELECT id, type, title, user_id, created_at
FROM notifications 
WHERE created_at::date = CURRENT_DATE
ORDER BY created_at DESC
LIMIT 5;

