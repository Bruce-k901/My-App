-- Fire Risk Assessment support
-- Adds template_type='fire' support to the existing risk_assessments table.
-- All Fire RA data is stored in assessment_data JSONB using FireRAAssessmentData schema.

-- Update CHECK constraint to allow 'fire' template_type
-- The original constraint only allows ('general', 'coshh')
ALTER TABLE risk_assessments DROP CONSTRAINT IF EXISTS risk_assessments_template_type_check;
ALTER TABLE risk_assessments ADD CONSTRAINT risk_assessments_template_type_check
  CHECK (template_type IN ('general', 'coshh', 'fire'));

-- Update RLS policies to also allow platform admins to insert/update/delete
-- Platform admins have is_platform_admin = true and company_id = NULL in profiles
DROP POLICY IF EXISTS "Users can create risk assessments for their company" ON risk_assessments;
CREATE POLICY "Users can create risk assessments for their company"
  ON risk_assessments FOR INSERT
  WITH CHECK (
    company_id IN (SELECT p.company_id FROM profiles p WHERE p.id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_platform_admin = true)
  );

DROP POLICY IF EXISTS "Users can update their company's risk assessments" ON risk_assessments;
CREATE POLICY "Users can update their company's risk assessments"
  ON risk_assessments FOR UPDATE
  USING (
    company_id IN (SELECT p.company_id FROM profiles p WHERE p.id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_platform_admin = true)
  );

DROP POLICY IF EXISTS "Users can delete their company's risk assessments" ON risk_assessments;
CREATE POLICY "Users can delete their company's risk assessments"
  ON risk_assessments FOR DELETE
  USING (
    company_id IN (SELECT p.company_id FROM profiles p WHERE p.id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_platform_admin = true)
  );

DROP POLICY IF EXISTS "Users can view their company's risk assessments" ON risk_assessments;
CREATE POLICY "Users can view their company's risk assessments"
  ON risk_assessments FOR SELECT
  USING (
    company_id IN (SELECT p.company_id FROM profiles p WHERE p.id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_platform_admin = true)
  );

-- Composite index for Fire RA queries scoped to company
CREATE INDEX IF NOT EXISTS idx_risk_assessments_company_fire
  ON risk_assessments(company_id, template_type)
  WHERE template_type = 'fire';
