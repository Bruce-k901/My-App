-- ============================================================================
-- MANUAL APPLICATION OF TICKET SYSTEM MIGRATIONS
-- ============================================================================
-- Run this SQL in your Supabase SQL Editor to create the complete ticket system
-- This combines both the base ticket system and conversation system
-- ============================================================================

-- ============================================================================
-- PART 1: BASE SUPPORT TICKETS SYSTEM
-- ============================================================================

CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  site_id uuid REFERENCES sites(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  assigned_to uuid REFERENCES auth.users(id),
  type text NOT NULL CHECK (type IN ('issue', 'idea', 'question')),
  module text NOT NULL CHECK (module IN ('checkly', 'stockly', 'teamly', 'planly', 'assetly', 'msgly', 'general')),
  title text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  page_url text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_support_tickets_company ON support_tickets(company_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_by ON support_tickets(created_by);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to ON support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_module ON support_tickets(module);
CREATE INDEX IF NOT EXISTS idx_support_tickets_type ON support_tickets(type);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_support_tickets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_support_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_support_tickets_updated_at();

-- Auto-assign to company owner on insert
CREATE OR REPLACE FUNCTION auto_assign_ticket_to_owner()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.assigned_to IS NULL THEN
    SELECT auth_user_id INTO NEW.assigned_to
    FROM profiles
    WHERE company_id = NEW.company_id
      AND app_role = 'Owner'
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_assign_ticket
  BEFORE INSERT ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_ticket_to_owner();

-- RLS Policies
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view tickets from their company" ON support_tickets;
DROP POLICY IF EXISTS "Users can create tickets for their company" ON support_tickets;
DROP POLICY IF EXISTS "Admins can update tickets from their company" ON support_tickets;

CREATE POLICY "Users can view tickets from their company"
  ON support_tickets FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can create tickets for their company"
  ON support_tickets FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE auth_user_id = auth.uid()));

CREATE POLICY "Admins can update tickets from their company"
  ON support_tickets FOR UPDATE
  USING (company_id IN (SELECT company_id FROM profiles WHERE auth_user_id = auth.uid() AND app_role IN ('Admin', 'Owner')));

-- ticket_attachments table
CREATE TABLE IF NOT EXISTS ticket_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES support_tickets(id) ON DELETE CASCADE NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_type text NOT NULL,
  file_size integer NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ticket_attachments_ticket ON ticket_attachments(ticket_id);

-- RLS for attachments
ALTER TABLE ticket_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view attachments from their company tickets" ON ticket_attachments;
DROP POLICY IF EXISTS "Users can insert attachments for their company tickets" ON ticket_attachments;

CREATE POLICY "Users can view attachments from their company tickets"
  ON ticket_attachments FOR SELECT
  USING (ticket_id IN (
    SELECT id FROM support_tickets
    WHERE company_id IN (SELECT company_id FROM profiles WHERE auth_user_id = auth.uid())
  ));

CREATE POLICY "Users can insert attachments for their company tickets"
  ON ticket_attachments FOR INSERT
  WITH CHECK (ticket_id IN (
    SELECT id FROM support_tickets
    WHERE company_id IN (SELECT company_id FROM profiles WHERE auth_user_id = auth.uid())
  ));

-- Storage bucket for screenshots
INSERT INTO storage.buckets (id, name, public)
VALUES ('support-tickets', 'support-tickets', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can view attachments from their company tickets"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'support-tickets' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM support_tickets
      WHERE company_id IN (SELECT company_id FROM profiles WHERE auth_user_id = auth.uid())
    )
  );

CREATE POLICY "Users can upload attachments for their company tickets"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'support-tickets' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM support_tickets
      WHERE company_id IN (SELECT company_id FROM profiles WHERE auth_user_id = auth.uid())
    )
  );

-- ============================================================================
-- PART 2: TICKET CONVERSATION SYSTEM
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. CREATE TICKET_COMMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS ticket_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

COMMENT ON TABLE ticket_comments IS 'Conversation thread for support tickets';
COMMENT ON COLUMN ticket_comments.is_internal IS 'Internal notes visible only to admins/owners';
COMMENT ON COLUMN ticket_comments.edited_at IS 'Timestamp of last edit';
COMMENT ON COLUMN ticket_comments.deleted_at IS 'Soft delete - comment hidden but preserved';

CREATE INDEX idx_ticket_comments_ticket ON ticket_comments(ticket_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_ticket_comments_author ON ticket_comments(author_id);
CREATE INDEX idx_ticket_comments_created ON ticket_comments(created_at DESC);

-- ============================================================================
-- 2. EXTEND TICKET_ATTACHMENTS FOR COMMENTS
-- ============================================================================
ALTER TABLE ticket_attachments
ADD COLUMN IF NOT EXISTS comment_id UUID REFERENCES ticket_comments(id) ON DELETE CASCADE;

COMMENT ON COLUMN ticket_attachments.comment_id IS 'NULL = initial ticket attachment, Non-null = attached to specific comment';

CREATE INDEX IF NOT EXISTS idx_ticket_attachments_comment ON ticket_attachments(comment_id) WHERE comment_id IS NOT NULL;

-- ============================================================================
-- 3. CREATE TICKET_NOTIFICATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS ticket_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  last_read_at TIMESTAMPTZ,
  unread_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(ticket_id, user_id)
);

COMMENT ON TABLE ticket_notifications IS 'Tracks read/unread status for each user per ticket';

CREATE INDEX idx_ticket_notifications_user ON ticket_notifications(user_id, last_read_at);
CREATE INDEX idx_ticket_notifications_ticket ON ticket_notifications(ticket_id);

-- ============================================================================
-- 4. ADD ACTIVITY COLUMNS TO SUPPORT_TICKETS
-- ============================================================================
ALTER TABLE support_tickets
ADD COLUMN IF NOT EXISTS last_comment_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS comment_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_status_change_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_status_change_by UUID REFERENCES auth.users(id);

COMMENT ON COLUMN support_tickets.last_comment_at IS 'Timestamp of most recent comment (for sorting by activity)';
COMMENT ON COLUMN support_tickets.comment_count IS 'Cached count of comments (excludes deleted)';
COMMENT ON COLUMN support_tickets.last_status_change_at IS 'When status was last changed';
COMMENT ON COLUMN support_tickets.last_status_change_by IS 'Who changed the status last';

CREATE INDEX IF NOT EXISTS idx_support_tickets_last_comment ON support_tickets(last_comment_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_support_tickets_activity ON support_tickets(company_id, status, last_comment_at DESC);

-- ============================================================================
-- 5. CREATE TICKET_HISTORY TABLE (for audit trail)
-- ============================================================================
CREATE TABLE IF NOT EXISTS ticket_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  change_type TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE ticket_history IS 'Audit trail of all ticket changes';

CREATE INDEX idx_ticket_history_ticket ON ticket_history(ticket_id, created_at DESC);
CREATE INDEX idx_ticket_history_user ON ticket_history(changed_by);

-- ============================================================================
-- 6. ROW LEVEL SECURITY POLICIES
-- ============================================================================

ALTER TABLE ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_history ENABLE ROW LEVEL SECURITY;

-- RLS: TICKET_COMMENTS
CREATE POLICY "Users can view relevant ticket comments"
ON ticket_comments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM support_tickets t
    WHERE t.id = ticket_comments.ticket_id
    AND (
      (t.created_by = auth.uid() AND (NOT ticket_comments.is_internal OR ticket_comments.deleted_at IS NOT NULL))
      OR t.assigned_to = auth.uid()
      OR EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.auth_user_id = auth.uid()
        AND p.company_id = t.company_id
        AND p.app_role IN ('Admin', 'Owner')
      )
      OR EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.auth_user_id = auth.uid()
        AND p.is_platform_admin = true
      )
    )
  )
  AND ticket_comments.deleted_at IS NULL
);

CREATE POLICY "Users can add comments to relevant tickets"
ON ticket_comments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM support_tickets t
    WHERE t.id = ticket_comments.ticket_id
    AND (
      t.created_by = auth.uid()
      OR t.assigned_to = auth.uid()
      OR EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.auth_user_id = auth.uid()
        AND p.company_id = t.company_id
        AND p.app_role IN ('Admin', 'Owner')
      )
      OR EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.auth_user_id = auth.uid()
        AND p.is_platform_admin = true
      )
    )
  )
  AND ticket_comments.author_id = auth.uid()
);

CREATE POLICY "Users can edit own comments"
ON ticket_comments FOR UPDATE
USING (
  author_id = auth.uid()
  AND deleted_at IS NULL
  AND created_at > NOW() - INTERVAL '30 minutes'
)
WITH CHECK (
  author_id = auth.uid()
  AND deleted_at IS NULL
);

CREATE POLICY "Users can delete own comments or admins can delete any"
ON ticket_comments FOR UPDATE
USING (
  author_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM support_tickets t
    JOIN profiles p ON p.auth_user_id = auth.uid()
    WHERE t.id = ticket_comments.ticket_id
    AND (
      (p.company_id = t.company_id AND p.app_role IN ('Admin', 'Owner'))
      OR p.is_platform_admin = true
    )
  )
)
WITH CHECK (
  deleted_at IS NOT NULL
);

-- RLS: TICKET_NOTIFICATIONS
CREATE POLICY "Users can view own ticket notifications"
ON ticket_notifications FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can update own ticket notifications"
ON ticket_notifications FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "System can insert ticket notifications"
ON ticket_notifications FOR INSERT
WITH CHECK (true);

-- RLS: TICKET_HISTORY
CREATE POLICY "Users can view ticket history for relevant tickets"
ON ticket_history FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM support_tickets t
    WHERE t.id = ticket_history.ticket_id
    AND (
      t.created_by = auth.uid()
      OR t.assigned_to = auth.uid()
      OR EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.auth_user_id = auth.uid()
        AND p.company_id = t.company_id
        AND p.app_role IN ('Admin', 'Owner')
      )
      OR EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.auth_user_id = auth.uid()
        AND p.is_platform_admin = true
      )
    )
  )
);

CREATE POLICY "System can insert ticket history"
ON ticket_history FOR INSERT
WITH CHECK (changed_by = auth.uid());

-- ============================================================================
-- 7. FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function: Update ticket activity when comment is added
CREATE OR REPLACE FUNCTION update_ticket_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE support_tickets
  SET
    last_comment_at = NEW.created_at,
    comment_count = comment_count + 1,
    updated_at = NOW()
  WHERE id = NEW.ticket_id;

  INSERT INTO ticket_notifications (ticket_id, user_id, unread_count, updated_at)
  SELECT
    NEW.ticket_id,
    t.assigned_to,
    1,
    NOW()
  FROM support_tickets t
  WHERE t.id = NEW.ticket_id
    AND t.assigned_to IS NOT NULL
    AND t.assigned_to != NEW.author_id
  ON CONFLICT (ticket_id, user_id)
  DO UPDATE SET
    unread_count = ticket_notifications.unread_count + 1,
    updated_at = NOW();

  INSERT INTO ticket_notifications (ticket_id, user_id, unread_count, updated_at)
  SELECT
    NEW.ticket_id,
    t.created_by,
    1,
    NOW()
  FROM support_tickets t
  WHERE t.id = NEW.ticket_id
    AND t.created_by != NEW.author_id
  ON CONFLICT (ticket_id, user_id)
  DO UPDATE SET
    unread_count = ticket_notifications.unread_count + 1,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_ticket_activity
AFTER INSERT ON ticket_comments
FOR EACH ROW
WHEN (NEW.deleted_at IS NULL)
EXECUTE FUNCTION update_ticket_activity();

-- Function: Log ticket changes to history
CREATE OR REPLACE FUNCTION log_ticket_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO ticket_history (ticket_id, changed_by, change_type, old_value, new_value)
    VALUES (NEW.id, auth.uid(), 'status', OLD.status, NEW.status);

    NEW.last_status_change_at = NOW();
    NEW.last_status_change_by = auth.uid();
  END IF;

  IF OLD.priority IS DISTINCT FROM NEW.priority THEN
    INSERT INTO ticket_history (ticket_id, changed_by, change_type, old_value, new_value)
    VALUES (NEW.id, auth.uid(), 'priority', OLD.priority, NEW.priority);
  END IF;

  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
    INSERT INTO ticket_history (ticket_id, changed_by, change_type, old_value, new_value)
    VALUES (
      NEW.id,
      auth.uid(),
      'assignment',
      OLD.assigned_to::TEXT,
      NEW.assigned_to::TEXT
    );

    IF NEW.assigned_to IS NOT NULL THEN
      INSERT INTO ticket_notifications (ticket_id, user_id, unread_count)
      VALUES (NEW.id, NEW.assigned_to, 1)
      ON CONFLICT (ticket_id, user_id)
      DO UPDATE SET
        unread_count = ticket_notifications.unread_count + 1,
        updated_at = NOW();
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_log_ticket_changes
BEFORE UPDATE ON support_tickets
FOR EACH ROW
EXECUTE FUNCTION log_ticket_changes();

-- Function: Decrement comment count on soft delete
CREATE OR REPLACE FUNCTION handle_comment_deletion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    UPDATE support_tickets
    SET comment_count = GREATEST(comment_count - 1, 0)
    WHERE id = NEW.ticket_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_handle_comment_deletion
AFTER UPDATE ON ticket_comments
FOR EACH ROW
WHEN (NEW.deleted_at IS DISTINCT FROM OLD.deleted_at)
EXECUTE FUNCTION handle_comment_deletion();

-- Auto-update trigger for ticket_comments
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_ticket_comments
BEFORE UPDATE ON ticket_comments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON ticket_comments TO authenticated;
GRANT ALL ON ticket_notifications TO authenticated;
GRANT ALL ON ticket_history TO authenticated;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
