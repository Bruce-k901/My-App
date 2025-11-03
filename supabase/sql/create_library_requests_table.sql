-- ============================================
-- Create Library Requests Table
-- ============================================
-- This table stores custom library requests from users
-- Checkly admins review and deploy these requests

CREATE TABLE IF NOT EXISTS library_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  requested_by UUID REFERENCES auth.users(id),
  
  -- Library Definition
  library_name TEXT NOT NULL,
  table_name TEXT NOT NULL,  -- sanitized, e.g., "equipment_spares_library"
  description TEXT,
  
  -- Field Definitions (stored as JSONB)
  fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  /*
  Example fields structure:
  [
    {
      "name": "Part Number",
      "column": "part_number",
      "type": "TEXT",
      "required": true,
      "main_table": true,
      "default": null,
      "validation": null
    }
  ]
  */
  
  -- Settings
  main_table_columns TEXT[],  -- Which fields show in table view
  category_options TEXT[],    -- If any category field exists
  enable_csv_import BOOLEAN DEFAULT true,
  enable_csv_export BOOLEAN DEFAULT true,
  
  -- Generated SQL (stored after generation)
  generated_sql TEXT,
  generated_typescript_types TEXT,
  generated_component_template TEXT,
  
  -- Status Tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',      -- Waiting for Checkly review
    'approved',     -- Approved, ready to deploy
    'deployed',     -- SQL executed, library live
    'rejected',     -- Rejected by Checkly
    'cancelled'     -- Cancelled by user
  )),
  
  -- Review/Deployment Tracking
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  deployed_by UUID REFERENCES auth.users(id),
  deployed_at TIMESTAMPTZ,
  deployment_notes TEXT,
  rejection_reason TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_library_requests_status ON library_requests(status);
CREATE INDEX IF NOT EXISTS idx_library_requests_company ON library_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_library_requests_pending ON library_requests(status, created_at) 
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_library_requests_requested_by ON library_requests(requested_by);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_library_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_library_requests_updated_at
  BEFORE UPDATE ON library_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_library_requests_updated_at();

-- RLS Policies
ALTER TABLE library_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their company's requests
DROP POLICY IF EXISTS "Users can view library requests from their own company" ON library_requests;
CREATE POLICY "Users can view library requests from their own company"
  ON library_requests FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Users can create requests for their company
DROP POLICY IF EXISTS "Users can create library requests for their own company" ON library_requests;
CREATE POLICY "Users can create library requests for their own company"
  ON library_requests FOR INSERT
  WITH CHECK (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()) AND
    requested_by = auth.uid()
  );

-- Users can update their own pending requests (e.g., to cancel)
DROP POLICY IF EXISTS "Users can update their own pending requests" ON library_requests;
CREATE POLICY "Users can update their own pending requests"
  ON library_requests FOR UPDATE
  USING (
    requested_by = auth.uid() AND
    status = 'pending'
  )
  WITH CHECK (
    requested_by = auth.uid() AND
    (status = 'pending' OR status = 'cancelled')  -- Can only cancel
  );

-- Admins can view all requests (for Checkly staff)
DROP POLICY IF EXISTS "Admins can view all library requests" ON library_requests;
CREATE POLICY "Admins can view all library requests"
  ON library_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND LOWER(app_role::text) IN ('owner', 'admin')
    )
  );

-- Admins can update requests (approve, reject, deploy)
DROP POLICY IF EXISTS "Admins can update library requests" ON library_requests;
CREATE POLICY "Admins can update library requests"
  ON library_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND LOWER(app_role::text) IN ('owner', 'admin')
    )
  );

-- Permissions
GRANT SELECT, INSERT, UPDATE ON library_requests TO authenticated;

-- Comments
COMMENT ON TABLE library_requests IS 'Stores custom library requests from users, reviewed by Checkly admins';
COMMENT ON COLUMN library_requests.fields IS 'JSONB array of field definitions';
COMMENT ON COLUMN library_requests.generated_sql IS 'SQL migration script generated from library definition';
COMMENT ON COLUMN library_requests.status IS 'Request status: pending, approved, deployed, rejected, cancelled';

