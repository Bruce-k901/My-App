-- ============================================
-- CREATE ADDITIONAL LIBRARIES FOR SOP SYSTEM
-- ============================================
-- This file creates: glassware_library, packaging_library, serving_equipment_library
-- with RLS policies, indexes, and triggers

-- ============================================
-- 1. GLASSWARE_LIBRARY
-- ============================================

DROP TABLE IF EXISTS glassware_library CASCADE;

CREATE TABLE glassware_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Beer', 'Wine', 'Cocktails', 'Hot Beverages', 'Soft Drinks', 'Spirits', 'Specialist')),
  capacity_ml INTEGER,
  material TEXT NOT NULL DEFAULT 'Glass',
  shape_style TEXT,
  recommended_for TEXT,
  supplier TEXT,
  unit_cost NUMERIC(10, 2),
  pack_size INTEGER DEFAULT 1,
  dishwasher_safe BOOLEAN DEFAULT true,
  breakage_rate TEXT CHECK (breakage_rate IN ('Low', 'Medium', 'High')),
  storage_location TEXT,
  reorder_level INTEGER DEFAULT 12,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_glassware_company_id ON glassware_library(company_id);
CREATE INDEX IF NOT EXISTS idx_glassware_category ON glassware_library(category);

CREATE OR REPLACE FUNCTION update_glassware_library_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_glassware_library_updated_at
  BEFORE UPDATE ON glassware_library
  FOR EACH ROW
  EXECUTE FUNCTION update_glassware_library_updated_at();

ALTER TABLE glassware_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view glassware from their own company"
  ON glassware_library FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create glassware for their own company"
  ON glassware_library FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update glassware from their own company"
  ON glassware_library FOR UPDATE
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete glassware from their own company"
  ON glassware_library FOR DELETE
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON glassware_library TO authenticated;

-- ============================================
-- 2. PACKAGING_LIBRARY
-- ============================================

DROP TABLE IF EXISTS packaging_library CASCADE;

CREATE TABLE packaging_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Food Containers', 'Drink Cups', 'Bags', 'Cutlery', 'Boxes', 'Lids', 'Napkins', 'Straws')),
  material TEXT NOT NULL,
  capacity_size TEXT,
  eco_friendly BOOLEAN DEFAULT false,
  compostable BOOLEAN DEFAULT false,
  recyclable BOOLEAN DEFAULT true,
  hot_food_suitable BOOLEAN DEFAULT false,
  microwave_safe BOOLEAN DEFAULT false,
  leak_proof BOOLEAN DEFAULT false,
  color_finish TEXT,
  supplier TEXT,
  unit_cost NUMERIC(10, 4),
  pack_size INTEGER DEFAULT 1,
  dimensions TEXT,
  usage_context TEXT,
  reorder_level INTEGER DEFAULT 100,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_packaging_company_id ON packaging_library(company_id);
CREATE INDEX IF NOT EXISTS idx_packaging_category ON packaging_library(category);

CREATE OR REPLACE FUNCTION update_packaging_library_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_packaging_library_updated_at
  BEFORE UPDATE ON packaging_library
  FOR EACH ROW
  EXECUTE FUNCTION update_packaging_library_updated_at();

ALTER TABLE packaging_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view packaging from their own company"
  ON packaging_library FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create packaging for their own company"
  ON packaging_library FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update packaging from their own company"
  ON packaging_library FOR UPDATE
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete packaging from their own company"
  ON packaging_library FOR DELETE
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON packaging_library TO authenticated;

-- ============================================
-- 3. SERVING_EQUIPMENT_LIBRARY
-- ============================================

DROP TABLE IF EXISTS serving_equipment_library CASCADE;

CREATE TABLE serving_equipment_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Platters', 'Bowls', 'Baskets', 'Trays', 'Stands', 'Boards', 'Dishes', 'Holders')),
  material TEXT NOT NULL,
  size_dimensions TEXT,
  shape TEXT CHECK (shape IN ('Round', 'Oval', 'Square', 'Rectangular', 'Irregular')),
  use_case TEXT,
  color_finish TEXT,
  dishwasher_safe BOOLEAN DEFAULT true,
  oven_safe BOOLEAN DEFAULT false,
  supplier TEXT,
  unit_cost NUMERIC(10, 2),
  breakage_rate TEXT CHECK (breakage_rate IN ('Low', 'Medium', 'High')),
  storage_location TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_serving_equipment_company_id ON serving_equipment_library(company_id);
CREATE INDEX IF NOT EXISTS idx_serving_equipment_category ON serving_equipment_library(category);

CREATE OR REPLACE FUNCTION update_serving_equipment_library_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_serving_equipment_library_updated_at
  BEFORE UPDATE ON serving_equipment_library
  FOR EACH ROW
  EXECUTE FUNCTION update_serving_equipment_library_updated_at();

ALTER TABLE serving_equipment_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view serving equipment from their own company"
  ON serving_equipment_library FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create serving equipment for their own company"
  ON serving_equipment_library FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update serving equipment from their own company"
  ON serving_equipment_library FOR UPDATE
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete serving equipment from their own company"
  ON serving_equipment_library FOR DELETE
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON serving_equipment_library TO authenticated;

