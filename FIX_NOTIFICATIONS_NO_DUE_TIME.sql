-- ============================================================================
-- Fix: Handle Tasks Without Specific Due Time
-- ============================================================================
-- Some tasks are set for a date or time period (like a week before due date)
-- and don't have a specific due_time. This script updates the notification
-- functions to handle these cases.
-- ============================================================================

BEGIN;

-- ============================================================================
-- Step 0: Ensure task_id column exists in notifications table
-- ============================================================================

-- Add task_id column if it doesn't exist
ALTER TABLE public.notifications 
  ADD COLUMN IF NOT EXISTS task_id UUID REFERENCES public.checklist_tasks(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_notifications_task_id ON public.notifications(task_id) WHERE task_id IS NOT NULL;

-- ============================================================================
-- Step 1: Update create_task_ready_notification to handle missing due_time
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_task_ready_notification(
  p_task_id UUID,
  p_company_id UUID,
  p_site_id UUID,
  p_user_id UUID,
  p_task_name TEXT,
  p_due_time TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification_id UUID;
  v_clocked_in BOOLEAN;
  v_effective_due_time TEXT;
BEGIN
  -- Only notify if user is clocked in
  SELECT public.is_user_clocked_in(p_user_id, p_site_id) INTO v_clocked_in;
  
  IF NOT v_clocked_in THEN
    RETURN NULL; -- User not clocked in, skip notification
  END IF;
  
  -- If no due_time provided, try to get it from task_data
  IF p_due_time IS NULL OR p_due_time = '' THEN
    SELECT COALESCE(
      NULLIF(ct.due_time, ''),
      ct.task_data->>'due_time',
      (SELECT value->>'due_time' 
       FROM jsonb_array_elements(ct.task_data->'daypart_times') 
       WHERE value->>'due_time' IS NOT NULL 
       LIMIT 1),
      '09:00' -- Default fallback
    ) INTO v_effective_due_time
    FROM checklist_tasks ct
    WHERE ct.id = p_task_id;
  ELSE
    v_effective_due_time := p_due_time;
  END IF;
  
  -- Check if notification already exists for this task today
  SELECT id INTO v_notification_id
  FROM public.notifications
  WHERE task_id = p_task_id
    AND type = 'task_ready'
    AND created_at::date = CURRENT_DATE
    AND user_id = p_user_id;
  
  IF v_notification_id IS NULL THEN
    INSERT INTO public.notifications (
      company_id,
      site_id,
      user_id,
      task_id,
      type,
      title,
      message,
      severity,
      priority,
      recipient_role
    ) VALUES (
      p_company_id,
      p_site_id,
      p_user_id,
      p_task_id,
      'task_ready',
      'Task Ready: ' || COALESCE(p_task_name, 'Untitled Task'),
      'Task "' || COALESCE(p_task_name, 'Untitled Task') || '" is ready to complete.' ||
      CASE 
        WHEN v_effective_due_time IS NOT NULL AND v_effective_due_time != '' 
        THEN ' Due at ' || v_effective_due_time || '.'
        ELSE ' Due today.'
      END,
      'info',
      'medium',
      'staff'
    ) RETURNING id INTO v_notification_id;
  END IF;
  
  RETURN v_notification_id;
END;
$$;

-- ============================================================================
-- Step 2: Update create_late_task_notification to handle missing due_time
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_late_task_notification(
  p_task_id UUID,
  p_company_id UUID,
  p_site_id UUID,
  p_task_name TEXT,
  p_assigned_user_id UUID,
  p_due_time TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_manager RECORD;
  v_notification_count INTEGER := 0;
  v_assigned_user_name TEXT;
  v_effective_due_time TEXT;
BEGIN
  -- Get assigned user's name
  SELECT full_name INTO v_assigned_user_name
  FROM public.profiles
  WHERE id = p_assigned_user_id;
  
  v_assigned_user_name := COALESCE(v_assigned_user_name, 'Staff member');
  
  -- If no due_time provided, try to get it from task_data
  IF p_due_time IS NULL OR p_due_time = '' THEN
    SELECT COALESCE(
      NULLIF(ct.due_time, ''),
      ct.task_data->>'due_time',
      (SELECT value->>'due_time' 
       FROM jsonb_array_elements(ct.task_data->'daypart_times') 
       WHERE value->>'due_time' IS NOT NULL 
       LIMIT 1),
      '09:00' -- Default fallback
    ) INTO v_effective_due_time
    FROM checklist_tasks ct
    WHERE ct.id = p_task_id;
  ELSE
    v_effective_due_time := p_due_time;
  END IF;
  
  -- Get all managers on shift for this site
  FOR v_manager IN 
    SELECT * FROM public.get_managers_on_shift(p_site_id, p_company_id)
  LOOP
    -- Check if notification already exists for this task/manager today
    IF NOT EXISTS (
      SELECT 1 FROM public.notifications
      WHERE task_id = p_task_id
        AND type = 'task_late'
        AND user_id = v_manager.user_id
        AND created_at::date = CURRENT_DATE
    ) THEN
      INSERT INTO public.notifications (
        company_id,
        site_id,
        user_id,
        task_id,
        type,
        title,
        message,
        severity,
        priority,
        recipient_role
      ) VALUES (
        p_company_id,
        p_site_id,
        v_manager.user_id,
        p_task_id,
        'task_late',
        'Late Task: ' || COALESCE(p_task_name, 'Untitled Task'),
        'Task "' || COALESCE(p_task_name, 'Untitled Task') || '" assigned to ' || v_assigned_user_name || ' is now late.' ||
        CASE 
          WHEN v_effective_due_time IS NOT NULL AND v_effective_due_time != '' 
          THEN ' Was due at ' || v_effective_due_time || '.'
          ELSE ' Was due today.'
        END,
        'warning',
        'high',
        'manager'
      );
      
      v_notification_count := v_notification_count + 1;
    END IF;
  END LOOP;
  
  RETURN v_notification_count;
END;
$$;

-- ============================================================================
-- Step 3: Create a function to create notifications for tasks without due_time
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_task_notification_for_date_range(
  p_task_id UUID,
  p_company_id UUID,
  p_site_id UUID,
  p_user_id UUID,
  p_task_name TEXT,
  p_due_date DATE,
  p_notification_type TEXT DEFAULT 'task' -- 'task', 'task_ready', 'task_late'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification_id UUID;
  v_clocked_in BOOLEAN;
  v_days_until_due INTEGER;
  v_message TEXT;
BEGIN
  -- Calculate days until due
  v_days_until_due := p_due_date - CURRENT_DATE;
  
  -- Only notify if user is clocked in (for ready notifications)
  IF p_notification_type = 'task_ready' THEN
    SELECT public.is_user_clocked_in(p_user_id, p_site_id) INTO v_clocked_in;
    IF NOT v_clocked_in THEN
      RETURN NULL;
    END IF;
  END IF;
  
  -- Build message based on days until due
  IF v_days_until_due < 0 THEN
    v_message := 'Task "' || COALESCE(p_task_name, 'Untitled Task') || '" is overdue by ' || ABS(v_days_until_due) || ' day(s).';
  ELSIF v_days_until_due = 0 THEN
    v_message := 'Task "' || COALESCE(p_task_name, 'Untitled Task') || '" is due today.';
  ELSIF v_days_until_due <= 7 THEN
    v_message := 'Task "' || COALESCE(p_task_name, 'Untitled Task') || '" is due in ' || v_days_until_due || ' day(s).';
  ELSE
    v_message := 'Task "' || COALESCE(p_task_name, 'Untitled Task') || '" is due on ' || TO_CHAR(p_due_date, 'YYYY-MM-DD') || '.';
  END IF;
  
  -- Check if notification already exists
  SELECT id INTO v_notification_id
  FROM public.notifications
  WHERE task_id = p_task_id
    AND type = p_notification_type
    AND created_at::date = CURRENT_DATE
    AND user_id = p_user_id;
  
  IF v_notification_id IS NULL THEN
    INSERT INTO public.notifications (
      company_id,
      site_id,
      user_id,
      task_id,
      type,
      title,
      message,
      severity,
      priority,
      recipient_role,
      due_date
    ) VALUES (
      p_company_id,
      p_site_id,
      p_user_id,
      p_task_id,
      p_notification_type,
      'Task: ' || COALESCE(p_task_name, 'Untitled Task'),
      v_message,
      CASE 
        WHEN v_days_until_due < 0 THEN 'critical'
        WHEN v_days_until_due <= 3 THEN 'warning'
        ELSE 'info'
      END,
      CASE 
        WHEN v_days_until_due < 0 THEN 'urgent'
        WHEN v_days_until_due <= 3 THEN 'high'
        ELSE 'medium'
      END,
      'staff',
      p_due_date
    ) RETURNING id INTO v_notification_id;
  END IF;
  
  RETURN v_notification_id;
END;
$$;

COMMIT;

-- ============================================================================
-- USAGE
-- ============================================================================
-- For tasks with due_time:
--   SELECT create_task_ready_notification(task_id, company_id, site_id, user_id, 'Task Name', '14:00');
--
-- For tasks without due_time (date range):
--   SELECT create_task_notification_for_date_range(task_id, company_id, site_id, user_id, 'Task Name', '2025-01-15', 'task');
-- ============================================================================

