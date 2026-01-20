-- ============================================
-- Create Departments Table
-- ============================================
-- Flexible departments table for company organization
-- Supports department name, contact information, and custom metadata

-- Drop table if exists for clean migration
DROP TABLE IF EXISTS departments CASCADE;

CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Core Department Info
  name TEXT NOT NULL,
  description TEXT,
  
  -- Contact Information
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  contact_mobile TEXT,
  
  -- Additional Contact Details (flexible JSONB)
  contact_details JSONB DEFAULT '{}'::jsonb,
  /*
  Example contact_details structure:
  {
    "address": "123 Main St",
    "extension": "1234",
    "office_location": "Building A, Floor 2",
    "alternate_email": "backup@example.com",
    "notes": "Available 9-5 weekdays"
  }
  */
  
  -- Department Metadata
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  parent_department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  
  -- Additional Metadata (flexible JSONB)
  metadata JSONB DEFAULT '{}'::jsonb,
  /*
  Example metadata structure:
  {
    "budget_code": "DEPT-001",
    "cost_center": "CC-123",
    "head_count": 25,
    "location": "Head Office",
    "manager_id": "uuid-here"
  }
  */
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_departments_company_id ON departments(company_id);
CREATE INDEX idx_departments_name ON departments(name);
CREATE INDEX idx_departments_status ON departments(status);
CREATE INDEX idx_departments_parent ON departments(parent_department_id);
CREATE INDEX idx_departments_contact_email ON departments(contact_email) WHERE contact_email IS NOT NULL;

-- Full text search index for name and description
CREATE INDEX idx_departments_search ON departments USING gin(to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '')));

-- Updated_at trigger
DROP TRIGGER IF EXISTS trg_departments_updated_at ON departments;
CREATE TRIGGER trg_departments_updated_at
  BEFORE UPDATE ON departments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

-- Select: Users can view departments from their company
DROP POLICY IF EXISTS "departments_select_company" ON departments;
CREATE POLICY "departments_select_company"
  ON departments FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Insert: Users can create departments for their company
DROP POLICY IF EXISTS "departments_insert_company" ON departments;
CREATE POLICY "departments_insert_company"
  ON departments FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Update: Users can update departments from their company
DROP POLICY IF EXISTS "departments_update_company" ON departments;
CREATE POLICY "departments_update_company"
  ON departments FOR UPDATE
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Delete: Users can delete departments from their company
DROP POLICY IF EXISTS "departments_delete_company" ON departments;
CREATE POLICY "departments_delete_company"
  ON departments FOR DELETE
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Comments
COMMENT ON TABLE departments IS 'Flexible departments table for company organization with contact information';
COMMENT ON COLUMN departments.contact_details IS 'Flexible JSONB field for additional contact information (address, extension, alternate emails, etc.)';
COMMENT ON COLUMN departments.metadata IS 'Flexible JSONB field for additional department metadata (budget codes, cost centers, head count, etc.)';
COMMENT ON COLUMN departments.parent_department_id IS 'Self-referencing foreign key for department hierarchy';

