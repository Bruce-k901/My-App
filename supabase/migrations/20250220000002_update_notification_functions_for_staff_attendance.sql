-- ============================================================================
-- Migration: Update Notification Functions to Use staff_attendance Table
-- Description: Updates RPC functions to use new staff_attendance table instead of attendance_logs
-- ============================================================================

BEGIN;

-- Drop existing functions first to avoid return type conflicts
DROP FUNCTION IF EXISTS public.is_user_clocked_in(UUID, UUID);
DROP FUNCTION IF EXISTS public.get_managers_on_shift(UUID, UUID);
DROP FUNCTION IF EXISTS public.get_active_staff_on_site(UUID);
DROP FUNCTION IF EXISTS public.create_task_ready_notification(UUID, UUID, UUID, UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.create_late_task_notification(UUID, UUID, UUID, TEXT, TEXT, UUID);

-- Update function to check if user is clocked in (using new staff_attendance table)
CREATE OR REPLACE FUNCTION public.is_user_clocked_in(p_user_id UUID, p_site_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_clocked_in BOOLEAN;
BEGIN
  -- Check new staff_attendance table for active shift
  SELECT EXISTS (
    SELECT 1 FROM public.staff_attendance
    WHERE user_id = p_user_id
      AND shift_status = 'on_shift'
      AND clock_out_time IS NULL
      AND (p_site_id IS NULL OR site_id = p_site_id)
  ) INTO v_clocked_in;
  
  RETURN v_clocked_in;
END;
$$;

-- Update function to get managers on shift (using new staff_attendance table)
CREATE OR REPLACE FUNCTION public.get_managers_on_shift(p_site_id UUID DEFAULT NULL, p_company_id UUID DEFAULT NULL)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  email TEXT,
  site_id UUID,
  clock_in_time TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    p.email,
    sa.site_id,
    sa.clock_in_time
  FROM public.staff_attendance sa
  JOIN public.profiles p ON p.id = sa.user_id
  WHERE sa.shift_status = 'on_shift'
    AND sa.clock_out_time IS NULL
    AND p.app_role IN ('Manager', 'General Manager', 'Admin', 'Owner')
    AND (p_site_id IS NULL OR sa.site_id = p_site_id)
    AND (p_company_id IS NULL OR p.company_id = p_company_id)
  ORDER BY sa.clock_in_time DESC;
END;
$$;

-- Update function to get active staff on site (using new staff_attendance table)
CREATE OR REPLACE FUNCTION public.get_active_staff_on_site(p_site_id UUID)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  email TEXT,
  clock_in_time TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    p.email,
    sa.clock_in_time
  FROM public.staff_attendance sa
  JOIN public.profiles p ON p.id = sa.user_id
  WHERE sa.site_id = p_site_id
    AND sa.shift_status = 'on_shift'
    AND sa.clock_out_time IS NULL
    AND p.app_role IN ('Staff', 'Manager', 'General Manager')
  ORDER BY sa.clock_in_time DESC;
END;
$$;

-- Update create_task_ready_notification to also check manager roles
-- Managers/admins always receive notifications regardless of shift status
CREATE OR REPLACE FUNCTION public.create_task_ready_notification(
  p_task_id UUID,
  p_company_id UUID,
  p_site_id UUID,
  p_user_id UUID,
  p_task_name TEXT,
  p_due_time TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification_id UUID;
  v_clocked_in BOOLEAN;
  v_user_role TEXT;
BEGIN
  -- Get user's role
  SELECT app_role INTO v_user_role
  FROM public.profiles
  WHERE id = p_user_id;
  
  -- Managers and admins always receive notifications
  IF v_user_role IN ('Manager', 'General Manager', 'Admin', 'Owner') THEN
    v_clocked_in := TRUE;
  ELSE
    -- Staff only receive notifications when clocked in
    SELECT public.is_user_clocked_in(p_user_id, p_site_id) INTO v_clocked_in;
  END IF;
  
  IF NOT v_clocked_in THEN
    RETURN NULL; -- User not eligible for notification
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
      'Task Ready: ' || p_task_name,
      'Task "' || p_task_name || '" is ready to complete. Due at ' || p_due_time || '.',
      'info',
      'medium',
      CASE 
        WHEN v_user_role IN ('Manager', 'General Manager', 'Admin', 'Owner') THEN 'manager'
        ELSE 'staff'
      END
    ) RETURNING id INTO v_notification_id;
  END IF;
  
  RETURN v_notification_id;
END;
$$;

-- Update create_late_task_notification to also notify all managers/admins (not just those on shift)
-- This ensures managers always know about late tasks
CREATE OR REPLACE FUNCTION public.create_late_task_notification(
  p_task_id UUID,
  p_company_id UUID,
  p_site_id UUID,
  p_task_name TEXT,
  p_due_time TEXT,
  p_assigned_user_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_manager RECORD;
  v_notification_count INTEGER := 0;
BEGIN
  -- Get all managers/admins for the company (they always receive late notifications)
  -- Priority: managers on shift first, then all other managers/admins
  FOR v_manager IN 
    -- First: Managers currently on shift at this site
    SELECT 
      p.id as user_id,
      p.full_name,
      p.email,
      sa.site_id,
      sa.clock_in_time
    FROM public.staff_attendance sa
    JOIN public.profiles p ON p.id = sa.user_id
    WHERE sa.site_id = p_site_id
      AND sa.shift_status = 'on_shift'
      AND sa.clock_out_time IS NULL
      AND p.company_id = p_company_id
      AND p.app_role IN ('Manager', 'General Manager', 'Admin', 'Owner')
    
    UNION
    
    -- Also: All managers/admins for the company (even if not on shift)
    -- This ensures managers always know about late tasks
    SELECT 
      p.id as user_id,
      p.full_name,
      p.email,
      NULL::UUID as site_id,
      NULL::TIMESTAMPTZ as clock_in_time
    FROM public.profiles p
    WHERE p.company_id = p_company_id
      AND p.app_role IN ('Manager', 'General Manager', 'Admin', 'Owner')
      AND NOT EXISTS (
        -- Exclude those already included in the first query (on shift)
        SELECT 1 FROM public.staff_attendance sa2
        WHERE sa2.user_id = p.id
          AND sa2.site_id = p_site_id
          AND sa2.shift_status = 'on_shift'
          AND sa2.clock_out_time IS NULL
      )
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
        'Late Task: ' || p_task_name,
        'Task "' || p_task_name || '" assigned to staff is now late. Was due at ' || p_due_time || '.',
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

COMMIT;

