-- Create Ingredients Library Table with RLS
-- This migration creates the ingredients_library table for managing food ingredients

-- Drop table if exists for clean migration
DROP TABLE IF EXISTS ingredients_library CASCADE;

CREATE TABLE ingredients_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  ingredient_name TEXT NOT NULL,
  category TEXT,
  allergens TEXT[],
  prep_state TEXT,
  unit TEXT,
  unit_cost NUMERIC,
  supplier TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_ingredients_library_company_id ON ingredients_library(company_id);
CREATE INDEX idx_ingredients_library_ingredient_name ON ingredients_library(ingredient_name);
CREATE INDEX idx_ingredients_library_category ON ingredients_library(category);

-- RLS Policies
ALTER TABLE ingredients_library ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view ingredients from their own company" ON ingredients_library;
CREATE POLICY "Users can view ingredients from their own company"
  ON ingredients_library FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert ingredients for their own company" ON ingredients_library;
CREATE POLICY "Users can insert ingredients for their own company"
  ON ingredients_library FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can update ingredients from their own company" ON ingredients_library;
CREATE POLICY "Users can update ingredients from their own company"
  ON ingredients_library FOR UPDATE
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete ingredients from their own company" ON ingredients_library;
CREATE POLICY "Users can delete ingredients from their own company"
  ON ingredients_library FOR DELETE
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Updated at trigger
DROP TRIGGER IF EXISTS update_ingredients_library_updated_at ON ingredients_library;
CREATE TRIGGER update_ingredients_library_updated_at
  BEFORE UPDATE ON ingredients_library
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ingredients_library TO authenticated;

