-- ============================================================================
-- Migration: Comprehensive Notification System
-- Description: Clock-in system, push notification subscriptions, and enhanced
--              notification types for tasks and messages
-- Note: This migration will be skipped if companies, profiles, or sites tables don't exist yet
-- ============================================================================

DO $$
BEGIN
  -- Only proceed if required tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'companies')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN

    -- ============================================================================
    -- 1. CLOCK-IN / ATTENDANCE SYSTEM
    -- ============================================================================

    CREATE TABLE IF NOT EXISTS public.attendance_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      company_id UUID NOT NULL,
      site_id UUID,
      clock_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      clock_out_at TIMESTAMPTZ,
      location JSONB, -- GPS coordinates: {lat, lng, accuracy}
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT attendance_clock_out_after_clock_in CHECK (
        clock_out_at IS NULL OR clock_out_at >= clock_in_at
      )
    );

    -- Add foreign keys conditionally
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'attendance_logs_user_id_fkey' 
      AND table_schema = 'public' 
      AND table_name = 'attendance_logs'
    ) THEN
      ALTER TABLE public.attendance_logs
      ADD CONSTRAINT attendance_logs_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'attendance_logs_company_id_fkey' 
      AND table_schema = 'public' 
      AND table_name = 'attendance_logs'
    ) THEN
      ALTER TABLE public.attendance_logs
      ADD CONSTRAINT attendance_logs_company_id_fkey
      FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sites') THEN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'attendance_logs_site_id_fkey' 
        AND table_schema = 'public' 
        AND table_name = 'attendance_logs'
      ) THEN
        ALTER TABLE public.attendance_logs
        ADD CONSTRAINT attendance_logs_site_id_fkey
        FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE SET NULL;
      END IF;
    END IF;

-- Indexes for attendance queries
CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON public.attendance_logs(user_id, clock_in_at DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_site_date ON public.attendance_logs(site_id, clock_in_at DESC) WHERE site_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_attendance_company_date ON public.attendance_logs(company_id, clock_in_at DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_active ON public.attendance_logs(user_id, clock_out_at) WHERE clock_out_at IS NULL;

    -- Function to check if user is currently clocked in
    CREATE OR REPLACE FUNCTION public.is_user_clocked_in(p_user_id UUID, p_site_id UUID DEFAULT NULL)
    RETURNS BOOLEAN
    LANGUAGE plpgsql
    SECURITY DEFINER
    STABLE
    SET search_path = public
    AS $function$
    DECLARE
      v_clocked_in BOOLEAN;
    BEGIN
      SELECT EXISTS (
        SELECT 1 FROM public.attendance_logs
        WHERE user_id = p_user_id
          AND clock_out_at IS NULL
          AND (p_site_id IS NULL OR site_id = p_site_id)
          AND clock_in_at::date = CURRENT_DATE
      ) INTO v_clocked_in;
      
      RETURN v_clocked_in;
    END;
    $function$;

    -- Function to get active staff on site
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
    AS $function$
    BEGIN
      RETURN QUERY
      SELECT 
        p.id,
        p.full_name,
        p.email,
        a.clock_in_at
      FROM public.attendance_logs a
      JOIN public.profiles p ON p.id = a.user_id
      WHERE a.site_id = p_site_id
        AND a.clock_out_at IS NULL
        AND a.clock_in_at::date = CURRENT_DATE
        AND p.app_role IN ('Staff', 'Manager', 'General Manager')
      ORDER BY a.clock_in_at DESC;
    END;
    $function$;

    -- Function to get managers on shift
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
    AS $function$
    BEGIN
      RETURN QUERY
      SELECT 
        p.id,
        p.full_name,
        p.email,
        a.site_id,
        a.clock_in_at
      FROM public.attendance_logs a
      JOIN public.profiles p ON p.id = a.user_id
      WHERE a.clock_out_at IS NULL
        AND a.clock_in_at::date = CURRENT_DATE
        AND p.app_role IN ('Manager', 'General Manager', 'Admin', 'Owner')
        AND (p_site_id IS NULL OR a.site_id = p_site_id)
        AND (p_company_id IS NULL OR p.company_id = p_company_id)
      ORDER BY a.clock_in_at DESC;
    END;
    $function$;

    -- RLS Policies for attendance_logs
    ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;

    CREATE POLICY attendance_select_own
      ON public.attendance_logs FOR SELECT
      USING (user_id = auth.uid());

    CREATE POLICY attendance_select_company
      ON public.attendance_logs FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.company_id = attendance_logs.company_id
            AND p.app_role IN ('Manager', 'General Manager', 'Admin', 'Owner')
        )
      );

    CREATE POLICY attendance_insert_own
      ON public.attendance_logs FOR INSERT
      WITH CHECK (user_id = auth.uid());

    CREATE POLICY attendance_update_own
      ON public.attendance_logs FOR UPDATE
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());

    -- ============================================================================
    -- 2. PUSH NOTIFICATION SUBSCRIPTIONS
    -- ============================================================================

    CREATE TABLE IF NOT EXISTS public.push_subscriptions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      endpoint TEXT NOT NULL,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      user_agent TEXT,
      device_info JSONB, -- {platform, os, browser}
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_used_at TIMESTAMPTZ,
      is_active BOOLEAN DEFAULT true,
      UNIQUE(user_id, endpoint) -- One subscription per user/endpoint combo
    );

    -- Add foreign key conditionally
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'push_subscriptions_user_id_fkey' 
      AND table_schema = 'public' 
      AND table_name = 'push_subscriptions'
    ) THEN
      ALTER TABLE public.push_subscriptions
      ADD CONSTRAINT push_subscriptions_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON public.push_subscriptions(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON public.push_subscriptions(is_active, last_used_at) WHERE is_active = true;

-- RLS Policies
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY push_subscriptions_select_own
  ON public.push_subscriptions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY push_subscriptions_insert_own
  ON public.push_subscriptions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY push_subscriptions_update_own
  ON public.push_subscriptions FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY push_subscriptions_delete_own
  ON public.push_subscriptions FOR DELETE
  USING (user_id = auth.uid());

    -- ============================================================================
    -- 3. UPDATE NOTIFICATIONS TABLE FOR NEW TYPES
    -- ============================================================================

    -- Only proceed if notifications table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
      -- Add new notification types
      ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
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

      -- Add task_id reference for task notifications (only if checklist_tasks exists)
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'checklist_tasks') THEN
        ALTER TABLE public.notifications 
          ADD COLUMN IF NOT EXISTS task_id UUID;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'notifications_task_id_fkey' 
          AND table_schema = 'public' 
          AND table_name = 'notifications'
        ) THEN
          ALTER TABLE public.notifications
          ADD CONSTRAINT notifications_task_id_fkey
          FOREIGN KEY (task_id) REFERENCES public.checklist_tasks(id) ON DELETE CASCADE;
        END IF;

        CREATE INDEX IF NOT EXISTS idx_notifications_task_id ON public.notifications(task_id) WHERE task_id IS NOT NULL;
      END IF;

      -- Add conversation_id for message notifications (only if conversations exists)
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'conversations') THEN
        ALTER TABLE public.notifications 
          ADD COLUMN IF NOT EXISTS conversation_id UUID;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'notifications_conversation_id_fkey' 
          AND table_schema = 'public' 
          AND table_name = 'notifications'
        ) THEN
          ALTER TABLE public.notifications
          ADD CONSTRAINT notifications_conversation_id_fkey
          FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;
        END IF;

        CREATE INDEX IF NOT EXISTS idx_notifications_conversation_id ON public.notifications(conversation_id) WHERE conversation_id IS NOT NULL;
      END IF;

      -- Add push_sent flag
      ALTER TABLE public.notifications 
        ADD COLUMN IF NOT EXISTS push_sent BOOLEAN DEFAULT false;

      CREATE INDEX IF NOT EXISTS idx_notifications_push_pending ON public.notifications(push_sent, created_at) WHERE push_sent = false;
    END IF;

-- ============================================================================
-- 4. NOTIFICATION FUNCTIONS
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
    AS $function$
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
      'Task Ready: ' || p_task_name,
      'Task "' || p_task_name || '" is ready to complete. Due at ' || p_due_time || '.',
      'info',
      'medium',
      'staff'
    ) RETURNING id INTO v_notification_id;
  END IF;
  
      RETURN v_notification_id;
    END;
    $function$;

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
    AS $function$
DECLARE
  v_manager RECORD;
  v_notification_count INTEGER := 0;
BEGIN
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
    $function$;

    -- Function to create message notification
    CREATE OR REPLACE FUNCTION public.create_message_notification(
      p_conversation_id UUID,
      p_message_id UUID,
      p_sender_id UUID,
      p_recipient_id UUID,
      p_company_id UUID,
      p_message_preview TEXT
    )
    RETURNS UUID
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $function$
DECLARE
  v_notification_id UUID;
  v_sender_name TEXT;
  v_clocked_in BOOLEAN;
BEGIN
  -- Get sender name
  SELECT full_name INTO v_sender_name
  FROM public.profiles
  WHERE id = p_sender_id;
  
  v_sender_name := COALESCE(v_sender_name, 'Someone');
  
  -- Check if user is clocked in (optional - messages might notify regardless)
  -- For now, we'll notify regardless of clock-in status for messages
  
  -- Check if notification already exists for this message/recipient
  SELECT id INTO v_notification_id
  FROM public.notifications
  WHERE conversation_id = p_conversation_id
    AND user_id = p_recipient_id
    AND type = 'message'
    AND created_at > NOW() - INTERVAL '5 minutes'; -- Prevent duplicate within 5 min
  
  IF v_notification_id IS NULL THEN
    INSERT INTO public.notifications (
      company_id,
      user_id,
      conversation_id,
      type,
      title,
      message,
      severity,
      priority,
      recipient_role
    ) VALUES (
      p_company_id,
      p_recipient_id,
      p_conversation_id,
      'message',
      'New message from ' || v_sender_name,
      LEFT(p_message_preview, 100),
      'info',
      'medium',
      NULL -- Messages are for all roles
    ) RETURNING id INTO v_notification_id;
  END IF;
  
      RETURN v_notification_id;
    END;
    $function$;

    -- ============================================================================
    -- 5. TRIGGERS
    -- ============================================================================

    -- Trigger to update attendance updated_at
    CREATE OR REPLACE FUNCTION public.update_attendance_updated_at()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    AS $function$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $function$;

    CREATE TRIGGER trigger_attendance_updated_at
      BEFORE UPDATE ON public.attendance_logs
      FOR EACH ROW
      EXECUTE FUNCTION public.update_attendance_updated_at();

    -- Trigger to update push subscription timestamps
    CREATE OR REPLACE FUNCTION public.update_push_subscription_timestamp()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    AS $function$
    BEGIN
      NEW.updated_at = NOW();
      IF TG_OP = 'UPDATE' THEN
        NEW.last_used_at = NOW();
      END IF;
      RETURN NEW;
    END;
    $function$;

    CREATE TRIGGER trigger_push_subscription_timestamp
      BEFORE UPDATE ON public.push_subscriptions
      FOR EACH ROW
      EXECUTE FUNCTION public.update_push_subscription_timestamp();

  ELSE
    RAISE NOTICE '⚠️ companies or profiles tables do not exist yet - skipping notification system creation';
  END IF;
END $$;

