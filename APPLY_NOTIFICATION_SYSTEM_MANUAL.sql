-- ============================================================================
-- MANUAL APPLICATION: Complete Notification System
-- ============================================================================
-- Run this entire script in Supabase Dashboard → SQL Editor
-- This combines all three notification migrations into one script
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: CLOCK-IN / ATTENDANCE SYSTEM
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.attendance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,
  clock_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  clock_out_at TIMESTAMPTZ,
  location JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT attendance_clock_out_after_clock_in CHECK (
    clock_out_at IS NULL OR clock_out_at >= clock_in_at
  )
);

CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON public.attendance_logs(user_id, clock_in_at DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_site_date ON public.attendance_logs(site_id, clock_in_at DESC) WHERE site_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_attendance_company_date ON public.attendance_logs(company_id, clock_in_at DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_active ON public.attendance_logs(user_id, clock_out_at) WHERE clock_out_at IS NULL;

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
  SELECT EXISTS (
    SELECT 1 FROM public.attendance_logs
    WHERE user_id = p_user_id
      AND clock_out_at IS NULL
      AND (p_site_id IS NULL OR site_id = p_site_id)
      AND clock_in_at::date = CURRENT_DATE
  ) INTO v_clocked_in;
  
  RETURN v_clocked_in;
END;
$$;

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
    a.clock_in_at
  FROM public.attendance_logs a
  JOIN public.profiles p ON p.id = a.user_id
  WHERE a.site_id = p_site_id
    AND a.clock_out_at IS NULL
    AND a.clock_in_at::date = CURRENT_DATE
    AND p.app_role IN ('Staff', 'Manager', 'General Manager')
  ORDER BY a.clock_in_at DESC;
END;
$$;

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
$$;

ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS attendance_select_own ON public.attendance_logs;
CREATE POLICY attendance_select_own
  ON public.attendance_logs FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS attendance_select_company ON public.attendance_logs;
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

DROP POLICY IF EXISTS attendance_insert_own ON public.attendance_logs;
CREATE POLICY attendance_insert_own
  ON public.attendance_logs FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS attendance_update_own ON public.attendance_logs;
CREATE POLICY attendance_update_own
  ON public.attendance_logs FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- PART 2: PUSH NOTIFICATION SUBSCRIPTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  device_info JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(user_id, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON public.push_subscriptions(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON public.push_subscriptions(is_active, last_used_at) WHERE is_active = true;

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS push_subscriptions_select_own ON public.push_subscriptions;
CREATE POLICY push_subscriptions_select_own
  ON public.push_subscriptions FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS push_subscriptions_insert_own ON public.push_subscriptions;
CREATE POLICY push_subscriptions_insert_own
  ON public.push_subscriptions FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS push_subscriptions_update_own ON public.push_subscriptions;
CREATE POLICY push_subscriptions_update_own
  ON public.push_subscriptions FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS push_subscriptions_delete_own ON public.push_subscriptions;
CREATE POLICY push_subscriptions_delete_own
  ON public.push_subscriptions FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- PART 3: UPDATE NOTIFICATIONS TABLE
-- ============================================================================

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
  CHECK (type IN (
    'incident',
    'temperature',
    'task',
    'task_ready',
    'task_late',
    'maintenance',
    'digest',
    'ppm_due_soon',
    'ppm_overdue',
    'ppm_completed',
    'message',
    'message_mention'
  ));

ALTER TABLE public.notifications 
  ADD COLUMN IF NOT EXISTS task_id UUID REFERENCES public.checklist_tasks(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_notifications_task_id ON public.notifications(task_id) WHERE task_id IS NOT NULL;

ALTER TABLE public.notifications 
  ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_notifications_conversation_id ON public.notifications(conversation_id) WHERE conversation_id IS NOT NULL;

ALTER TABLE public.notifications 
  ADD COLUMN IF NOT EXISTS push_sent BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_notifications_push_pending ON public.notifications(push_sent, created_at) WHERE push_sent = false;

-- ============================================================================
-- PART 4: NOTIFICATION FUNCTIONS
-- ============================================================================

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
  SELECT public.is_user_clocked_in(p_user_id, p_site_id) INTO v_clocked_in;
  
  IF NOT v_clocked_in THEN
    RETURN NULL;
  END IF;
  
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
$$;

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
  FOR v_manager IN 
    SELECT * FROM public.get_managers_on_shift(p_site_id, p_company_id)
  LOOP
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
AS $$
DECLARE
  v_notification_id UUID;
  v_sender_name TEXT;
BEGIN
  SELECT full_name INTO v_sender_name
  FROM public.profiles
  WHERE id = p_sender_id;
  
  v_sender_name := COALESCE(v_sender_name, 'Someone');
  
  SELECT id INTO v_notification_id
  FROM public.notifications
  WHERE conversation_id = p_conversation_id
    AND user_id = p_recipient_id
    AND type = 'message'
    AND created_at > NOW() - INTERVAL '5 minutes';
  
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
      NULL
    ) RETURNING id INTO v_notification_id;
  END IF;
  
  RETURN v_notification_id;
END;
$$;

-- ============================================================================
-- PART 5: MESSAGE NOTIFICATION TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION public.notify_message_recipients()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_participant RECORD;
  v_conversation RECORD;
  v_message_preview TEXT;
BEGIN
  SELECT * INTO v_conversation
  FROM public.conversations
  WHERE id = NEW.conversation_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  v_message_preview := CASE
    WHEN NEW.message_type = 'image' THEN '📷 Photo'
    WHEN NEW.message_type = 'file' THEN '📎 ' || COALESCE(NEW.file_name, 'File')
    ELSE LEFT(NEW.content, 100)
  END;

  FOR v_participant IN
    SELECT user_id
    FROM public.conversation_participants
    WHERE conversation_id = NEW.conversation_id
      AND user_id != NEW.sender_id
      AND left_at IS NULL
  LOOP
    PERFORM public.create_message_notification(
      NEW.conversation_id,
      NEW.id,
      NEW.sender_id,
      v_participant.user_id,
      v_conversation.company_id,
      v_message_preview
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_message_recipients ON public.messages;
CREATE TRIGGER trg_notify_message_recipients
  AFTER INSERT ON public.messages
  FOR EACH ROW
  WHEN (NEW.deleted_at IS NULL)
  EXECUTE FUNCTION public.notify_message_recipients();

-- ============================================================================
-- PART 6: TRIGGERS FOR TIMESTAMPS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_attendance_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_attendance_updated_at ON public.attendance_logs;
CREATE TRIGGER trigger_attendance_updated_at
  BEFORE UPDATE ON public.attendance_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_attendance_updated_at();

CREATE OR REPLACE FUNCTION public.update_push_subscription_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  IF TG_OP = 'UPDATE' THEN
    NEW.last_used_at = NOW();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_push_subscription_timestamp ON public.push_subscriptions;
CREATE TRIGGER trigger_push_subscription_timestamp
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_push_subscription_timestamp();

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (Run these after the script completes)
-- ============================================================================

-- Check tables were created
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name IN ('attendance_logs', 'push_subscriptions');

-- Check functions exist
-- SELECT routine_name FROM information_schema.routines 
-- WHERE routine_schema = 'public' 
-- AND routine_name IN ('is_user_clocked_in', 'create_task_ready_notification', 'create_late_task_notification', 'create_message_notification');

-- Check trigger exists
-- SELECT trigger_name FROM information_schema.triggers 
-- WHERE trigger_schema = 'public' 
-- AND trigger_name = 'trg_notify_message_recipients';

