-- =====================================================
-- RUN THIS IN SUPABASE SQL EDITOR
-- Drops and recreates the notifications table
-- =====================================================

-- Drop existing table if it exists
DROP TABLE IF EXISTS notifications CASCADE;

-- Create notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  site_id UUID,
  
  -- Notification content
  type TEXT NOT NULL DEFAULT 'task',
  title TEXT NOT NULL,
  message TEXT,
  
  -- Classification
  severity TEXT DEFAULT 'info',
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'active',
  
  -- Recipient targeting
  recipient_role TEXT,
  recipient_user_id UUID,
  
  -- Scheduling
  due_date DATE,
  due_time TIME,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  read_by UUID,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID
);

-- Add foreign key constraints
DO $$ 
BEGIN
  -- Add company_id foreign key if companies table exists
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'companies') THEN
    ALTER TABLE notifications 
    ADD CONSTRAINT notifications_company_id_fkey 
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
  END IF;

  -- Add site_id foreign key if sites table exists
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sites') THEN
    ALTER TABLE notifications 
    ADD CONSTRAINT notifications_site_id_fkey 
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE;
  END IF;

  -- Add recipient_user_id foreign key if profiles table exists
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
    ALTER TABLE notifications 
    ADD CONSTRAINT notifications_recipient_user_id_fkey 
    FOREIGN KEY (recipient_user_id) REFERENCES profiles(id) ON DELETE SET NULL;

    -- Add read_by foreign key
    ALTER TABLE notifications 
    ADD CONSTRAINT notifications_read_by_fkey 
    FOREIGN KEY (read_by) REFERENCES profiles(id) ON DELETE SET NULL;

    -- Add created_by foreign key
    ALTER TABLE notifications 
    ADD CONSTRAINT notifications_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Indexes
CREATE INDEX idx_notifications_company_id ON notifications(company_id);
CREATE INDEX idx_notifications_site_id ON notifications(site_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_severity ON notifications(severity);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_recipient_user_id ON notifications(recipient_user_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_due_date ON notifications(due_date);
CREATE INDEX idx_notifications_company_status ON notifications(company_id, status);

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view notifications for their company"
  ON notifications FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can view notifications assigned to them"
  ON notifications FOR SELECT
  USING (recipient_user_id = auth.uid());

CREATE POLICY "Users can view notifications for their role"
  ON notifications FOR SELECT
  USING (
    recipient_role IS NULL 
    OR recipient_role::text IN (
      SELECT app_role::text FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert notifications for their company"
  ON notifications FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can manage all company notifications"
  ON notifications FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM profiles 
      WHERE id = auth.uid() 
      AND app_role::text = 'Admin'
    )
  );

-- Auto-update timestamp function
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
CREATE TRIGGER notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_notifications_updated_at();

-- Permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON notifications TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Notifications table created successfully with all columns, indexes, and policies!';
END $$;
