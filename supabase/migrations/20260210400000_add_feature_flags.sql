-- Create feature_flags table for controlling feature rollouts
CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  feature TEXT NOT NULL,
  enabled BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, feature)
);

-- Add RLS policies
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

-- Allow admins to read feature flags for their company
CREATE POLICY "Users can read feature flags for their company"
  ON feature_flags
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id
      FROM profiles
      WHERE id = auth.uid()
    )
  );

-- Allow service role to manage feature flags (for admin operations)
CREATE POLICY "Service role can manage feature flags"
  ON feature_flags
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Create index for faster lookups
CREATE INDEX idx_feature_flags_company_feature ON feature_flags(company_id, feature);

-- Add updated_at trigger
CREATE TRIGGER update_feature_flags_updated_at
  BEFORE UPDATE ON feature_flags
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE feature_flags IS 'Feature flags for controlling feature rollouts per company';
COMMENT ON COLUMN feature_flags.feature IS 'Feature identifier (e.g., offline_mode, new_dashboard)';
COMMENT ON COLUMN feature_flags.metadata IS 'Additional configuration for the feature';

-- Note: Pilot company ID will need to be added manually or via separate script
-- Example: INSERT INTO feature_flags (company_id, feature, enabled) VALUES ('PILOT_COMPANY_ID', 'offline_mode', true);
