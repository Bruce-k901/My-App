-- ============================================================================
-- Fix Notifications to Send to ALL Clocked-In Users at Site
-- ============================================================================
-- Problem: Notifications currently only sent to assigned user
-- Solution: Send notifications to ALL users clocked in at the site
-- ============================================================================

BEGIN;

-- ============================================================================
-- Step 1: Update get_active_staff_on_site to use staff_attendance
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_active_staff_on_site(p_site_id UUID)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  email TEXT,
  clock_in_at TIMESTAMPTZ
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
    sa.clock_in_at
  FROM public.staff_attendance sa
  JOIN public.profiles p ON p.id = sa.user_id
  WHERE sa.site_id = p_site_id
    AND sa.clock_out_at IS NULL
    AND sa.clock_in_date = CURRENT_DATE
    AND p.app_role IN ('Staff', 'Manager', 'General Manager', 'Admin', 'Owner')
  ORDER BY sa.clock_in_at DESC;
END;
$$;

COMMENT ON FUNCTION public.get_active_staff_on_site(UUID) IS 
'Get all users currently clocked in at a site. Used for site-wide notifications.';

-- ============================================================================
-- Step 2: Create function to send notifications to all clocked-in users at site
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_task_notification_for_site(
  p_task_id UUID,
  p_company_id UUID,
  p_site_id UUID,
  p_task_name TEXT,
  p_due_time TEXT DEFAULT NULL,
  p_due_date DATE DEFAULT NULL,
  p_notification_type TEXT DEFAULT 'task_ready' -- 'task_ready' or 'task_late'
)
RETURNS TABLE (
  notification_id UUID,
  user_id UUID,
  user_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user RECORD;
  v_notification_id UUID;
  v_notifications_created INTEGER := 0;
BEGIN
  -- Get all clocked-in users at the site
  FOR v_user IN 
    SELECT * FROM public.get_active_staff_on_site(p_site_id)
  LOOP
    -- Check if notification already exists for this user and task
    SELECT id INTO v_notification_id
    FROM public.notifications
    WHERE user_id = v_user.user_id
      AND task_id = p_task_id
      AND type = p_notification_type
      AND created_at::date = CURRENT_DATE;
    
    -- Only create if notification doesn't exist
    IF v_notification_id IS NULL THEN
      INSERT INTO public.notifications (
        user_id,
        company_id,
        site_id,
        task_id,
        type,
        title,
        message,
        metadata,
        created_at
      ) VALUES (
        v_user.user_id,
        p_company_id,
        p_site_id,
        p_task_id,
        p_notification_type,
        CASE 
          WHEN p_notification_type = 'task_ready' THEN 'Task Ready: ' || p_task_name
          WHEN p_notification_type = 'task_late' THEN 'Task Late: ' || p_task_name
          ELSE 'Task: ' || p_task_name
        END,
        CASE 
          WHEN p_due_time IS NOT NULL THEN 
            'Task "' || p_task_name || '" is ' || 
            CASE WHEN p_notification_type = 'task_ready' THEN 'ready to complete' ELSE 'overdue' END ||
            '. Due at ' || p_due_time || '.'
          WHEN p_due_date IS NOT NULL THEN 
            'Task "' || p_task_name || '" is ' || 
            CASE WHEN p_notification_type = 'task_ready' THEN 'ready to complete' ELSE 'overdue' END ||
            '. Due on ' || p_due_date::text || '.'
          ELSE 
            'Task "' || p_task_name || '" is ' || 
            CASE WHEN p_notification_type = 'task_ready' THEN 'ready to complete' ELSE 'overdue' END || '.'
        END,
        jsonb_build_object(
          'task_id', p_task_id,
          'task_name', p_task_name,
          'due_time', p_due_time,
          'due_date', p_due_date,
          'notification_type', p_notification_type
        ),
        NOW()
      )
      RETURNING id INTO v_notification_id;
      
      v_notifications_created := v_notifications_created + 1;
      
      -- Return notification details
      RETURN QUERY SELECT v_notification_id, v_user.user_id, v_user.full_name;
    END IF;
  END LOOP;
  
  -- If no users were clocked in, log a warning
  IF v_notifications_created = 0 THEN
    RAISE NOTICE 'No clocked-in users at site % for task %', p_site_id, p_task_id;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.create_task_notification_for_site IS 
'Creates notifications for ALL clocked-in users at a site for a given task.
Only creates one notification per user per task per day.
Returns list of notification IDs and user IDs that received notifications.';

-- ============================================================================
-- Step 3: Drop old function and create new function for date-based notifications
-- ============================================================================

-- Drop the old function that takes p_user_id (if it exists)
DROP FUNCTION IF EXISTS public.create_task_notification_for_date_range(
  UUID, UUID, UUID, UUID, TEXT, DATE, TEXT
);

-- Create new function for date-based notifications (tasks without specific time)
CREATE OR REPLACE FUNCTION public.create_task_notification_for_date_range(
  p_task_id UUID,
  p_company_id UUID,
  p_site_id UUID,
  p_task_name TEXT,
  p_due_date DATE,
  p_notification_type TEXT DEFAULT 'task'
)
RETURNS TABLE (
  notification_id UUID,
  user_id UUID,
  user_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Use the site-wide notification function
  RETURN QUERY
  SELECT * FROM public.create_task_notification_for_site(
    p_task_id,
    p_company_id,
    p_site_id,
    p_task_name,
    NULL::TEXT, -- no due_time
    p_due_date,
    p_notification_type
  );
END;
$$;

COMMENT ON FUNCTION public.create_task_notification_for_date_range IS 
'Creates notifications for tasks without a specific due_time.
Sends to all clocked-in users at the site.';

-- ============================================================================
-- Step 4: Update existing notification functions to use site-wide approach
-- ============================================================================

-- Keep old functions for backward compatibility but mark as deprecated
-- The edge function will use the new site-wide functions

COMMIT;

-- ============================================================================
-- Verification
-- ============================================================================

-- Test query to see clocked-in users at a site
-- SELECT * FROM get_active_staff_on_site('YOUR_SITE_ID');

-- Test query to create a notification for all clocked-in users
-- SELECT * FROM create_task_notification_for_site(
--   'TASK_ID',
--   'COMPANY_ID',
--   'SITE_ID',
--   'Test Task',
--   '15:00',
--   NULL,
--   'task_ready'
-- );

