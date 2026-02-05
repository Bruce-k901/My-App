-- Migration: Create Base Doughs and Lamination Styles tables
-- Purpose: New data model for production setup wizard
-- Hierarchy: Base Dough → Lamination Styles → Products

-- ============================================================================
-- BASE DOUGHS TABLE
-- ============================================================================
-- Represents the dough you mix (e.g., "Sweet Pastry Dough", "Sourdough Base")
-- Each base dough has a recipe and a lead time (days before delivery to mix)

CREATE TABLE IF NOT EXISTS planly_base_doughs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  recipe_id UUID REFERENCES stockly.recipes(id) ON DELETE SET NULL,
  mix_lead_days INTEGER NOT NULL DEFAULT 0,
  -- For non-laminated products: batch-based calculation
  batch_size_kg DECIMAL(10,3),
  units_per_batch INTEGER,
  -- Metadata
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  -- Constraints
  UNIQUE(site_id, name)
);

-- Index for common queries
CREATE INDEX idx_planly_base_doughs_site_id ON planly_base_doughs(site_id);
CREATE INDEX idx_planly_base_doughs_recipe_id ON planly_base_doughs(recipe_id);

-- ============================================================================
-- LAMINATION STYLES TABLE
-- ============================================================================
-- Represents how you laminate/sheet the dough (e.g., "Buns", "Swirls")
-- Each style has its own recipe (includes butter) and products-per-sheet

CREATE TABLE IF NOT EXISTS planly_lamination_styles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_dough_id UUID NOT NULL REFERENCES planly_base_doughs(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  recipe_id UUID REFERENCES stockly.recipes(id) ON DELETE SET NULL,
  products_per_sheet INTEGER NOT NULL DEFAULT 1,
  laminate_lead_days INTEGER NOT NULL DEFAULT 1,
  -- Metadata
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  -- Constraints
  UNIQUE(base_dough_id, name)
);

-- Index for common queries
CREATE INDEX idx_planly_lamination_styles_base_dough_id ON planly_lamination_styles(base_dough_id);
CREATE INDEX idx_planly_lamination_styles_recipe_id ON planly_lamination_styles(recipe_id);

-- ============================================================================
-- ADD COLUMNS TO PLANLY_PRODUCTS
-- ============================================================================
-- Products link to either:
-- 1. lamination_style_id (for laminated products like croissants)
-- 2. base_dough_id (for non-laminated products like bread)

ALTER TABLE planly_products
  ADD COLUMN IF NOT EXISTS base_dough_id UUID REFERENCES planly_base_doughs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS lamination_style_id UUID REFERENCES planly_lamination_styles(id) ON DELETE SET NULL;

-- Indexes for the new FK columns
CREATE INDEX IF NOT EXISTS idx_planly_products_base_dough_id ON planly_products(base_dough_id);
CREATE INDEX IF NOT EXISTS idx_planly_products_lamination_style_id ON planly_products(lamination_style_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE planly_base_doughs ENABLE ROW LEVEL SECURITY;
ALTER TABLE planly_lamination_styles ENABLE ROW LEVEL SECURITY;

-- Base Doughs: Users can access base doughs for sites they belong to
CREATE POLICY "Users can view base doughs for their sites"
  ON planly_base_doughs FOR SELECT
  USING (
    site_id IN (
      SELECT site_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert base doughs for their sites"
  ON planly_base_doughs FOR INSERT
  WITH CHECK (
    site_id IN (
      SELECT site_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update base doughs for their sites"
  ON planly_base_doughs FOR UPDATE
  USING (
    site_id IN (
      SELECT site_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete base doughs for their sites"
  ON planly_base_doughs FOR DELETE
  USING (
    site_id IN (
      SELECT site_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Lamination Styles: Access through base_dough's site
CREATE POLICY "Users can view lamination styles for their sites"
  ON planly_lamination_styles FOR SELECT
  USING (
    base_dough_id IN (
      SELECT id FROM planly_base_doughs
      WHERE site_id IN (SELECT site_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can insert lamination styles for their sites"
  ON planly_lamination_styles FOR INSERT
  WITH CHECK (
    base_dough_id IN (
      SELECT id FROM planly_base_doughs
      WHERE site_id IN (SELECT site_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can update lamination styles for their sites"
  ON planly_lamination_styles FOR UPDATE
  USING (
    base_dough_id IN (
      SELECT id FROM planly_base_doughs
      WHERE site_id IN (SELECT site_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can delete lamination styles for their sites"
  ON planly_lamination_styles FOR DELETE
  USING (
    base_dough_id IN (
      SELECT id FROM planly_base_doughs
      WHERE site_id IN (SELECT site_id FROM profiles WHERE id = auth.uid())
    )
  );

-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_planly_base_doughs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_planly_base_doughs_updated_at
  BEFORE UPDATE ON planly_base_doughs
  FOR EACH ROW
  EXECUTE FUNCTION update_planly_base_doughs_updated_at();

CREATE OR REPLACE FUNCTION update_planly_lamination_styles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_planly_lamination_styles_updated_at
  BEFORE UPDATE ON planly_lamination_styles
  FOR EACH ROW
  EXECUTE FUNCTION update_planly_lamination_styles_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE planly_base_doughs IS 'Base dough configurations for production planning. Each represents a dough type that gets mixed.';
COMMENT ON COLUMN planly_base_doughs.mix_lead_days IS 'Days before delivery that this dough should be mixed. E.g., 2 = mix 2 days before delivery.';
COMMENT ON COLUMN planly_base_doughs.batch_size_kg IS 'For non-laminated products: weight of one batch in kg.';
COMMENT ON COLUMN planly_base_doughs.units_per_batch IS 'For non-laminated products: number of products from one batch.';

COMMENT ON TABLE planly_lamination_styles IS 'Lamination styles for base doughs. Each style has its own recipe and yield.';
COMMENT ON COLUMN planly_lamination_styles.products_per_sheet IS 'How many products can be made from one laminated sheet.';
COMMENT ON COLUMN planly_lamination_styles.laminate_lead_days IS 'Days before delivery that lamination should happen. Usually 1 (day before).';
