-- Create Risk Assessments Table
-- This migration creates the risk_assessments table for storing risk assessment data

-- Drop table if exists for clean migration
DROP TABLE IF EXISTS risk_assessments CASCADE;

CREATE TABLE risk_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) NOT NULL,
  template_type text NOT NULL CHECK (template_type IN ('general', 'coshh')),
  title text NOT NULL,
  ref_code text NOT NULL,
  site_id uuid REFERENCES sites(id),
  assessor_name text,
  assessment_date date DEFAULT CURRENT_DATE,
  review_date date,
  next_review_date date,
  status text DEFAULT 'Draft' CHECK (status IN ('Draft', 'Published', 'Under Review', 'Archived')),
  
  -- Main assessment data stored as JSONB
  assessment_data jsonb DEFAULT '{}'::jsonb,
  
  -- Links to other entities
  linked_sops uuid[], -- array of SOP IDs
  linked_chemicals uuid[], -- for COSHH assessments
  linked_ppe uuid[], -- PPE items used
  
  -- Risk summary (calculated fields for quick filtering)
  highest_risk_level text, -- 'Low', 'Medium', 'High', 'Very High'
  total_hazards integer DEFAULT 0,
  hazards_controlled integer DEFAULT 0,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  
  CONSTRAINT valid_review_date CHECK (review_date >= assessment_date)
);

-- Indexes for performance
CREATE INDEX idx_risk_assessments_company ON risk_assessments(company_id);
CREATE INDEX idx_risk_assessments_site ON risk_assessments(site_id);
CREATE INDEX idx_risk_assessments_status ON risk_assessments(status);
CREATE INDEX idx_risk_assessments_template ON risk_assessments(template_type);
CREATE INDEX idx_risk_assessments_risk_level ON risk_assessments(highest_risk_level);
CREATE INDEX idx_risk_assessments_review_date ON risk_assessments(next_review_date);

-- RLS Policies
ALTER TABLE risk_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company's risk assessments"
  ON risk_assessments FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can create risk assessments for their company"
  ON risk_assessments FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update their company's risk assessments"
  ON risk_assessments FOR UPDATE
  USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can delete their company's risk assessments"
  ON risk_assessments FOR DELETE
  USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_risk_assessments_updated_at
  BEFORE UPDATE ON risk_assessments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON risk_assessments TO authenticated;
