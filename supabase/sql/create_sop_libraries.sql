-- Create SOP Library Tables
-- This migration creates PPE, Chemicals, Drinks, and Disposables libraries

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

CREATE POLICY "Users can view PPE from their own company"
  ON ppe_library FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert PPE for their own company"
  ON ppe_library FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update PPE from their own company"
  ON ppe_library FOR UPDATE
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

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

CREATE POLICY "Users can view chemicals from their own company"
  ON chemicals_library FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert chemicals for their own company"
  ON chemicals_library FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update chemicals from their own company"
  ON chemicals_library FOR UPDATE
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

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

CREATE POLICY "Users can view drinks from their own company"
  ON drinks_library FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert drinks for their own company"
  ON drinks_library FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update drinks from their own company"
  ON drinks_library FOR UPDATE
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

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

CREATE POLICY "Users can view disposables from their own company"
  ON disposables_library FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert disposables for their own company"
  ON disposables_library FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update disposables from their own company"
  ON disposables_library FOR UPDATE
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

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

-- ============================================================================
-- Seed Data
-- ============================================================================

-- ============================================================================
-- SEED DATA FOR DEMO/TESTING
-- This data represents realistic UK hospitality products
-- Remove or modify before production deployment
-- ============================================================================

-- PPE Library Seed Data (15 items)
-- Skip if data already exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM ppe_library LIMIT 1) THEN
    INSERT INTO ppe_library (company_id, item_name, category, standard_compliance, size_options, supplier, unit_cost, reorder_level, linked_risks, cleaning_replacement_interval, notes)
    VALUES
  -- Hand Protection
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Blue Nitrile Gloves (powder-free)', 'Hand Protection', 'EN374', ARRAY['S', 'M', 'L', 'XL'], 'Safety Supplies Direct', 0.08, 1000, ARRAY['Chemical Contact', 'Cross Contamination'], 'Single use', '100 pairs per box'),
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Cut-Resistant Gloves (Level 5)', 'Hand Protection', 'EN388', ARRAY['M', 'L', 'XL'], 'Workwear Solutions', 4.50, 20, ARRAY['Cuts', 'Lacerations'], 'Weekly inspection', 'Reusable, machine washable'),
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Heat-Resistant Gloves (up to 250°C)', 'Hand Protection', 'EN407', ARRAY['One Size'], 'Kitchen Equipment Co', 8.99, 10, ARRAY['Burns', 'Scalds'], 'Monthly', 'Oven glove replacement'),
  
  -- Eye Protection
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Clear Safety Goggles', 'Eye Protection', 'EN166', ARRAY['One Size'], 'Safety Direct', 3.20, 20, ARRAY['Chemical Splash', 'Debris'], 'After each use', 'Anti-fog lenses'),
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Face Shield (full face)', 'Eye Protection', 'EN166', ARRAY['One Size'], 'Protective Gear Ltd', 6.50, 5, ARRAY['Chemical Splash', 'Impact'], 'Daily cleaning', 'Adjustable headband'),
  
  -- Respiratory
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'FFP2 Dust Masks', 'Respiratory', 'EN149', ARRAY['One Size'], 'Safety Supplies Direct', 0.45, 200, ARRAY['Dust', 'Particulates'], 'Single use', '50 per box'),
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Half-Face Respirator with Filters', 'Respiratory', 'EN140', ARRAY['M', 'L'], 'Professional Safety', 24.99, 5, ARRAY['Chemical Fumes', 'Vapours'], 'Replace filters monthly', 'Includes spare filters'),
  
  -- Body Protection
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Disposable Aprons (white)', 'Body Protection', 'Food Safe', ARRAY['One Size'], 'Cleanroom Supplies', 0.12, 500, ARRAY['Cross Contamination', 'Stain Protection'], 'Single use', 'Food grade approved'),
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Heavy Duty Rubber Apron', 'Body Protection', 'Chemical Resistant', ARRAY['M', 'L', 'XL'], 'Workwear Solutions', 12.50, 10, ARRAY['Chemical Splash', 'Wet Work'], 'Daily', 'PVC coated'),
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Hi-Vis Safety Vest', 'Body Protection', 'EN471', ARRAY['M', 'L', 'XL'], 'High Visibility Clothing', 4.20, 10, ARRAY['Visibility', 'Traffic'], 'Clean as needed', 'Reflective strips'),
  
  -- Foot Protection
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Non-Slip Kitchen Shoes (black)', 'Foot Protection', 'EN20347', ARRAY['36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46', '47'], 'Uniform Co', 24.99, 10, ARRAY['Slips', 'Falls'], 'Replace annually', 'Waterproof, easy clean'),
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Steel Toe Cap Boots', 'Foot Protection', 'EN20345', ARRAY['36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46', '47'], 'Work Boot Central', 45.00, 5, ARRAY['Impact', 'Crushing'], 'Replace every 2 years', 'Heavy duty, safety rated'),
  
  -- Head Protection
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Hair Nets (disposable)', 'Hand Protection', 'Food Safe', ARRAY['One Size'], 'Cleanroom Supplies', 0.05, 1000, ARRAY['Hair Contamination'], 'Single use', '100 per pack'),
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Bump Cap (lightweight)', 'Body Protection', 'EN812', ARRAY['Adjustable'], 'Safety Direct', 8.50, 10, ARRAY['Head Impact'], 'Clean as needed', 'Adjustable fit'),
  
  -- Hearing Protection
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Foam Ear Plugs (SNR 37dB)', 'Respiratory', 'EN352-2', ARRAY['One Size'], 'Safety Supplies Direct', 0.15, 500, ARRAY['Noise', 'Hearing Damage'], 'Single use', '50 pairs per pack');
  END IF;
END $$;

-- Chemicals Library Seed Data (20 items)
-- Skip if data already exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM chemicals_library LIMIT 1) THEN
    INSERT INTO chemicals_library (company_id, product_name, manufacturer, use_case, hazard_symbols, dilution_ratio, contact_time, required_ppe, supplier, unit_cost, pack_size, storage_requirements, linked_risks, first_aid_instructions, environmental_info, notes)
    VALUES
  -- Sanitizers
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Selden Spray & Wipe', 'Selden Chemicals', 'Food Contact Surface', ARRAY['Irritant'], 'Ready to use', '30 seconds', ARRAY['Blue Nitrile Gloves (powder-free)'], 'Cleaning Supplies UK', 12.50, '5L', 'Cool, dry place', ARRAY['Skin irritation'], 'Wash with water. Seek medical advice if irritation persists.', 'Dispose to sewer', 'pH neutral'),
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Milton Sterilising Fluid', 'Milton', 'Sanitizer', ARRAY['Corrosive'], '1:80 dilution', '15 minutes', ARRAY['Blue Nitrile Gloves (powder-free)', 'Clear Safety Goggles'], 'Medical Supplies Direct', 18.99, '5L', 'Below 25°C', ARRAY['Skin burns', 'Eye damage'], 'Flush with water for 15 minutes. Seek medical attention.', 'Dilute before disposal', 'Baby bottle steriliser strength'),
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Diversey Suma Bac D10', 'Diversey', 'Sanitizer', ARRAY[]::TEXT[], 'Ready to use', '5 minutes', ARRAY['Blue Nitrile Gloves (powder-free)'], 'Hygiene Direct', 8.45, '1.5L', 'Room temperature', ARRAY[]::TEXT[], 'Seek medical attention if swallowed', 'Dilute before disposal', 'Food grade approved'),
  
  -- Degreasers
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Heavy Duty Kitchen Degreaser', 'PowerClean', 'Heavy Duty Degreaser', ARRAY['Corrosive', 'Irritant'], '1:20 dilution', '10 minutes', ARRAY['Blue Nitrile Gloves (powder-free)', 'Clear Safety Goggles', 'Heavy Duty Rubber Apron'], 'Industrial Cleaning', 15.99, '5L', 'Below 25°C', ARRAY['Skin irritation', 'Eye damage'], 'Flush eyes/skin with water for 15 minutes', 'Hazardous waste', 'Not for food surfaces'),
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Oven Cleaner (Caustic)', 'Mr Muscle', 'Degreaser', ARRAY['Corrosive'], 'Ready to use', '10 minutes', ARRAY['Blue Nitrile Gloves (powder-free)', 'Clear Safety Goggles', 'Heavy Duty Rubber Apron'], 'Cleaning Supplies UK', 6.50, '750ml', 'Below 25°C', ARRAY['Skin burns', 'Eye damage'], 'Flush with water immediately. Seek medical attention.', 'Hazardous waste', 'Caustic soda based'),
  
  -- Floor Cleaners
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Neutral Floor Cleaner', 'Hyper Hygiene', 'Floor Cleaner', ARRAY[]::TEXT[], '1:40 dilution', '5 minutes', ARRAY['Blue Nitrile Gloves (powder-free)'], 'Commercial Cleaning', 9.99, '5L', 'Room temperature', ARRAY[]::TEXT[], 'Wash with water if contact', 'Dispose to sewer', 'pH neutral'),
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Heavy Traffic Floor Maintainer', 'TASKI', 'Floor Cleaner', ARRAY['Irritant'], '1:30 dilution', '10 minutes', ARRAY['Blue Nitrile Gloves (powder-free)'], 'Industrial Cleaning', 14.50, '5L', 'Room temperature', ARRAY['Skin irritation'], 'Wash with water', 'Dilute before disposal', 'High performance'),
  
  -- Glass/Surface
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Glass & Mirror Cleaner', 'Sprayway', 'Glass Cleaner', ARRAY[]::TEXT[], 'Ready to use', '2 minutes', ARRAY[]::TEXT[], 'Cleaning Supplies UK', 2.99, '750ml trigger', 'Room temperature', ARRAY[]::TEXT[], 'Wash with water', 'Dispose to sewer', 'Streak-free formula'),
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Stainless Steel Polish', '3M', 'Surface Polish', ARRAY['Flammable'], 'Ready to use', '1 minute', ARRAY['Blue Nitrile Gloves (powder-free)'], 'Industrial Supplies', 4.50, '400ml aerosol', 'Below 25°C', ARRAY['Fire hazard'], 'Keep away from sources of ignition', 'Hazardous waste', 'Aerosol propellant'),
  
  -- Washroom
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Toilet Bowl Cleaner (Acidic)', 'Bleach Direct', 'Washroom Cleaner', ARRAY['Corrosive', 'Irritant'], 'Ready to use', '15 minutes', ARRAY['Blue Nitrile Gloves (powder-free)', 'Clear Safety Goggles'], 'Cleaning Supplies UK', 3.45, '1L', 'Below 25°C', ARRAY['Skin burns', 'Eye damage'], 'Flush with water. Do not mix with bleach.', 'Dilute before disposal', 'Hydrochloric acid based'),
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Limescale Remover', 'HG', 'Washroom Cleaner', ARRAY['Corrosive'], 'Ready to use', '10 minutes', ARRAY['Blue Nitrile Gloves (powder-free)', 'Clear Safety Goggles'], 'Industrial Cleaning', 4.20, '750ml', 'Below 25°C', ARRAY['Skin burns'], 'Flush with water', 'Dilute before disposal', 'Citric acid formula'),
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Air Freshener (Citrus)', 'Gel-Air', 'Air Freshener', ARRAY['Flammable'], 'Ready to use', 'Continuous', ARRAY[]::TEXT[], 'Fragrance UK', 2.50, '400ml aerosol', 'Room temperature', ARRAY['Fire hazard'], 'Keep away from sources of ignition', 'Recycle aerosol', 'Citrus scent'),
  
  -- Laundry
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Biological Laundry Detergent', 'Diversey', 'Laundry', ARRAY['Irritant'], 'Dose per load', 'Standard cycle', ARRAY['Blue Nitrile Gloves (powder-free)'], 'Laundry Supplies', 16.99, '5L', 'Room temperature', ARRAY['Skin irritation'], 'Wash with water', 'Dispose to sewer', 'Enzyme-based'),
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Fabric Softener', 'P&G', 'Laundry', ARRAY[]::TEXT[], 'Dose per load', 'Standard cycle', ARRAY[]::TEXT[], 'Laundry Supplies', 12.50, '5L', 'Room temperature', ARRAY[]::TEXT[], 'Wash with water', 'Dispose to sewer', 'Conditioning formula'),
  
  -- Specialist
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Dishwasher Rinse Aid', 'Finish', 'Dishwasher', ARRAY['Irritant'], 'Auto-dose', 'Standard cycle', ARRAY['Blue Nitrile Gloves (powder-free)'], 'Restaurant Supplies', 22.50, '5L', 'Room temperature', ARRAY['Skin irritation'], 'Wash with water', 'Dispose to sewer', 'Automated dispensing'),
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Machine Dishwash Detergent', 'TASKI', 'Dishwasher', ARRAY['Corrosive'], 'Auto-dose', 'Standard cycle', ARRAY['Blue Nitrile Gloves (powder-free)', 'Clear Safety Goggles'], 'Restaurant Supplies', 28.99, '5L', 'Below 25°C', ARRAY['Skin burns', 'Eye damage'], 'Flush with water', 'Dilute before disposal', 'High pH formula'),
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Bin Sanitiser & Deodoriser', 'Zoflora', 'Bin Deodoriser', ARRAY[]::TEXT[], '1:10 dilution', 'Spray as needed', ARRAY['Blue Nitrile Gloves (powder-free)'], 'Cleaning Supplies UK', 11.99, '5L', 'Room temperature', ARRAY[]::TEXT[], 'Wash with water', 'Dispose to sewer', 'Concentrated solution'),
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Fly & Wasp Killer', 'Raid', 'Pest Control', ARRAY['Toxic', 'Flammable'], 'Ready to use', 'Direct spray', ARRAY['Blue Nitrile Gloves (powder-free)'], 'Pest Control Direct', 5.99, '300ml aerosol', 'Below 25°C', ARRAY['Poisoning', 'Fire hazard'], 'Seek medical attention if inhaled', 'Hazardous waste', 'Pyrethroid based'),
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Deep Fat Fryer Cleaner', 'ProClean', 'Fryer Cleaner', ARRAY['Corrosive'], '1:5 dilution', 'Overnight soak', ARRAY['Blue Nitrile Gloves (powder-free)', 'Clear Safety Goggles', 'Heavy Duty Rubber Apron'], 'Kitchen Equipment Co', 19.99, '5L', 'Below 25°C', ARRAY['Skin burns', 'Eye damage'], 'Flush with water immediately', 'Hazardous waste', 'Caustic formula'),
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Coffee Machine Descaler', 'Urnex', 'Descaling', ARRAY['Irritant'], '1:4 dilution', '30 minutes', ARRAY['Blue Nitrile Gloves (powder-free)'], 'Coffee Supplies', 8.50, '1L', 'Room temperature', ARRAY['Skin irritation'], 'Wash with water', 'Dilute before disposal', 'Citric acid based');
  END IF;
END $$;

-- Drinks Library Seed Data (40 items)
-- Skip if data already exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM drinks_library LIMIT 1) THEN
    INSERT INTO drinks_library (company_id, item_name, category, sub_category, abv, allergens, unit, unit_cost, supplier, pack_size, storage_type, shelf_life, prep_notes, pairing_suggestions, notes)
    VALUES
INSERT INTO drinks_library (company_id, item_name, category, sub_category, abv, allergens, unit, unit_cost, supplier, pack_size, storage_type, shelf_life, prep_notes, pairing_suggestions, notes)
VALUES
  -- Spirits (10 items)
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Hendricks Gin', 'Spirit', 'Gin', 41.4, ARRAY['Sulphites'], 'bottle', 28.50, 'Spirit Merchants', '70cl', 'Bar Back', 'Unopened: indefinite', 'Serve with cucumber, not lime', ARRAY['Tonic Water', 'Soda Water'], 'Premium gin'),
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Gordons London Dry Gin', 'Spirit', 'Gin', 37.5, ARRAY['Sulphites'], 'bottle', 16.99, 'Spirit Merchants', '70cl', 'Bar Back', 'Unopened: indefinite', 'Classic English gin', ARRAY['Tonic Water', 'Lemon'], 'Budget option'),
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Tanqueray No. 10', 'Spirit', 'Gin', 47.3, ARRAY['Sulphites'], 'bottle', 32.00, 'Spirit Merchants', '70cl', 'Bar Back', 'Unopened: indefinite', 'Serve with grapefruit peel', ARRAY['Tonic Water'], 'Premium London dry'),
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Grey Goose Vodka', 'Spirit', 'Vodka', 40.0, ARRAY[]::TEXT[], 'bottle', 35.00, 'Spirit Merchants', '70cl', 'Bar Back', 'Unopened: indefinite', 'Serve chilled or straight', ARRAY['Orange Juice', 'Soda Water'], 'French premium'),
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Smirnoff Red Vodka', 'Spirit', 'Vodka', 37.5, ARRAY[]::TEXT[], 'bottle', 16.50, 'Spirit Merchants', '70cl', 'Bar Back', 'Unopened: indefinite', 'Classic Russian vodka', ARRAY['Orange Juice', 'Cranberry Juice'], 'Budget option'),
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Bacardi White Rum', 'Spirit', 'Rum', 37.5, ARRAY[]::TEXT[], 'bottle', 15.99, 'Spirit Merchants', '70cl', 'Bar Back', 'Unopened: indefinite', 'Most versatile rum', ARRAY['Coke', 'Lime', 'Mint'], 'White rum'),
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Captain Morgan Spiced Rum', 'Spirit', 'Rum', 35.0, ARRAY[]::TEXT[], 'bottle', 17.50, 'Spirit Merchants', '70cl', 'Bar Back', 'Unopened: indefinite', 'Spiced flavour', ARRAY['Coke', 'Ginger Beer'], 'Spiced rum'),
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Havana Club 7 Year', 'Spirit', 'Rum', 40.0, ARRAY[]::TEXT[], 'bottle', 22.00, 'Spirit Merchants', '70cl', 'Bar Back', 'Unopened: indefinite', 'Aged Cuban rum', ARRAY['Neat', 'Old Fashioned'], 'Dark rum'),
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Johnnie Walker Black Label', 'Spirit', 'Whisky', 40.0, ARRAY[]::TEXT[], 'bottle', 26.50, 'Spirit Merchants', '70cl', 'Bar Back', 'Unopened: indefinite', 'Serve with ice or neat', ARRAY['Neat', 'Old Fashioned'], 'Blended Scotch'),
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Jack Daniels', 'Spirit', 'Whisky', 40.0, ARRAY[]::TEXT[], 'bottle', 24.00, 'Spirit Merchants', '70cl', 'Bar Back', 'Unopened: indefinite', 'American whiskey', ARRAY['Coke', 'Neat'], 'Tennessee whiskey'),
  
  -- Liqueurs (6 items)
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Cointreau', 'Liqueur', 'Orange Liqueur', 40.0, ARRAY[]::TEXT[], 'bottle', 24.50, 'Spirit Merchants', '70cl', 'Bar Back', 'Unopened: indefinite', 'Orange liqueur', ARRAY['Margarita', 'Cosmopolitan'], 'Triple sec'),
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Aperol', 'Liqueur', 'Aperitif', 11.0, ARRAY[]::TEXT[], 'bottle', 14.99, 'Spirit Merchants', '70cl', 'Bar Back', 'Unopened: indefinite', 'Serve with prosecco', ARRAY['Prosecco', 'Soda Water'], 'Italian aperitif'),
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Campari', 'Liqueur', 'Aperitif', 25.0, ARRAY[]::TEXT[], 'bottle', 18.50, 'Spirit Merchants', '70cl', 'Bar Back', 'Unopened: indefinite', 'Bitter aperitif', ARRAY['Negroni', 'American'], 'Italian bitter'),
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Baileys Irish Cream', 'Liqueur', 'Cream Liqueur', 17.0, ARRAY['Milk'], 'bottle', 16.00, 'Spirit Merchants', '70cl', 'Bar Back', 'Opened: refrigerate, use within 6 months', 'Irish cream', ARRAY['Neat', 'Over Ice'], 'Dairy cream liqueur'),
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Kahlúa Coffee Liqueur', 'Liqueur', 'Coffee Liqueur', 20.0, ARRAY[]::TEXT[], 'bottle', 15.50, 'Spirit Merchants', '70cl', 'Bar Back', 'Unopened: indefinite', 'Coffee flavoured', ARRAY['White Russian', 'Espresso Martini'], 'Mexican coffee liqueur'),
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Disaronno Amaretto', 'Liqueur', 'Almond Liqueur', 28.0, ARRAY['Nuts'], 'bottle', 19.99, 'Spirit Merchants', '70cl', 'Bar Back', 'Unopened: indefinite', 'Almond flavoured', ARRAY['Neat', 'With Coke'], 'Italian amaretto'),
  
  -- Mixers (9 items)
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Fever-Tree Tonic Water', 'Mixer', 'Tonic', NULL, ARRAY[]::TEXT[], 'bottle', 0.85, 'Beverage Wholesale', '200ml', 'Ambient', 'Best before date', 'Serve chilled', ARRAY['Gin', 'Vodka'], 'Premium tonic'),
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Fever-Tree Ginger Beer', 'Mixer', 'Ginger Beer', NULL, ARRAY[]::TEXT[], 'bottle', 0.85, 'Beverage Wholesale', '200ml', 'Ambient', 'Best before date', 'Serve chilled', ARRAY['Dark Rum', 'Whisky'], 'Premium ginger beer'),
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Coca-Cola', 'Mixer', 'Cola', NULL, ARRAY[]::TEXT[], 'bottle', 0.60, 'Beverage Wholesale', '330ml', 'Ambient', 'Best before date', 'Serve chilled', ARRAY['Rum', 'Whisky'], 'Classic cola'),
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Sprite/7UP', 'Mixer', 'Lemon Lime', NULL, ARRAY[]::TEXT[], 'bottle', 0.60, 'Beverage Wholesale', '330ml', 'Ambient', 'Best before date', 'Serve chilled', ARRAY['Vodka', 'Gin'], 'Clear lemonade'),
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Fresh Orange Juice', 'Mixer', 'Juice', NULL, ARRAY[]::TEXT[], 'litre', 2.50, 'Produce Suppliers', '1L cartons', 'Chilled', '5 days chilled', 'Squeeze fresh daily', ARRAY['Vodka', 'Champagne'], 'Pure squeezed'),
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Cranberry Juice', 'Mixer', 'Juice', NULL, ARRAY[]::TEXT[], 'litre', 2.20, 'Beverage Wholesale', '1L cartons', 'Chilled', 'Best before date', 'Keep refrigerated', ARRAY['Vodka', 'Gin'], 'Pure juice'),
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Pineapple Juice', 'Mixer', 'Juice', NULL, ARRAY[]::TEXT[], 'litre', 2.40, 'Beverage Wholesale', '1L cartons', 'Chilled', 'Best before date', 'Keep refrigerated', ARRAY['Rum', 'Coconut'], 'Pure juice'),
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Lime Cordial', 'Mixer', 'Cordial', NULL, ARRAY[]::TEXT[], 'bottle', 3.50, 'Beverage Wholesale', '500ml', 'Ambient', 'Best before date', 'Sweetened lime', ARRAY['Gin', 'Rum'], 'Sweetened'),
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Grenadine Syrup', 'Mixer', 'Syrup', NULL, ARRAY[]::TEXT[], 'bottle', 4.20, 'Beverage Wholesale', '700ml', 'Ambient', 'Best before date', 'Pomegranate syrup', ARRAY['Tequila Sunrise', 'Shirley Temple'], 'Red syrup'),
  
  -- Fresh Garnishes (7 items)
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Fresh Limes', 'Garnish', 'Citrus', NULL, ARRAY[]::TEXT[], 'each', 0.30, 'Produce Suppliers', 'per unit', 'Chilled', '5-7 days', 'Cut fresh daily, discard discolored pieces', ARRAY['All cocktails'], 'Order twice weekly'),
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Fresh Lemons', 'Garnish', 'Citrus', NULL, ARRAY[]::TEXT[], 'each', 0.25, 'Produce Suppliers', 'per unit', 'Chilled', '7 days', 'Cut fresh daily', ARRAY['Gin', 'Vodka'], 'Order weekly'),
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Fresh Mint', 'Garnish', 'Herbs', NULL, ARRAY[]::TEXT[], 'bunch', 1.20, 'Fresh Herbs Co', 'per bunch', 'Chilled', '3-5 days', 'Store in water, use fresh leaves only', ARRAY['Mojito', 'Mint Julep'], 'Order fresh weekly'),
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Fresh Basil', 'Garnish', 'Herbs', NULL, ARRAY[]::TEXT[], 'bunch', 1.50, 'Fresh Herbs Co', 'per bunch', 'Chilled', '3-5 days', 'Store in water', ARRAY['Gin', 'Vodka'], 'Italian herb'),
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Fresh Cucumber', 'Garnish', 'Vegetable', NULL, ARRAY[]::TEXT[], 'each', 0.80, 'Produce Suppliers', 'per unit', 'Chilled', '7 days', 'Slice thinly for garnish', ARRAY['Gin', 'Vodka'], 'English cucumber'),
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Fresh Strawberries', 'Garnish', 'Fruit', NULL, ARRAY[]::TEXT[], 'punnet', 2.50, 'Produce Suppliers', '400g punnet', 'Chilled', '2 days', 'Slice for garnish, use same day', ARRAY['Champagne', 'Prosecco'], 'Order fresh daily'),
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Fresh Orange Slices', 'Garnish', 'Citrus', NULL, ARRAY[]::TEXT[], 'kg', 3.00, 'Produce Suppliers', 'per kg', 'Chilled', '2 days', 'Slice fresh daily', ARRAY['Gin', 'Vodka'], 'Order fresh'),
  
  -- Preserved Garnishes (3 items)
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Maraschino Cherries', 'Garnish', 'Preserved', NULL, ARRAY[]::TEXT[], 'jar', 4.50, 'Bar Accessories', 'per jar', 'Ambient', 'Best before date', 'Sweet cherries', ARRAY['Cocktails', 'Mocktails'], 'Classic garnish'),
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Cocktail Olives (pitted)', 'Garnish', 'Preserved', NULL, ARRAY[]::TEXT[], 'jar', 3.80, 'Bar Accessories', 'per jar', 'Ambient', 'Best before date', 'Spanish olives', ARRAY['Martini', 'Gin'], 'Green olives'),
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Pickled Onions', 'Garnish', 'Preserved', NULL, ARRAY[]::TEXT[], 'jar', 2.90, 'Bar Accessories', 'per jar', 'Ambient', 'Best before date', 'Cocktail onions', ARRAY['Gibson', 'Gin'], 'Pearl onions'),
  
  -- Bitters & Flavours (3 items)
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Angostura Aromatic Bitters', 'Bitters', 'Aromatic', NULL, ARRAY[]::TEXT[], 'bottle', 8.50, 'Bar Accessories', '200ml', 'Ambient', 'Best before date', 'Classic bitters', ARRAY['Old Fashioned', 'Manhattan'], 'Trinidad bitters'),
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Peychauds Bitters', 'Bitters', 'Creole', NULL, ARRAY[]::TEXT[], 'bottle', 9.20, 'Bar Accessories', '148ml', 'Ambient', 'Best before date', 'New Orleans bitters', ARRAY['Sazerac', 'Old Fashioned'], 'Red bitters'),
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Orange Bitters', 'Bitters', 'Citrus', NULL, ARRAY[]::TEXT[], 'bottle', 7.50, 'Bar Accessories', '100ml', 'Ambient', 'Best before date', 'Orange flavoured', ARRAY['Martini', 'Gin'], 'Citrus bitters'),
  
  -- Additional Mixers (2 items)
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Tonic Water', 'Mixer', 'Tonic', NULL, ARRAY[]::TEXT[], 'bottle', 0.85, 'Beverage Wholesale', '200ml', 'Ambient', 'Best before date', 'Serve chilled', ARRAY['Gin', 'Vodka'], 'Premium brand only');

-- Disposables Library Seed Data (25 items)
INSERT INTO disposables_library (company_id, item_name, category, material, eco_friendly, color_finish, dimensions, supplier, unit_cost, pack_size, unit_per_pack, reorder_level, storage_location, usage_context, notes)
VALUES
  -- Napkins (4 items)
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Cocktail Napkins (33x33cm, white)', 'Napkins', 'Paper', true, 'White', '33cm x 33cm', 'Hospitality Supplies', 4.50, 250, 'per 250', 1000, 'FOH station', 'Cocktail service', 'Premium quality'),
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Cocktail Napkins (33x33cm, black)', 'Napkins', 'Paper', true, 'Black', '33cm x 33cm', 'Hospitality Supplies', 5.20, 250, 'per 250', 1000, 'FOH station', 'Cocktail service', 'Black theme option'),
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Dinner Napkins (40x40cm, white)', 'Napkins', 'Paper', true, 'White', '40cm x 40cm', 'Hospitality Supplies', 6.80, 125, 'per 125', 500, 'FOH station', 'Dinner service', 'Larger format'),
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Branded Cocktail Napkins', 'Napkins', 'Paper', true, 'Custom', '33cm x 33cm', 'Branded Suppliers', 12.00, 250, 'per 250', 1000, 'FOH station', 'Branded service', 'Custom printed logo'),
  
  -- Stirrers & Picks (4 items)
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Bamboo Cocktail Stirrers (15cm)', 'Stirrers', 'Bamboo', true, 'Natural', '15cm length', 'Eco Products Ltd', 8.50, 1000, 'per 1000', 5000, 'Bar back', 'Cocktail service', 'Compostable'),
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Plastic Stirrers (clear)', 'Stirrers', 'Plastic', false, 'Clear', '12cm length', 'Plastic Supplies', 4.20, 1000, 'per 1000', 5000, 'Bar back', 'All beverage service', 'Budget option'),
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Bamboo Cocktail Picks (12cm)', 'Picks', 'Bamboo', true, 'Natural', '12cm length', 'Eco Products Ltd', 5.50, 500, 'per 500', 2000, 'Bar station', 'Garnish service', 'Single use'),
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Decorative Cocktail Picks', 'Picks', 'Plastic', false, 'Coloured', '10cm length', 'Bar Accessories', 6.80, 200, 'per 200', 1000, 'Bar station', 'Garnish service', 'Decorated end'),
  
  -- Straws (4 items)
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Paper Straws (6mm, black)', 'Straws', 'Paper', true, 'Black', '21cm x 6mm', 'Sustainable Supplies', 7.50, 250, 'per 250', 1000, 'Bar back', 'All beverage service', 'Compostable'),
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Paper Straws (8mm, wrapped)', 'Straws', 'Paper', true, 'Coloured wrapper', '21cm x 8mm', 'Sustainable Supplies', 8.20, 250, 'per 250', 1000, 'Bar back', 'All beverage service', 'Wider bore, decorative'),
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Bamboo Straws (reusable)', 'Straws', 'Bamboo', true, 'Natural', '21cm length', 'Eco Products Ltd', 15.00, 50, 'per 50', 200, 'Bar back', 'Reusable drinks', 'Dishwasher safe'),
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Metal Straws (stainless, reusable)', 'Straws', 'Metal', true, 'Stainless steel', '21cm length', 'Reusable Products', 22.00, 25, 'per 25', 100, 'Bar back', 'Reusable drinks', 'Includes cleaning brush'),
  
  -- Coasters (3 items)
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Cardboard Coasters (square)', 'Coasters', 'Cardboard', true, 'White', '9cm x 9cm', 'Hospitality Supplies', 12.50, 500, 'per 500', 2000, 'FOH station', 'Table service', 'Single use'),
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Cork Coasters (round)', 'Coasters', 'Cork', true, 'Natural', '9cm diameter', 'Sustainable Supplies', 18.00, 100, 'per 100', 500, 'FOH station', 'Reusable service', 'Washable'),
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Branded Coasters', 'Coasters', 'Cardboard', true, 'Custom print', '9cm x 9cm', 'Branded Suppliers', 45.00, 1000, 'per 1000', 5000, 'FOH station', 'Branded service', 'Custom printed'),
  
  -- Takeaway (5 items)
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Kraft Coffee Cups (8oz)', 'Takeaway Packaging', 'Paper', true, 'Kraft', '8oz capacity', 'Sustainable Supplies', 35.00, 1000, 'per 1000', 5000, 'Coffee station', 'Takeaway coffee', 'Compostable'),
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Coffee Cup Lids (8oz)', 'Takeaway Packaging', 'Plastic', false, 'Clear', '8oz fit', 'Plastic Supplies', 18.00, 1000, 'per 1000', 5000, 'Coffee station', 'Takeaway coffee', 'Snap-on lids'),
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Kraft Takeaway Bags (small)', 'Takeaway Packaging', 'Paper', true, 'Kraft', '30cm x 20cm', 'Sustainable Supplies', 12.00, 250, 'per 250', 1000, 'Counter', 'Takeaway orders', 'Recyclable'),
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Kraft Takeaway Bags (large)', 'Takeaway Packaging', 'Paper', true, 'Kraft', '40cm x 30cm', 'Sustainable Supplies', 16.00, 250, 'per 250', 1000, 'Counter', 'Takeaway orders', 'Larger size'),
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Clear Takeaway Containers (500ml)', 'Takeaway Packaging', 'Plastic', false, 'Clear', '500ml capacity', 'Plastic Supplies', 24.00, 500, 'per 500', 2000, 'Kitchen', 'Food takeaway', 'Microwave safe'),
  
  -- Service Items (5 items)
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Disposable Gloves (clear vinyl)', 'Gloves', 'Vinyl', false, 'Clear', 'One size fits all', 'Safety Supplies Direct', 4.50, 100, 'per 100', 500, 'Kitchen', 'Food handling', 'Food Safe'),
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Disposable Aprons (blue)', 'Aprons', 'Plastic', false, 'Blue', 'One size fits all', 'Cleanroom Supplies', 6.20, 100, 'per 100', 500, 'Kitchen', 'Food prep', 'Food Safe'),
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Bin Bags (black, 90L heavy duty)', 'Takeaway Packaging', 'Plastic', false, 'Black', '90L capacity', 'Waste Management', 18.00, 200, 'per 200', 1000, 'Storage', 'General waste', 'Heavy duty'),
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Food Storage Bags (resealable, 1L)', 'Takeaway Packaging', 'Plastic', false, 'Clear', '1L capacity', 'Kitchen Supplies', 5.50, 100, 'per 100', 500, 'Kitchen', 'Food storage', 'Resealable zip'),
  ('f99510bc-b290-47c6-8f12-282bea67bd91', 'Cling Film (300m commercial)', 'Takeaway Packaging', 'Plastic', false, 'Clear', '300m roll', 'Kitchen Supplies', 8.50, 1, 'per roll', 50, 'Kitchen', 'Food wrapping', 'Commercial grade');

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ppe_library TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON chemicals_library TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON drinks_library TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON disposables_library TO authenticated;

