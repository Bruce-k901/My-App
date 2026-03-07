-- ============================================================================
-- Comprehensive Notification System Fix
-- ============================================================================
-- This script fixes all issues preventing notifications from working:
-- 1. Updates notification functions to use staff_attendance instead of attendance_logs
-- 2. Ensures cron job is properly configured
-- 3. Adds missing notification types
-- 4. Creates helper functions for better notification generation
-- ============================================================================

BEGIN;

-- ============================================================================
-- Step 1: Update notification functions to use staff_attendance table
-- ============================================================================

-- Update is_user_clocked_in to use staff_attendance
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
  -- Check staff_attendance table first (primary)
  SELECT EXISTS (
    SELECT 1 FROM public.staff_attendance
    WHERE user_id = p_user_id
      AND clock_out_time IS NULL
      AND shift_status = 'on_shift'
      AND (p_site_id IS NULL OR site_id = p_site_id)
      AND clock_in_time::date = CURRENT_DATE
  ) INTO v_clocked_in;
  
  -- Fallback to attendance_logs if staff_attendance doesn't have record
  IF NOT v_clocked_in THEN
    SELECT EXISTS (
      SELECT 1 FROM public.attendance_logs
      WHERE user_id = p_user_id
        AND clock_out_at IS NULL
        AND (p_site_id IS NULL OR site_id = p_site_id)
        AND clock_in_at::date = CURRENT_DATE
    ) INTO v_clocked_in;
  END IF;
  
  RETURN v_clocked_in;
END;
$$;

-- Update get_managers_on_shift to use staff_attendance
CREATE OR REPLACE FUNCTION public.get_managers_on_shift(p_site_id UUID DEFAULT NULL, p_company_id UUID DEFAULT NULL)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  email TEXT,
  site_id UUID,
  clock_in_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  -- Query staff_attendance (primary)
  SELECT 
    p.id,
    p.full_name,
    p.email,
    sa.site_id,
    sa.clock_in_time AS clock_in_at
  FROM public.staff_attendance sa
  JOIN public.profiles p ON p.id = sa.user_id
  WHERE sa.clock_out_time IS NULL
    AND sa.shift_status = 'on_shift'
    AND sa.clock_in_time::date = CURRENT_DATE
    AND p.app_role IN ('Manager', 'General Manager', 'Admin', 'Owner')
    AND (p_site_id IS NULL OR sa.site_id = p_site_id)
    AND (p_company_id IS NULL OR p.company_id = p_company_id)
  
  UNION
  
  -- Fallback to attendance_logs
  SELECT 
    p.id,
    p.full_name,
    p.email,
    al.site_id,
    al.clock_in_at
  FROM public.attendance_logs al
  JOIN public.profiles p ON p.id = al.user_id
  WHERE al.clock_out_at IS NULL
    AND al.clock_in_at::date = CURRENT_DATE
    AND p.app_role IN ('Manager', 'General Manager', 'Admin', 'Owner')
    AND (p_site_id IS NULL OR al.site_id = p_site_id)
    AND (p_company_id IS NULL OR p.company_id = p_company_id)
    -- Exclude duplicates already found in staff_attendance
    AND NOT EXISTS (
      SELECT 1 FROM public.staff_attendance sa2
      WHERE sa2.user_id = al.user_id
        AND sa2.clock_out_time IS NULL
        AND sa2.shift_status = 'on_shift'
        AND sa2.clock_in_time::date = CURRENT_DATE
    )
  ORDER BY clock_in_at DESC;
END;
$$;

-- ============================================================================
-- Step 2: Ensure notification functions exist and are correct
-- ============================================================================

-- Function to create task ready notification (1 hour before due time)
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
BEGIN
  -- Only notify if user is clocked in
  SELECT public.is_user_clocked_in(p_user_id, p_site_id) INTO v_clocked_in;
  
  IF NOT v_clocked_in THEN
    RETURN NULL; -- User not clocked in, skip notification
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
      'Task "' || COALESCE(p_task_name, 'Untitled Task') || '" is ready to complete. Due at ' || COALESCE(p_due_time, 'unknown time') || '.',
      'info',
      'medium',
      'staff'
    ) RETURNING id INTO v_notification_id;
  END IF;
  
  RETURN v_notification_id;
END;
$$;

-- Function to create late task notification for managers
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
  v_assigned_user_name TEXT;
BEGIN
  -- Get assigned user's name
  SELECT full_name INTO v_assigned_user_name
  FROM public.profiles
  WHERE id = p_assigned_user_id;
  
  v_assigned_user_name := COALESCE(v_assigned_user_name, 'Staff member');
  
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
        'Task "' || COALESCE(p_task_name, 'Untitled Task') || '" assigned to ' || v_assigned_user_name || ' is now late. Was due at ' || COALESCE(p_due_time, 'unknown time') || '.',
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
-- Step 3: Ensure notification types include all needed types
-- ============================================================================

-- Update notification type constraint to include all types
DO $$
BEGIN
  -- Drop existing constraint if it exists
  ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
  
  -- Add new constraint with all notification types
  ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
    CHECK (type IN (
      'incident',
      'temperature',
      'task',
      'task_ready',      -- Task ready to complete (1hr before)
      'task_late',      -- Task is late (1hr after)
      'maintenance',
      'digest',
      'ppm_due_soon',
      'ppm_overdue',
      'ppm_completed',
      'message',        -- New message received
      'message_mention' -- Mentioned in message
    ));
EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE 'Constraint already exists, skipping';
END $$;

-- ============================================================================
-- Step 4: Ensure required columns exist
-- ============================================================================

-- Add task_id if missing
ALTER TABLE public.notifications 
  ADD COLUMN IF NOT EXISTS task_id UUID REFERENCES public.checklist_tasks(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_notifications_task_id ON public.notifications(task_id) WHERE task_id IS NOT NULL;

-- Add conversation_id if missing
ALTER TABLE public.notifications 
  ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_notifications_conversation_id ON public.notifications(conversation_id) WHERE conversation_id IS NOT NULL;

-- Add push_sent if missing
ALTER TABLE public.notifications 
  ADD COLUMN IF NOT EXISTS push_sent BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_notifications_push_pending ON public.notifications(push_sent, created_at) WHERE push_sent = false;

-- ============================================================================
-- Step 5: Ensure cron job is set up (requires manual service role key)
-- ============================================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS http;

-- Note: The cron job setup requires your actual service role key
-- You'll need to update the migration file with your key and run it separately
-- For now, we'll just verify the cron job exists

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'check-task-notifications-cron') THEN
    RAISE NOTICE '⚠️ Cron job does not exist. You need to:';
    RAISE NOTICE '   1. Get your service role key from Supabase Dashboard → Settings → API';
    RAISE NOTICE '   2. Update supabase/migrations/20250216000011_schedule_task_notification_cron.sql';
    RAISE NOTICE '   3. Replace YOUR_SERVICE_ROLE_KEY with your actual key';
    RAISE NOTICE '   4. Run that migration file';
  ELSE
    RAISE NOTICE '✅ Cron job exists';
  END IF;
END $$;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- After running this script, verify everything works:
--
-- 1. Check functions exist:
--    SELECT routine_name FROM information_schema.routines
--    WHERE routine_schema = 'public'
--      AND routine_name IN ('is_user_clocked_in', 'get_managers_on_shift', 
--                           'create_task_ready_notification', 'create_late_task_notification');
--
-- 2. Test is_user_clocked_in:
--    SELECT is_user_clocked_in('USER_ID_HERE', 'SITE_ID_HERE');
--
-- 3. Test get_managers_on_shift:
--    SELECT * FROM get_managers_on_shift('SITE_ID_HERE', 'COMPANY_ID_HERE');
--
-- 4. Check cron job:
--    SELECT * FROM cron.job WHERE jobname = 'check-task-notifications-cron';
--
-- 5. Manually trigger notification creation (for testing):
--    SELECT create_task_ready_notification(
--      'TASK_ID',
--      'COMPANY_ID',
--      'SITE_ID',
--      'USER_ID',
--      'Test Task',
--      '14:00'
--    );
-- ============================================================================

