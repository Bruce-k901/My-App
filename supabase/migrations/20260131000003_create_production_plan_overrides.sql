-- Table for manual dough quantity adjustments (product development, etc.)
CREATE TABLE IF NOT EXISTS planly_production_plan_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  production_date DATE NOT NULL,
  ingredient_name TEXT NOT NULL,
  override_quantity DECIMAL(10, 3) NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),

  UNIQUE(site_id, production_date, ingredient_name)
);

-- RLS Policies
ALTER TABLE planly_production_plan_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view overrides for their sites"
  ON planly_production_plan_overrides FOR SELECT
  USING (has_planly_site_access(site_id));

CREATE POLICY "Users can manage overrides for their sites"
  ON planly_production_plan_overrides FOR ALL
  USING (has_planly_site_access(site_id))
  WITH CHECK (has_planly_site_access(site_id));

-- Indexes
CREATE INDEX idx_production_overrides_site_date
  ON planly_production_plan_overrides(site_id, production_date);

-- Trigger for updated_at
CREATE TRIGGER update_production_overrides_updated_at
  BEFORE UPDATE ON planly_production_plan_overrides
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
