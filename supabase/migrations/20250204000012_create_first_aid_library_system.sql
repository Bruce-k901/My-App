-- Migration: 20250204000012_create_first_aid_library_system.sql
-- Description: Creates first aid supplies library and requirements tables
-- Creates dynamic first aid kit requirements based on venue type and staff count

-- ============================================================================
-- TABLE 1: first_aid_supplies_library - First Aid Supply Items
-- ============================================================================

-- Drop table if it exists (in case of previous failed migration)
DROP TABLE IF EXISTS first_aid_supplies_library CASCADE;

CREATE TABLE first_aid_supplies_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Item Information
  item_name TEXT NOT NULL,
  category TEXT CHECK (category IN ('Plasters', 'Dressings', 'Bandages', 'Equipment', 'Antiseptics', 'Burns Care', 'Eye Care', 'Other')),
  sub_category TEXT, -- e.g., 'Fabric', 'Blue Detectable', 'Sterile', etc.
  
  -- Compliance & Standards
  standard_compliance TEXT, -- e.g., 'BS 8599-1', 'HSE Approved'
  expiry_period_months INTEGER, -- How long items last before expiry
  
  -- Supplier & Cost
  supplier TEXT,
  unit_cost NUMERIC(10, 2),
  pack_size TEXT, -- e.g., 'Box of 20', 'Single item'
  
  -- Usage & Storage
  storage_requirements TEXT, -- e.g., 'Room temperature', 'Dry place'
  typical_usage TEXT, -- When/why this item is used
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for first_aid_supplies_library
CREATE INDEX IF NOT EXISTS idx_first_aid_supplies_library_company_id ON first_aid_supplies_library(company_id);
CREATE INDEX IF NOT EXISTS idx_first_aid_supplies_library_category ON first_aid_supplies_library(category);
CREATE INDEX IF NOT EXISTS idx_first_aid_supplies_library_item_name ON first_aid_supplies_library(item_name);

-- Updated_at trigger for first_aid_supplies_library
CREATE OR REPLACE FUNCTION update_first_aid_supplies_library_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_first_aid_supplies_library_updated_at ON first_aid_supplies_library;
CREATE TRIGGER trigger_update_first_aid_supplies_library_updated_at
  BEFORE UPDATE ON first_aid_supplies_library
  FOR EACH ROW
  EXECUTE FUNCTION update_first_aid_supplies_library_updated_at();

-- RLS Policies for first_aid_supplies_library
ALTER TABLE first_aid_supplies_library ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view first aid supplies from their own company" ON first_aid_supplies_library;
CREATE POLICY "Users can view first aid supplies from their own company"
  ON first_aid_supplies_library FOR SELECT
  USING (
    company_id IS NULL OR -- Global items (company_id = NULL)
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert first aid supplies for their own company" ON first_aid_supplies_library;
CREATE POLICY "Users can insert first aid supplies for their own company"
  ON first_aid_supplies_library FOR INSERT
  WITH CHECK (
    company_id IS NULL OR -- Global items
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update first aid supplies from their own company" ON first_aid_supplies_library;
CREATE POLICY "Users can update first aid supplies from their own company"
  ON first_aid_supplies_library FOR UPDATE
  USING (
    company_id IS NULL OR
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete first aid supplies from their own company" ON first_aid_supplies_library;
CREATE POLICY "Users can delete first aid supplies from their own company"
  ON first_aid_supplies_library FOR DELETE
  USING (
    company_id IS NULL OR
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

-- ============================================================================
-- TABLE 2: first_aid_requirements - Requirements based on venue type and staff count
-- ============================================================================

-- Drop table if it exists (in case of previous failed migration)
DROP TABLE IF EXISTS first_aid_requirements CASCADE;

CREATE TABLE first_aid_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Venue & Staff Context
  venue_type TEXT NOT NULL CHECK (venue_type IN ('low_risk', 'medium_risk', 'high_risk', 'kitchen')),
  min_staff_count INTEGER NOT NULL DEFAULT 1,
  max_staff_count INTEGER, -- NULL means no upper limit
  
  -- Requirement Details
  requirement_name TEXT NOT NULL,
  library_item_id UUID REFERENCES first_aid_supplies_library(id) ON DELETE SET NULL, -- Optional link to library
  required_quantity INTEGER NOT NULL DEFAULT 1,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_staff_range CHECK (max_staff_count IS NULL OR max_staff_count >= min_staff_count)
);

-- Indexes for first_aid_requirements
CREATE INDEX IF NOT EXISTS idx_first_aid_requirements_company_id ON first_aid_requirements(company_id);
CREATE INDEX IF NOT EXISTS idx_first_aid_requirements_venue_type ON first_aid_requirements(venue_type);
CREATE INDEX IF NOT EXISTS idx_first_aid_requirements_staff_count ON first_aid_requirements(min_staff_count, max_staff_count);
CREATE INDEX IF NOT EXISTS idx_first_aid_requirements_library_item ON first_aid_requirements(library_item_id);

-- Updated_at trigger for first_aid_requirements
CREATE OR REPLACE FUNCTION update_first_aid_requirements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_first_aid_requirements_updated_at ON first_aid_requirements;
CREATE TRIGGER trigger_update_first_aid_requirements_updated_at
  BEFORE UPDATE ON first_aid_requirements
  FOR EACH ROW
  EXECUTE FUNCTION update_first_aid_requirements_updated_at();

-- RLS Policies for first_aid_requirements
ALTER TABLE first_aid_requirements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view first aid requirements from their own company" ON first_aid_requirements;
CREATE POLICY "Users can view first aid requirements from their own company"
  ON first_aid_requirements FOR SELECT
  USING (
    company_id IS NULL OR -- Global requirements (company_id = NULL)
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert first aid requirements for their own company" ON first_aid_requirements;
CREATE POLICY "Users can insert first aid requirements for their own company"
  ON first_aid_requirements FOR INSERT
  WITH CHECK (
    company_id IS NULL OR -- Global requirements
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update first aid requirements from their own company" ON first_aid_requirements;
CREATE POLICY "Users can update first aid requirements from their own company"
  ON first_aid_requirements FOR UPDATE
  USING (
    company_id IS NULL OR
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete first aid requirements from their own company" ON first_aid_requirements;
CREATE POLICY "Users can delete first aid requirements from their own company"
  ON first_aid_requirements FOR DELETE
  USING (
    company_id IS NULL OR
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

-- ============================================================================
-- SEED DATA: Global first aid supplies (available to all companies)
-- ============================================================================

-- Insert common first aid supplies (company_id = NULL means global)
-- Only insert if item doesn't already exist (check by item_name and company_id)
-- Using DO block to insert items one by one to avoid column resolution issues
DO $$
BEGIN
  -- Fabric Plasters - Assorted Sizes
  IF NOT EXISTS (SELECT 1 FROM first_aid_supplies_library WHERE item_name = 'Fabric Plasters - Assorted Sizes' AND company_id IS NULL) THEN
    INSERT INTO first_aid_supplies_library (company_id, item_name, category, sub_category, standard_compliance, expiry_period_months, pack_size, typical_usage, notes)
    VALUES (NULL, 'Fabric Plasters - Assorted Sizes', 'Plasters', 'Fabric', 'BS 8599-1', 60, 'Box of 20', 'Small cuts and grazes', 'Standard adhesive plasters in various sizes');
  END IF;
  
  -- Blue Plasters for Food Handlers
  IF NOT EXISTS (SELECT 1 FROM first_aid_supplies_library WHERE item_name = 'Blue Plasters for Food Handlers' AND company_id IS NULL) THEN
    INSERT INTO first_aid_supplies_library (company_id, item_name, category, sub_category, standard_compliance, expiry_period_months, pack_size, typical_usage, notes)
    VALUES (NULL, 'Blue Plasters for Food Handlers', 'Plasters', 'Blue Detectable', 'BS 8599-1', 60, 'Box of 30', 'Food preparation areas - detectable in food', 'Metal detectable blue plasters for food handlers');
  END IF;
  
  -- Medium Sterile Dressings
  IF NOT EXISTS (SELECT 1 FROM first_aid_supplies_library WHERE item_name = 'Medium Sterile Dressings' AND company_id IS NULL) THEN
    INSERT INTO first_aid_supplies_library (company_id, item_name, category, sub_category, standard_compliance, expiry_period_months, pack_size, typical_usage, notes)
    VALUES (NULL, 'Medium Sterile Dressings', 'Dressings', 'Sterile', 'BS 8599-1', 60, 'Pack of 4', 'Larger wounds requiring sterile coverage', '10cm x 10cm sterile dressings');
  END IF;
  
  -- Large Sterile Dressings
  IF NOT EXISTS (SELECT 1 FROM first_aid_supplies_library WHERE item_name = 'Large Sterile Dressings' AND company_id IS NULL) THEN
    INSERT INTO first_aid_supplies_library (company_id, item_name, category, sub_category, standard_compliance, expiry_period_months, pack_size, typical_usage, notes)
    VALUES (NULL, 'Large Sterile Dressings', 'Dressings', 'Sterile', 'BS 8599-1', 60, 'Pack of 2', 'Large wounds or burns', '18cm x 18cm sterile dressings');
  END IF;
  
  -- Burns Dressings
  IF NOT EXISTS (SELECT 1 FROM first_aid_supplies_library WHERE item_name = 'Burns Dressings' AND company_id IS NULL) THEN
    INSERT INTO first_aid_supplies_library (company_id, item_name, category, sub_category, standard_compliance, expiry_period_months, pack_size, typical_usage, notes)
    VALUES (NULL, 'Burns Dressings', 'Burns Care', 'Specialist', 'BS 8599-1', 36, 'Pack of 2', 'Burns and scalds', 'Non-adherent burns dressings');
  END IF;
  
  -- Disposable Gloves - Medium
  IF NOT EXISTS (SELECT 1 FROM first_aid_supplies_library WHERE item_name = 'Disposable Gloves - Medium' AND company_id IS NULL) THEN
    INSERT INTO first_aid_supplies_library (company_id, item_name, category, sub_category, standard_compliance, expiry_period_months, pack_size, typical_usage, notes)
    VALUES (NULL, 'Disposable Gloves - Medium', 'Equipment', 'Disposable', 'BS 8599-1', 36, 'Box of 10', 'Infection control during first aid', 'Nitrile or vinyl disposable gloves');
  END IF;
  
  -- Antiseptic Wipes
  IF NOT EXISTS (SELECT 1 FROM first_aid_supplies_library WHERE item_name = 'Antiseptic Wipes' AND company_id IS NULL) THEN
    INSERT INTO first_aid_supplies_library (company_id, item_name, category, sub_category, standard_compliance, expiry_period_months, pack_size, typical_usage, notes)
    VALUES (NULL, 'Antiseptic Wipes', 'Antiseptics', 'Wipes', 'BS 8599-1', 36, 'Pack of 10', 'Wound cleaning and disinfection', 'Individually wrapped antiseptic wipes');
  END IF;
  
  -- Eye Wash Solution
  IF NOT EXISTS (SELECT 1 FROM first_aid_supplies_library WHERE item_name = 'Eye Wash Solution' AND company_id IS NULL) THEN
    INSERT INTO first_aid_supplies_library (company_id, item_name, category, sub_category, standard_compliance, expiry_period_months, pack_size, typical_usage, notes)
    VALUES (NULL, 'Eye Wash Solution', 'Eye Care', 'Solution', 'BS 8599-1', 24, 'Single bottle', 'Eye contamination or foreign body', 'Sterile eye wash solution');
  END IF;
  
  -- Scissors - Blunt
  IF NOT EXISTS (SELECT 1 FROM first_aid_supplies_library WHERE item_name = 'Scissors - Blunt' AND company_id IS NULL) THEN
    INSERT INTO first_aid_supplies_library (company_id, item_name, category, sub_category, standard_compliance, expiry_period_months, pack_size, typical_usage, notes)
    VALUES (NULL, 'Scissors - Blunt', 'Equipment', 'Blunt', 'BS 8599-1', NULL, 'Single item', 'Cutting dressings and bandages', 'Blunt-ended scissors for safety');
  END IF;
  
  -- Tweezers
  IF NOT EXISTS (SELECT 1 FROM first_aid_supplies_library WHERE item_name = 'Tweezers' AND company_id IS NULL) THEN
    INSERT INTO first_aid_supplies_library (company_id, item_name, category, sub_category, standard_compliance, expiry_period_months, pack_size, typical_usage, notes)
    VALUES (NULL, 'Tweezers', 'Equipment', 'Standard', 'BS 8599-1', NULL, 'Single item', 'Removing splinters or foreign bodies', 'Sterile tweezers');
  END IF;
  
  -- Finger Cots
  IF NOT EXISTS (SELECT 1 FROM first_aid_supplies_library WHERE item_name = 'Finger Cots' AND company_id IS NULL) THEN
    INSERT INTO first_aid_supplies_library (company_id, item_name, category, sub_category, standard_compliance, expiry_period_months, pack_size, typical_usage, notes)
    VALUES (NULL, 'Finger Cots', 'Bandages', 'Protective', 'BS 8599-1', 60, 'Box of 10', 'Finger protection for minor cuts', 'Individual finger protection');
  END IF;
  
  -- Burns Gel Sachets
  IF NOT EXISTS (SELECT 1 FROM first_aid_supplies_library WHERE item_name = 'Burns Gel Sachets' AND company_id IS NULL) THEN
    INSERT INTO first_aid_supplies_library (company_id, item_name, category, sub_category, standard_compliance, expiry_period_months, pack_size, typical_usage, notes)
    VALUES (NULL, 'Burns Gel Sachets', 'Burns Care', 'Gel', 'BS 8599-1', 36, 'Pack of 4', 'Immediate burn treatment', 'Cooling gel for burns and scalds');
  END IF;
END $$;

-- ============================================================================
-- SEED DATA: Global first aid requirements (based on HSE guidelines)
-- ============================================================================

-- Using DO block to insert requirements one by one to avoid column resolution issues
DO $$
BEGIN
  -- Low risk venues (front of house, admin) - Base requirements (1-9 staff)
  IF NOT EXISTS (SELECT 1 FROM first_aid_requirements WHERE venue_type = 'low_risk' AND min_staff_count = 1 AND max_staff_count = 9 AND requirement_name = 'Fabric Plasters - Assorted Sizes' AND company_id IS NULL) THEN
    INSERT INTO first_aid_requirements (company_id, venue_type, min_staff_count, max_staff_count, requirement_name, required_quantity, notes)
    VALUES (NULL, 'low_risk', 1, 9, 'Fabric Plasters - Assorted Sizes', 20, 'Basic first aid cover for low risk areas');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM first_aid_requirements WHERE venue_type = 'low_risk' AND min_staff_count = 1 AND max_staff_count = 9 AND requirement_name = 'Medium Sterile Dressings' AND company_id IS NULL) THEN
    INSERT INTO first_aid_requirements (company_id, venue_type, min_staff_count, max_staff_count, requirement_name, required_quantity, notes)
    VALUES (NULL, 'low_risk', 1, 9, 'Medium Sterile Dressings', 4, 'For larger wounds');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM first_aid_requirements WHERE venue_type = 'low_risk' AND min_staff_count = 1 AND max_staff_count = 9 AND requirement_name = 'Disposable Gloves - Medium' AND company_id IS NULL) THEN
    INSERT INTO first_aid_requirements (company_id, venue_type, min_staff_count, max_staff_count, requirement_name, required_quantity, notes)
    VALUES (NULL, 'low_risk', 1, 9, 'Disposable Gloves - Medium', 10, 'Infection control');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM first_aid_requirements WHERE venue_type = 'low_risk' AND min_staff_count = 1 AND max_staff_count = 9 AND requirement_name = 'Antiseptic Wipes' AND company_id IS NULL) THEN
    INSERT INTO first_aid_requirements (company_id, venue_type, min_staff_count, max_staff_count, requirement_name, required_quantity, notes)
    VALUES (NULL, 'low_risk', 1, 9, 'Antiseptic Wipes', 10, 'Wound cleaning');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM first_aid_requirements WHERE venue_type = 'low_risk' AND min_staff_count = 1 AND max_staff_count = 9 AND requirement_name = 'Scissors - Blunt' AND company_id IS NULL) THEN
    INSERT INTO first_aid_requirements (company_id, venue_type, min_staff_count, max_staff_count, requirement_name, required_quantity, notes)
    VALUES (NULL, 'low_risk', 1, 9, 'Scissors - Blunt', 1, 'For cutting dressings');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM first_aid_requirements WHERE venue_type = 'low_risk' AND min_staff_count = 1 AND max_staff_count = 9 AND requirement_name = 'Tweezers' AND company_id IS NULL) THEN
    INSERT INTO first_aid_requirements (company_id, venue_type, min_staff_count, max_staff_count, requirement_name, required_quantity, notes)
    VALUES (NULL, 'low_risk', 1, 9, 'Tweezers', 1, 'Removing splinters');
  END IF;

  -- Low risk venues - Scaled for 10-19 staff
  IF NOT EXISTS (SELECT 1 FROM first_aid_requirements WHERE venue_type = 'low_risk' AND min_staff_count = 10 AND max_staff_count = 19 AND requirement_name = 'Fabric Plasters - Assorted Sizes' AND company_id IS NULL) THEN
    INSERT INTO first_aid_requirements (company_id, venue_type, min_staff_count, max_staff_count, requirement_name, required_quantity, notes)
    VALUES (NULL, 'low_risk', 10, 19, 'Fabric Plasters - Assorted Sizes', 40, 'Double for 10+ staff');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM first_aid_requirements WHERE venue_type = 'low_risk' AND min_staff_count = 10 AND max_staff_count = 19 AND requirement_name = 'Medium Sterile Dressings' AND company_id IS NULL) THEN
    INSERT INTO first_aid_requirements (company_id, venue_type, min_staff_count, max_staff_count, requirement_name, required_quantity, notes)
    VALUES (NULL, 'low_risk', 10, 19, 'Medium Sterile Dressings', 8, 'Double for 10+ staff');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM first_aid_requirements WHERE venue_type = 'low_risk' AND min_staff_count = 10 AND max_staff_count = 19 AND requirement_name = 'Disposable Gloves - Medium' AND company_id IS NULL) THEN
    INSERT INTO first_aid_requirements (company_id, venue_type, min_staff_count, max_staff_count, requirement_name, required_quantity, notes)
    VALUES (NULL, 'low_risk', 10, 19, 'Disposable Gloves - Medium', 20, 'Double for 10+ staff');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM first_aid_requirements WHERE venue_type = 'low_risk' AND min_staff_count = 10 AND max_staff_count = 19 AND requirement_name = 'Antiseptic Wipes' AND company_id IS NULL) THEN
    INSERT INTO first_aid_requirements (company_id, venue_type, min_staff_count, max_staff_count, requirement_name, required_quantity, notes)
    VALUES (NULL, 'low_risk', 10, 19, 'Antiseptic Wipes', 20, 'Double for 10+ staff');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM first_aid_requirements WHERE venue_type = 'low_risk' AND min_staff_count = 10 AND max_staff_count = 19 AND requirement_name = 'Scissors - Blunt' AND company_id IS NULL) THEN
    INSERT INTO first_aid_requirements (company_id, venue_type, min_staff_count, max_staff_count, requirement_name, required_quantity, notes)
    VALUES (NULL, 'low_risk', 10, 19, 'Scissors - Blunt', 1, 'Single item regardless of staff count');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM first_aid_requirements WHERE venue_type = 'low_risk' AND min_staff_count = 10 AND max_staff_count = 19 AND requirement_name = 'Tweezers' AND company_id IS NULL) THEN
    INSERT INTO first_aid_requirements (company_id, venue_type, min_staff_count, max_staff_count, requirement_name, required_quantity, notes)
    VALUES (NULL, 'low_risk', 10, 19, 'Tweezers', 1, 'Single item regardless of staff count');
  END IF;

  -- Low risk venues - Scaled for 20+ staff
  IF NOT EXISTS (SELECT 1 FROM first_aid_requirements WHERE venue_type = 'low_risk' AND min_staff_count = 20 AND max_staff_count IS NULL AND requirement_name = 'Fabric Plasters - Assorted Sizes' AND company_id IS NULL) THEN
    INSERT INTO first_aid_requirements (company_id, venue_type, min_staff_count, max_staff_count, requirement_name, required_quantity, notes)
    VALUES (NULL, 'low_risk', 20, NULL, 'Fabric Plasters - Assorted Sizes', 60, 'Triple for 20+ staff');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM first_aid_requirements WHERE venue_type = 'low_risk' AND min_staff_count = 20 AND max_staff_count IS NULL AND requirement_name = 'Medium Sterile Dressings' AND company_id IS NULL) THEN
    INSERT INTO first_aid_requirements (company_id, venue_type, min_staff_count, max_staff_count, requirement_name, required_quantity, notes)
    VALUES (NULL, 'low_risk', 20, NULL, 'Medium Sterile Dressings', 12, 'Triple for 20+ staff');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM first_aid_requirements WHERE venue_type = 'low_risk' AND min_staff_count = 20 AND max_staff_count IS NULL AND requirement_name = 'Disposable Gloves - Medium' AND company_id IS NULL) THEN
    INSERT INTO first_aid_requirements (company_id, venue_type, min_staff_count, max_staff_count, requirement_name, required_quantity, notes)
    VALUES (NULL, 'low_risk', 20, NULL, 'Disposable Gloves - Medium', 30, 'Triple for 20+ staff');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM first_aid_requirements WHERE venue_type = 'low_risk' AND min_staff_count = 20 AND max_staff_count IS NULL AND requirement_name = 'Antiseptic Wipes' AND company_id IS NULL) THEN
    INSERT INTO first_aid_requirements (company_id, venue_type, min_staff_count, max_staff_count, requirement_name, required_quantity, notes)
    VALUES (NULL, 'low_risk', 20, NULL, 'Antiseptic Wipes', 30, 'Triple for 20+ staff');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM first_aid_requirements WHERE venue_type = 'low_risk' AND min_staff_count = 20 AND max_staff_count IS NULL AND requirement_name = 'Scissors - Blunt' AND company_id IS NULL) THEN
    INSERT INTO first_aid_requirements (company_id, venue_type, min_staff_count, max_staff_count, requirement_name, required_quantity, notes)
    VALUES (NULL, 'low_risk', 20, NULL, 'Scissors - Blunt', 1, 'Single item regardless of staff count');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM first_aid_requirements WHERE venue_type = 'low_risk' AND min_staff_count = 20 AND max_staff_count IS NULL AND requirement_name = 'Tweezers' AND company_id IS NULL) THEN
    INSERT INTO first_aid_requirements (company_id, venue_type, min_staff_count, max_staff_count, requirement_name, required_quantity, notes)
    VALUES (NULL, 'low_risk', 20, NULL, 'Tweezers', 1, 'Single item regardless of staff count');
  END IF;

  -- High risk venues (kitchens, bars with glassware) - Base requirements (1-9 staff)
  IF NOT EXISTS (SELECT 1 FROM first_aid_requirements WHERE venue_type = 'high_risk' AND min_staff_count = 1 AND max_staff_count = 9 AND requirement_name = 'Blue Plasters for Food Handlers' AND company_id IS NULL) THEN
    INSERT INTO first_aid_requirements (company_id, venue_type, min_staff_count, max_staff_count, requirement_name, required_quantity, notes)
    VALUES (NULL, 'high_risk', 1, 9, 'Blue Plasters for Food Handlers', 30, 'Detectable in food - required for kitchens');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM first_aid_requirements WHERE venue_type = 'high_risk' AND min_staff_count = 1 AND max_staff_count = 9 AND requirement_name = 'Fabric Plasters - Assorted Sizes' AND company_id IS NULL) THEN
    INSERT INTO first_aid_requirements (company_id, venue_type, min_staff_count, max_staff_count, requirement_name, required_quantity, notes)
    VALUES (NULL, 'high_risk', 1, 9, 'Fabric Plasters - Assorted Sizes', 20, 'For non-food areas');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM first_aid_requirements WHERE venue_type = 'high_risk' AND min_staff_count = 1 AND max_staff_count = 9 AND requirement_name = 'Medium Sterile Dressings' AND company_id IS NULL) THEN
    INSERT INTO first_aid_requirements (company_id, venue_type, min_staff_count, max_staff_count, requirement_name, required_quantity, notes)
    VALUES (NULL, 'high_risk', 1, 9, 'Medium Sterile Dressings', 4, 'For larger wounds');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM first_aid_requirements WHERE venue_type = 'high_risk' AND min_staff_count = 1 AND max_staff_count = 9 AND requirement_name = 'Large Sterile Dressings' AND company_id IS NULL) THEN
    INSERT INTO first_aid_requirements (company_id, venue_type, min_staff_count, max_staff_count, requirement_name, required_quantity, notes)
    VALUES (NULL, 'high_risk', 1, 9, 'Large Sterile Dressings', 2, 'For serious wounds');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM first_aid_requirements WHERE venue_type = 'high_risk' AND min_staff_count = 1 AND max_staff_count = 9 AND requirement_name = 'Burns Dressings' AND company_id IS NULL) THEN
    INSERT INTO first_aid_requirements (company_id, venue_type, min_staff_count, max_staff_count, requirement_name, required_quantity, notes)
    VALUES (NULL, 'high_risk', 1, 9, 'Burns Dressings', 2, 'Kitchen requirement');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM first_aid_requirements WHERE venue_type = 'high_risk' AND min_staff_count = 1 AND max_staff_count = 9 AND requirement_name = 'Burns Gel Sachets' AND company_id IS NULL) THEN
    INSERT INTO first_aid_requirements (company_id, venue_type, min_staff_count, max_staff_count, requirement_name, required_quantity, notes)
    VALUES (NULL, 'high_risk', 1, 9, 'Burns Gel Sachets', 4, 'Immediate burn treatment');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM first_aid_requirements WHERE venue_type = 'high_risk' AND min_staff_count = 1 AND max_staff_count = 9 AND requirement_name = 'Disposable Gloves - Medium' AND company_id IS NULL) THEN
    INSERT INTO first_aid_requirements (company_id, venue_type, min_staff_count, max_staff_count, requirement_name, required_quantity, notes)
    VALUES (NULL, 'high_risk', 1, 9, 'Disposable Gloves - Medium', 10, 'Infection control');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM first_aid_requirements WHERE venue_type = 'high_risk' AND min_staff_count = 1 AND max_staff_count = 9 AND requirement_name = 'Antiseptic Wipes' AND company_id IS NULL) THEN
    INSERT INTO first_aid_requirements (company_id, venue_type, min_staff_count, max_staff_count, requirement_name, required_quantity, notes)
    VALUES (NULL, 'high_risk', 1, 9, 'Antiseptic Wipes', 10, 'Wound cleaning');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM first_aid_requirements WHERE venue_type = 'high_risk' AND min_staff_count = 1 AND max_staff_count = 9 AND requirement_name = 'Eye Wash Solution' AND company_id IS NULL) THEN
    INSERT INTO first_aid_requirements (company_id, venue_type, min_staff_count, max_staff_count, requirement_name, required_quantity, notes)
    VALUES (NULL, 'high_risk', 1, 9, 'Eye Wash Solution', 1, 'Chemical/foreign body exposure');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM first_aid_requirements WHERE venue_type = 'high_risk' AND min_staff_count = 1 AND max_staff_count = 9 AND requirement_name = 'Scissors - Blunt' AND company_id IS NULL) THEN
    INSERT INTO first_aid_requirements (company_id, venue_type, min_staff_count, max_staff_count, requirement_name, required_quantity, notes)
    VALUES (NULL, 'high_risk', 1, 9, 'Scissors - Blunt', 1, 'For cutting dressings');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM first_aid_requirements WHERE venue_type = 'high_risk' AND min_staff_count = 1 AND max_staff_count = 9 AND requirement_name = 'Tweezers' AND company_id IS NULL) THEN
    INSERT INTO first_aid_requirements (company_id, venue_type, min_staff_count, max_staff_count, requirement_name, required_quantity, notes)
    VALUES (NULL, 'high_risk', 1, 9, 'Tweezers', 1, 'Removing splinters');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM first_aid_requirements WHERE venue_type = 'high_risk' AND min_staff_count = 1 AND max_staff_count = 9 AND requirement_name = 'Finger Cots' AND company_id IS NULL) THEN
    INSERT INTO first_aid_requirements (company_id, venue_type, min_staff_count, max_staff_count, requirement_name, required_quantity, notes)
    VALUES (NULL, 'high_risk', 1, 9, 'Finger Cots', 10, 'Finger protection');
  END IF;

  -- High risk venues - Scaled for 10-19 staff
  IF NOT EXISTS (SELECT 1 FROM first_aid_requirements WHERE venue_type = 'high_risk' AND min_staff_count = 10 AND max_staff_count = 19 AND requirement_name = 'Blue Plasters for Food Handlers' AND company_id IS NULL) THEN
    INSERT INTO first_aid_requirements (company_id, venue_type, min_staff_count, max_staff_count, requirement_name, required_quantity, notes)
    VALUES (NULL, 'high_risk', 10, 19, 'Blue Plasters for Food Handlers', 60, 'Double for 10+ kitchen staff');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM first_aid_requirements WHERE venue_type = 'high_risk' AND min_staff_count = 10 AND max_staff_count = 19 AND requirement_name = 'Fabric Plasters - Assorted Sizes' AND company_id IS NULL) THEN
    INSERT INTO first_aid_requirements (company_id, venue_type, min_staff_count, max_staff_count, requirement_name, required_quantity, notes)
    VALUES (NULL, 'high_risk', 10, 19, 'Fabric Plasters - Assorted Sizes', 40, 'Double for 10+ staff');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM first_aid_requirements WHERE venue_type = 'high_risk' AND min_staff_count = 10 AND max_staff_count = 19 AND requirement_name = 'Medium Sterile Dressings' AND company_id IS NULL) THEN
    INSERT INTO first_aid_requirements (company_id, venue_type, min_staff_count, max_staff_count, requirement_name, required_quantity, notes)
    VALUES (NULL, 'high_risk', 10, 19, 'Medium Sterile Dressings', 8, 'Double for 10+ staff');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM first_aid_requirements WHERE venue_type = 'high_risk' AND min_staff_count = 10 AND max_staff_count = 19 AND requirement_name = 'Large Sterile Dressings' AND company_id IS NULL) THEN
    INSERT INTO first_aid_requirements (company_id, venue_type, min_staff_count, max_staff_count, requirement_name, required_quantity, notes)
    VALUES (NULL, 'high_risk', 10, 19, 'Large Sterile Dressings', 4, 'Double for 10+ staff');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM first_aid_requirements WHERE venue_type = 'high_risk' AND min_staff_count = 10 AND max_staff_count = 19 AND requirement_name = 'Burns Dressings' AND company_id IS NULL) THEN
    INSERT INTO first_aid_requirements (company_id, venue_type, min_staff_count, max_staff_count, requirement_name, required_quantity, notes)
    VALUES (NULL, 'high_risk', 10, 19, 'Burns Dressings', 4, 'Double for 10+ staff');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM first_aid_requirements WHERE venue_type = 'high_risk' AND min_staff_count = 10 AND max_staff_count = 19 AND requirement_name = 'Burns Gel Sachets' AND company_id IS NULL) THEN
    INSERT INTO first_aid_requirements (company_id, venue_type, min_staff_count, max_staff_count, requirement_name, required_quantity, notes)
    VALUES (NULL, 'high_risk', 10, 19, 'Burns Gel Sachets', 8, 'Double for 10+ staff');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM first_aid_requirements WHERE venue_type = 'high_risk' AND min_staff_count = 10 AND max_staff_count = 19 AND requirement_name = 'Disposable Gloves - Medium' AND company_id IS NULL) THEN
    INSERT INTO first_aid_requirements (company_id, venue_type, min_staff_count, max_staff_count, requirement_name, required_quantity, notes)
    VALUES (NULL, 'high_risk', 10, 19, 'Disposable Gloves - Medium', 20, 'Double for 10+ staff');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM first_aid_requirements WHERE venue_type = 'high_risk' AND min_staff_count = 10 AND max_staff_count = 19 AND requirement_name = 'Antiseptic Wipes' AND company_id IS NULL) THEN
    INSERT INTO first_aid_requirements (company_id, venue_type, min_staff_count, max_staff_count, requirement_name, required_quantity, notes)
    VALUES (NULL, 'high_risk', 10, 19, 'Antiseptic Wipes', 20, 'Double for 10+ staff');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM first_aid_requirements WHERE venue_type = 'high_risk' AND min_staff_count = 10 AND max_staff_count = 19 AND requirement_name = 'Eye Wash Solution' AND company_id IS NULL) THEN
    INSERT INTO first_aid_requirements (company_id, venue_type, min_staff_count, max_staff_count, requirement_name, required_quantity, notes)
    VALUES (NULL, 'high_risk', 10, 19, 'Eye Wash Solution', 1, 'Single item regardless of staff count');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM first_aid_requirements WHERE venue_type = 'high_risk' AND min_staff_count = 10 AND max_staff_count = 19 AND requirement_name = 'Scissors - Blunt' AND company_id IS NULL) THEN
    INSERT INTO first_aid_requirements (company_id, venue_type, min_staff_count, max_staff_count, requirement_name, required_quantity, notes)
    VALUES (NULL, 'high_risk', 10, 19, 'Scissors - Blunt', 1, 'Single item regardless of staff count');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM first_aid_requirements WHERE venue_type = 'high_risk' AND min_staff_count = 10 AND max_staff_count = 19 AND requirement_name = 'Tweezers' AND company_id IS NULL) THEN
    INSERT INTO first_aid_requirements (company_id, venue_type, min_staff_count, max_staff_count, requirement_name, required_quantity, notes)
    VALUES (NULL, 'high_risk', 10, 19, 'Tweezers', 1, 'Single item regardless of staff count');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM first_aid_requirements WHERE venue_type = 'high_risk' AND min_staff_count = 10 AND max_staff_count = 19 AND requirement_name = 'Finger Cots' AND company_id IS NULL) THEN
    INSERT INTO first_aid_requirements (company_id, venue_type, min_staff_count, max_staff_count, requirement_name, required_quantity, notes)
    VALUES (NULL, 'high_risk', 10, 19, 'Finger Cots', 20, 'Double for 10+ staff');
  END IF;

  -- High risk venues - Scaled for 20+ staff
  IF NOT EXISTS (SELECT 1 FROM first_aid_requirements WHERE venue_type = 'high_risk' AND min_staff_count = 20 AND max_staff_count IS NULL AND requirement_name = 'Blue Plasters for Food Handlers' AND company_id IS NULL) THEN
    INSERT INTO first_aid_requirements (company_id, venue_type, min_staff_count, max_staff_count, requirement_name, required_quantity, notes)
    VALUES (NULL, 'high_risk', 20, NULL, 'Blue Plasters for Food Handlers', 90, 'Triple for 20+ kitchen staff');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM first_aid_requirements WHERE venue_type = 'high_risk' AND min_staff_count = 20 AND max_staff_count IS NULL AND requirement_name = 'Fabric Plasters - Assorted Sizes' AND company_id IS NULL) THEN
    INSERT INTO first_aid_requirements (company_id, venue_type, min_staff_count, max_staff_count, requirement_name, required_quantity, notes)
    VALUES (NULL, 'high_risk', 20, NULL, 'Fabric Plasters - Assorted Sizes', 60, 'Triple for 20+ staff');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM first_aid_requirements WHERE venue_type = 'high_risk' AND min_staff_count = 20 AND max_staff_count IS NULL AND requirement_name = 'Medium Sterile Dressings' AND company_id IS NULL) THEN
    INSERT INTO first_aid_requirements (company_id, venue_type, min_staff_count, max_staff_count, requirement_name, required_quantity, notes)
    VALUES (NULL, 'high_risk', 20, NULL, 'Medium Sterile Dressings', 12, 'Triple for 20+ staff');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM first_aid_requirements WHERE venue_type = 'high_risk' AND min_staff_count = 20 AND max_staff_count IS NULL AND requirement_name = 'Large Sterile Dressings' AND company_id IS NULL) THEN
    INSERT INTO first_aid_requirements (company_id, venue_type, min_staff_count, max_staff_count, requirement_name, required_quantity, notes)
    VALUES (NULL, 'high_risk', 20, NULL, 'Large Sterile Dressings', 6, 'Triple for 20+ staff');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM first_aid_requirements WHERE venue_type = 'high_risk' AND min_staff_count = 20 AND max_staff_count IS NULL AND requirement_name = 'Burns Dressings' AND company_id IS NULL) THEN
    INSERT INTO first_aid_requirements (company_id, venue_type, min_staff_count, max_staff_count, requirement_name, required_quantity, notes)
    VALUES (NULL, 'high_risk', 20, NULL, 'Burns Dressings', 6, 'Triple for 20+ staff');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM first_aid_requirements WHERE venue_type = 'high_risk' AND min_staff_count = 20 AND max_staff_count IS NULL AND requirement_name = 'Burns Gel Sachets' AND company_id IS NULL) THEN
    INSERT INTO first_aid_requirements (company_id, venue_type, min_staff_count, max_staff_count, requirement_name, required_quantity, notes)
    VALUES (NULL, 'high_risk', 20, NULL, 'Burns Gel Sachets', 12, 'Triple for 20+ staff');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM first_aid_requirements WHERE venue_type = 'high_risk' AND min_staff_count = 20 AND max_staff_count IS NULL AND requirement_name = 'Disposable Gloves - Medium' AND company_id IS NULL) THEN
    INSERT INTO first_aid_requirements (company_id, venue_type, min_staff_count, max_staff_count, requirement_name, required_quantity, notes)
    VALUES (NULL, 'high_risk', 20, NULL, 'Disposable Gloves - Medium', 30, 'Triple for 20+ staff');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM first_aid_requirements WHERE venue_type = 'high_risk' AND min_staff_count = 20 AND max_staff_count IS NULL AND requirement_name = 'Antiseptic Wipes' AND company_id IS NULL) THEN
    INSERT INTO first_aid_requirements (company_id, venue_type, min_staff_count, max_staff_count, requirement_name, required_quantity, notes)
    VALUES (NULL, 'high_risk', 20, NULL, 'Antiseptic Wipes', 30, 'Triple for 20+ staff');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM first_aid_requirements WHERE venue_type = 'high_risk' AND min_staff_count = 20 AND max_staff_count IS NULL AND requirement_name = 'Eye Wash Solution' AND company_id IS NULL) THEN
    INSERT INTO first_aid_requirements (company_id, venue_type, min_staff_count, max_staff_count, requirement_name, required_quantity, notes)
    VALUES (NULL, 'high_risk', 20, NULL, 'Eye Wash Solution', 1, 'Single item regardless of staff count');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM first_aid_requirements WHERE venue_type = 'high_risk' AND min_staff_count = 20 AND max_staff_count IS NULL AND requirement_name = 'Scissors - Blunt' AND company_id IS NULL) THEN
    INSERT INTO first_aid_requirements (company_id, venue_type, min_staff_count, max_staff_count, requirement_name, required_quantity, notes)
    VALUES (NULL, 'high_risk', 20, NULL, 'Scissors - Blunt', 1, 'Single item regardless of staff count');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM first_aid_requirements WHERE venue_type = 'high_risk' AND min_staff_count = 20 AND max_staff_count IS NULL AND requirement_name = 'Tweezers' AND company_id IS NULL) THEN
    INSERT INTO first_aid_requirements (company_id, venue_type, min_staff_count, max_staff_count, requirement_name, required_quantity, notes)
    VALUES (NULL, 'high_risk', 20, NULL, 'Tweezers', 1, 'Single item regardless of staff count');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM first_aid_requirements WHERE venue_type = 'high_risk' AND min_staff_count = 20 AND max_staff_count IS NULL AND requirement_name = 'Finger Cots' AND company_id IS NULL) THEN
    INSERT INTO first_aid_requirements (company_id, venue_type, min_staff_count, max_staff_count, requirement_name, required_quantity, notes)
    VALUES (NULL, 'high_risk', 20, NULL, 'Finger Cots', 30, 'Triple for 20+ staff');
  END IF;
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  supplies_count INTEGER;
  requirements_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO supplies_count FROM first_aid_supplies_library;
  SELECT COUNT(*) INTO requirements_count FROM first_aid_requirements;
  
  RAISE NOTICE '✅ First Aid Supplies Library created: % items', supplies_count;
  RAISE NOTICE '✅ First Aid Requirements created: % requirements', requirements_count;
END $$;

