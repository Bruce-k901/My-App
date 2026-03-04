-- Fire Risk Assessment support
-- Adds template_type='fire' support to the existing risk_assessments table.
-- All Fire RA data is stored in assessment_data JSONB using FireRAAssessmentData schema.

-- Composite index for Fire RA queries scoped to company
CREATE INDEX IF NOT EXISTS idx_risk_assessments_company_fire
  ON risk_assessments(company_id, template_type)
  WHERE template_type = 'fire';
