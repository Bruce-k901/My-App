-- Create SOP Library Tables (Idempotent Version)
-- This migration creates PPE, Chemicals, Drinks, and Disposables libraries
-- Can be run multiple times safely

-- ============================================================================
-- 1. PPE_LIBRARY
-- ============================================================================
CREATE TABLE IF NOT EXISTS ppe_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  category TEXT CHECK (category IN ('Hand Protection', 'Eye Protection', 'Respiratory', 'Body Protection', 'Foot Protection')),
  standard_compliance TEXT,
  size_options TEXT[],
  supplier TEXT,
  unit_cost NUMERIC,
  reorder_level INTEGER,
  linked_risks TEXT[],
  cleaning_replacement_interval TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ppe_library_company_id ON ppe_library(company_id);
CREATE INDEX IF NOT EXISTS idx_ppe_library_category ON ppe_library(category);
CREATE INDEX IF NOT EXISTS idx_ppe_library_item_name ON ppe_library(item_name);

-- RLS Policies for PPE Library
ALTER TABLE ppe_library ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view PPE from their own company" ON ppe_library;
CREATE POLICY "Users can view PPE from their own company"
  ON ppe_library FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert PPE for their own company" ON ppe_library;
CREATE POLICY "Users can insert PPE for their own company"
  ON ppe_library FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can update PPE from their own company" ON ppe_library;
CREATE POLICY "Users can update PPE from their own company"
  ON ppe_library FOR UPDATE
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete PPE from their own company" ON ppe_library;
CREATE POLICY "Users can delete PPE from their own company"
  ON ppe_library FOR DELETE
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- ============================================================================
-- 2. CHEMICALS_LIBRARY
-- ============================================================================
CREATE TABLE IF NOT EXISTS chemicals_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  manufacturer TEXT,
  use_case TEXT,
  hazard_symbols TEXT[],
  dilution_ratio TEXT,
  contact_time TEXT,
  required_ppe TEXT[],
  coshh_sheet_url TEXT,
  supplier TEXT,
  unit_cost NUMERIC,
  pack_size TEXT,
  storage_requirements TEXT,
  linked_risks TEXT[],
  first_aid_instructions TEXT,
  environmental_info TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chemicals_library_company_id ON chemicals_library(company_id);
CREATE INDEX IF NOT EXISTS idx_chemicals_library_product_name ON chemicals_library(product_name);
CREATE INDEX IF NOT EXISTS idx_chemicals_library_use_case ON chemicals_library(use_case);

-- RLS Policies for Chemicals Library
ALTER TABLE chemicals_library ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view chemicals from their own company" ON chemicals_library;
CREATE POLICY "Users can view chemicals from their own company"
  ON chemicals_library FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert chemicals for their own company" ON chemicals_library;
CREATE POLICY "Users can insert chemicals for their own company"
  ON chemicals_library FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can update chemicals from their own company" ON chemicals_library;
CREATE POLICY "Users can update chemicals from their own company"
  ON chemicals_library FOR UPDATE
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete chemicals from their own company" ON chemicals_library;
CREATE POLICY "Users can delete chemicals from their own company"
  ON chemicals_library FOR DELETE
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- ============================================================================
-- 3. DRINKS_LIBRARY
-- ============================================================================
CREATE TABLE IF NOT EXISTS drinks_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  category TEXT CHECK (category IN ('Spirit', 'Liqueur', 'Mixer', 'Garnish', 'Bitters', 'Syrup', 'Fresh Produce')),
  sub_category TEXT,
  abv NUMERIC,
  allergens TEXT[],
  unit TEXT,
  unit_cost NUMERIC,
  supplier TEXT,
  pack_size TEXT,
  storage_type TEXT CHECK (storage_type IN ('Ambient', 'Chilled', 'Frozen', 'Bar Back')),
  shelf_life TEXT,
  prep_notes TEXT,
  pairing_suggestions TEXT[],
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_drinks_library_company_id ON drinks_library(company_id);
CREATE INDEX IF NOT EXISTS idx_drinks_library_category ON drinks_library(category);
CREATE INDEX IF NOT EXISTS idx_drinks_library_item_name ON drinks_library(item_name);

-- RLS Policies for Drinks Library
ALTER TABLE drinks_library ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view drinks from their own company" ON drinks_library;
CREATE POLICY "Users can view drinks from their own company"
  ON drinks_library FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert drinks for their own company" ON drinks_library;
CREATE POLICY "Users can insert drinks for their own company"
  ON drinks_library FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can update drinks from their own company" ON drinks_library;
CREATE POLICY "Users can update drinks from their own company"
  ON drinks_library FOR UPDATE
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete drinks from their own company" ON drinks_library;
CREATE POLICY "Users can delete drinks from their own company"
  ON drinks_library FOR DELETE
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- ============================================================================
-- 4. DISPOSABLES_LIBRARY
-- ============================================================================
CREATE TABLE IF NOT EXISTS disposables_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  category TEXT CHECK (category IN ('Napkins', 'Stirrers', 'Straws', 'Picks', 'Coasters', 'Takeaway Packaging', 'Gloves', 'Aprons')),
  material TEXT,
  eco_friendly BOOLEAN DEFAULT false,
  color_finish TEXT,
  dimensions TEXT,
  supplier TEXT,
  unit_cost NUMERIC,
  pack_size INTEGER,
  unit_per_pack TEXT,
  reorder_level INTEGER,
  storage_location TEXT,
  usage_context TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_disposables_library_company_id ON disposables_library(company_id);
CREATE INDEX IF NOT EXISTS idx_disposables_library_category ON disposables_library(category);
CREATE INDEX IF NOT EXISTS idx_disposables_library_item_name ON disposables_library(item_name);

-- RLS Policies for Disposables Library
ALTER TABLE disposables_library ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view disposables from their own company" ON disposables_library;
CREATE POLICY "Users can view disposables from their own company"
  ON disposables_library FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert disposables for their own company" ON disposables_library;
CREATE POLICY "Users can insert disposables for their own company"
  ON disposables_library FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can update disposables from their own company" ON disposables_library;
CREATE POLICY "Users can update disposables from their own company"
  ON disposables_library FOR UPDATE
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete disposables from their own company" ON disposables_library;
CREATE POLICY "Users can delete disposables from their own company"
  ON disposables_library FOR DELETE
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- ============================================================================
-- Updated_at Triggers for All Tables
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_ppe_library_updated_at ON ppe_library;
CREATE TRIGGER update_ppe_library_updated_at
  BEFORE UPDATE ON ppe_library
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_chemicals_library_updated_at ON chemicals_library;
CREATE TRIGGER update_chemicals_library_updated_at
  BEFORE UPDATE ON chemicals_library
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_drinks_library_updated_at ON drinks_library;
CREATE TRIGGER update_drinks_library_updated_at
  BEFORE UPDATE ON drinks_library
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_disposables_library_updated_at ON disposables_library;
CREATE TRIGGER update_disposables_library_updated_at
  BEFORE UPDATE ON disposables_library
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ppe_library TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON chemicals_library TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON drinks_library TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON disposables_library TO authenticated;

