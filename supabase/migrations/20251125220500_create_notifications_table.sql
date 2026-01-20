-- Create notifications table
-- This table stores system notifications, alerts, reminders, and messages
-- Note: This migration will be skipped if required tables don't exist yet

DO $$
BEGIN
  -- Only proceed if required tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'companies')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN

    -- Create table with foreign keys
    -- Note: site_id foreign key is conditional - added separately if sites table exists
    CREATE TABLE IF NOT EXISTS public.notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
      site_id UUID, -- Foreign key added conditionally below
      
      -- Notification content
      type TEXT NOT NULL DEFAULT 'task', -- 'task', 'alert', 'reminder', 'message', 'system'
      title TEXT NOT NULL,
      message TEXT,
      
      -- Classification
      severity TEXT DEFAULT 'info', -- 'info', 'warning', 'critical'
      priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
      status TEXT DEFAULT 'active', -- 'active', 'read', 'archived', 'dismissed'
      
      -- Recipient targeting
      recipient_role TEXT, -- 'staff', 'manager', 'admin', NULL for all
      recipient_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
      
      -- Scheduling
      due_date DATE,
      due_time TIME,
      
      -- Metadata
      metadata JSONB DEFAULT '{}'::jsonb,
      read BOOLEAN DEFAULT FALSE,
      read_at TIMESTAMPTZ,
      read_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
      
      -- Timestamps
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
    );

    -- Add sites foreign key constraint if sites table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sites') THEN
      -- Check if constraint already exists before adding
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_schema = 'public'
          AND table_name = 'notifications'
          AND constraint_name = 'notifications_site_id_fkey'
      ) THEN
        ALTER TABLE public.notifications
          ADD CONSTRAINT notifications_site_id_fkey
          FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE CASCADE;
      END IF;
    END IF;

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_notifications_company_id ON public.notifications(company_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_site_id ON public.notifications(site_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_status ON public.notifications(status);
    CREATE INDEX IF NOT EXISTS idx_notifications_severity ON public.notifications(severity);
    CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
    CREATE INDEX IF NOT EXISTS idx_notifications_recipient_user_id ON public.notifications(recipient_user_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_notifications_due_date ON public.notifications(due_date);
    CREATE INDEX IF NOT EXISTS idx_notifications_company_status ON public.notifications(company_id, status);

    -- RLS Policies
    ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can view notifications for their company" ON public.notifications;
    DROP POLICY IF EXISTS "Users can view notifications assigned to them" ON public.notifications;
    DROP POLICY IF EXISTS "Users can view notifications for their role" ON public.notifications;
    DROP POLICY IF EXISTS "Users can insert notifications for their company" ON public.notifications;
    DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
    DROP POLICY IF EXISTS "Admins can manage all company notifications" ON public.notifications;

    -- Policy: Users can view notifications for their company
    CREATE POLICY "Users can view notifications for their company"
      ON public.notifications
      FOR SELECT
      USING (
        company_id IN (
          SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
      );

    -- Policy: Users can view notifications assigned to them specifically
    CREATE POLICY "Users can view notifications assigned to them"
      ON public.notifications
      FOR SELECT
      USING (
        recipient_user_id = auth.uid()
      );

    -- Policy: Users can view notifications for their role
    CREATE POLICY "Users can view notifications for their role"
      ON public.notifications
      FOR SELECT
      USING (
        recipient_role IN (
          SELECT app_role FROM public.profiles WHERE id = auth.uid()
        )
        OR recipient_role IS NULL -- NULL means for everyone
      );

    -- Policy: Users can insert notifications for their company
    CREATE POLICY "Users can insert notifications for their company"
      ON public.notifications
      FOR INSERT
      WITH CHECK (
        company_id IN (
          SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
      );

    -- Policy: Users can update notifications (mark as read, etc.)
    CREATE POLICY "Users can update their own notifications"
      ON public.notifications
      FOR UPDATE
      USING (
        company_id IN (
          SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
      );

    -- Policy: Admins can delete notifications
    CREATE POLICY "Admins can manage all company notifications"
      ON public.notifications
      FOR DELETE
      USING (
        company_id IN (
          SELECT company_id FROM public.profiles 
          WHERE id = auth.uid() 
          AND app_role = 'Admin'
        )
      );

    -- Function to update updated_at timestamp
    CREATE OR REPLACE FUNCTION update_notifications_updated_at()
    RETURNS TRIGGER AS $func$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;

    -- Trigger to automatically update updated_at
    DROP TRIGGER IF EXISTS notifications_updated_at ON public.notifications;
    CREATE TRIGGER notifications_updated_at
      BEFORE UPDATE ON public.notifications
      FOR EACH ROW
      EXECUTE FUNCTION update_notifications_updated_at();

    -- Grant permissions
    GRANT SELECT, INSERT, UPDATE ON public.notifications TO authenticated;
    GRANT DELETE ON public.notifications TO authenticated; -- Controlled by RLS policy

    -- Comment on table
    COMMENT ON TABLE public.notifications IS 'Stores system notifications, alerts, reminders, and messages for users';
    COMMENT ON COLUMN public.notifications.type IS 'Type of notification: task, alert, reminder, message, system';
    COMMENT ON COLUMN public.notifications.severity IS 'Severity level: info, warning, critical';
    COMMENT ON COLUMN public.notifications.priority IS 'Priority level: low, medium, high, urgent';
    COMMENT ON COLUMN public.notifications.status IS 'Current status: active, read, archived, dismissed';
    COMMENT ON COLUMN public.notifications.recipient_role IS 'Target role: staff, manager, admin, or NULL for all';
    COMMENT ON COLUMN public.notifications.due_date IS 'Optional due date for scheduled notifications';

    RAISE NOTICE 'Created notifications table';

  ELSE
    RAISE NOTICE '⚠️ Required tables (companies, profiles) do not exist yet - skipping notifications table';
  END IF;
END $$;
