-- Create Equipment Library Table with RLS
-- This migration creates the equipment_library table for managing commercial kitchen equipment

-- Drop table if exists for clean migration
DROP TABLE IF EXISTS equipment_library CASCADE;

CREATE TABLE equipment_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  equipment_name TEXT NOT NULL,
  category TEXT CHECK (category IN ('Large Equipment', 'Small Equipment', 'Pots & Pans', 'Utensils')),
  sub_category TEXT,
  location TEXT,
  manufacturer TEXT,
  model_serial TEXT,
  purchase_date DATE,
  colour_code TEXT CHECK (colour_code IN ('Red', 'Blue', 'Green', 'Yellow', 'Brown', 'White', 'N/A')),
  maintenance_schedule TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_equipment_library_company_id ON equipment_library(company_id);
CREATE INDEX idx_equipment_library_equipment_name ON equipment_library(equipment_name);
CREATE INDEX idx_equipment_library_category ON equipment_library(category);
CREATE INDEX idx_equipment_library_colour_code ON equipment_library(colour_code);

-- RLS Policies
ALTER TABLE equipment_library ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view equipment from their own company" ON equipment_library;
CREATE POLICY "Users can view equipment from their own company"
  ON equipment_library FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert equipment for their own company" ON equipment_library;
CREATE POLICY "Users can insert equipment for their own company"
  ON equipment_library FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can update equipment from their own company" ON equipment_library;
CREATE POLICY "Users can update equipment from their own company"
  ON equipment_library FOR UPDATE
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete equipment from their own company" ON equipment_library;
CREATE POLICY "Users can delete equipment from their own company"
  ON equipment_library FOR DELETE
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_equipment_library_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_equipment_library_updated_at ON equipment_library;
CREATE TRIGGER update_equipment_library_updated_at
  BEFORE UPDATE ON equipment_library
  FOR EACH ROW
  EXECUTE FUNCTION update_equipment_library_updated_at();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON equipment_library TO authenticated;

