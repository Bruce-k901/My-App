-- Migration: Add capacity profiles to equipment types
-- Adds JSONB column for per-category capacity overrides

-- Add JSONB column for per-category capacity overrides
ALTER TABLE planly_equipment_types
  ADD COLUMN IF NOT EXISTS capacity_profiles JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN planly_equipment_types.capacity_profiles IS
  'Named capacity overrides by product category. Array of {label: string, capacity: number}. default_capacity used as fallback.';

-- Example of what the data looks like:
-- UPDATE planly_equipment_types
-- SET capacity_profiles = '[
--   {"label": "Pastries", "capacity": 18},
--   {"label": "Cookies", "capacity": 36},
--   {"label": "Breads", "capacity": 6}
-- ]'::jsonb
-- WHERE name = 'Full Oven Tray';
