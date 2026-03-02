-- ============================================================================
-- Migration: Create Global UOM Table
-- Description: Global units of measure (NOT per-company) for Stockly
-- ============================================================================

BEGIN;

-- Global units of measure (NOT per-company)
CREATE TABLE IF NOT EXISTS uom (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    abbreviation TEXT NOT NULL UNIQUE,
    unit_type TEXT NOT NULL CHECK (unit_type IN ('weight', 'volume', 'count', 'length')),
    base_multiplier DECIMAL(12,6) DEFAULT 1,
    is_base BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed standard hospitality units
INSERT INTO uom (name, abbreviation, unit_type, base_multiplier, is_base, sort_order) VALUES
-- Weight (base = kg)
('Kilogram', 'kg', 'weight', 1, TRUE, 1),
('Gram', 'g', 'weight', 0.001, FALSE, 2),
('Pound', 'lb', 'weight', 0.453592, FALSE, 3),
('Ounce', 'oz', 'weight', 0.0283495, FALSE, 4),
-- Volume (base = L)
('Litre', 'L', 'volume', 1, TRUE, 10),
('Millilitre', 'ml', 'volume', 0.001, FALSE, 11),
('Centilitre', 'cl', 'volume', 0.01, FALSE, 12),
('Pint (UK)', 'pt', 'volume', 0.568261, FALSE, 13),
('Gallon (UK)', 'gal', 'volume', 4.54609, FALSE, 14),
('Fluid Ounce', 'fl oz', 'volume', 0.0284131, FALSE, 15),
-- Count (base = each)
('Each', 'ea', 'count', 1, TRUE, 20),
('Dozen', 'doz', 'count', 12, FALSE, 21),
('Case', 'case', 'count', 1, FALSE, 22),
('Pack', 'pack', 'count', 1, FALSE, 23),
('Bottle', 'btl', 'count', 1, FALSE, 24),
('Can', 'can', 'count', 1, FALSE, 25),
('Portion', 'ptn', 'count', 1, FALSE, 26),
('Bunch', 'bunch', 'count', 1, FALSE, 27),
('Bag', 'bag', 'count', 1, FALSE, 28),
('Tray', 'tray', 'count', 1, FALSE, 29),
('Sleeve', 'sleeve', 'count', 1, FALSE, 30)
ON CONFLICT (abbreviation) DO NOTHING;

-- UOM is global read for everyone (no company restriction)
ALTER TABLE uom ENABLE ROW LEVEL SECURITY;
CREATE POLICY uom_global_read ON uom FOR SELECT USING (TRUE);
-- Only service_role can modify
CREATE POLICY uom_service_only ON uom FOR ALL USING (auth.role() = 'service_role');

COMMIT;










