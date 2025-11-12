-- Create sop_entries table
CREATE TABLE IF NOT EXISTS sop_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  ref_code TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0',
  status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Published', 'Archived')),
  author TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Food Prep', 'Service (FOH)', 'Drinks', 'Hot Beverages', 'Cold Beverages', 'Cleaning', 'Opening', 'Closing')),
  sop_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sop_entries_company_id ON sop_entries(company_id);
CREATE INDEX IF NOT EXISTS idx_sop_entries_status ON sop_entries(status);
CREATE INDEX IF NOT EXISTS idx_sop_entries_category ON sop_entries(category);
CREATE INDEX IF NOT EXISTS idx_sop_entries_ref_code ON sop_entries(ref_code);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_sop_entries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_sop_entries_updated_at ON sop_entries;
CREATE TRIGGER trigger_update_sop_entries_updated_at
  BEFORE UPDATE ON sop_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_sop_entries_updated_at();

-- Enable RLS
ALTER TABLE sop_entries ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view SOPs from their own company" ON sop_entries;
DROP POLICY IF EXISTS "Users can create SOPs for their own company" ON sop_entries;
DROP POLICY IF EXISTS "Users can update SOPs from their own company" ON sop_entries;
DROP POLICY IF EXISTS "Users can delete SOPs from their own company" ON sop_entries;

-- RLS Policy: Users can only see SOPs from their own company
CREATE POLICY "Users can view SOPs from their own company"
  ON sop_entries
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- RLS Policy: Users can create SOPs for their own company
CREATE POLICY "Users can create SOPs for their own company"
  ON sop_entries
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- RLS Policy: Users can update SOPs from their own company
CREATE POLICY "Users can update SOPs from their own company"
  ON sop_entries
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- RLS Policy: Users can delete SOPs from their own company
CREATE POLICY "Users can delete SOPs from their own company"
  ON sop_entries
  FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON sop_entries TO authenticated;

