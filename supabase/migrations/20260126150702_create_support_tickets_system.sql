-- ============================================================================
-- Migration: Create Support Tickets System
-- Description: Creates support_tickets and ticket_attachments tables with RLS
--              and storage bucket for screenshot attachments
-- ============================================================================

-- ============================================================================
-- TABLE: support_tickets
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
    SELECT id INTO NEW.assigned_to
    FROM profiles
    WHERE company_id = NEW.company_id
      AND app_role = 'owner'
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
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create tickets for their company"
  ON support_tickets FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can update tickets from their company"
  ON support_tickets FOR UPDATE
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid() AND app_role IN ('owner', 'admin')));

-- ============================================================================
-- TABLE: ticket_attachments
-- ============================================================================

CREATE TABLE IF NOT EXISTS ticket_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES support_tickets(id) ON DELETE CASCADE NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_type text NOT NULL,
  file_size integer NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ticket_attachments_ticket ON ticket_attachments(ticket_id);

-- RLS Policies
ALTER TABLE ticket_attachments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view attachments from their company tickets" ON ticket_attachments;
DROP POLICY IF EXISTS "Users can create attachments for their company tickets" ON ticket_attachments;

CREATE POLICY "Users can view attachments from their company tickets"
  ON ticket_attachments FOR SELECT
  USING (ticket_id IN (
    SELECT id FROM support_tickets 
    WHERE company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  ));

CREATE POLICY "Users can create attachments for their company tickets"
  ON ticket_attachments FOR INSERT
  WITH CHECK (ticket_id IN (
    SELECT id FROM support_tickets 
    WHERE company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  ));

-- ============================================================================
-- STORAGE BUCKET: support-tickets
-- ============================================================================

-- Create support-tickets storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'support-tickets',
  'support-tickets',
  false,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload ticket attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can view ticket attachments from their company" ON storage.objects;

CREATE POLICY "Users can upload ticket attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'support-tickets'
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND split_part(storage.objects.name, '/', 1) = p.company_id::text
    )
  );

CREATE POLICY "Users can view ticket attachments from their company"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'support-tickets'
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND split_part(storage.objects.name, '/', 1) = p.company_id::text
    )
  );

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE support_tickets IS 'Support tickets created through the Opsly Assistant';
COMMENT ON TABLE ticket_attachments IS 'File attachments (screenshots, documents) for support tickets';
COMMENT ON COLUMN support_tickets.page_url IS 'URL of the page where the issue occurred';
COMMENT ON COLUMN support_tickets.assigned_to IS 'User assigned to handle the ticket (defaults to company owner)';
