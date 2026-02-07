-- Add capacity_profile column to planly_bake_groups
-- This links bake groups to equipment type capacity profiles for proper tray packing

ALTER TABLE planly_bake_groups
  ADD COLUMN IF NOT EXISTS capacity_profile VARCHAR(100) DEFAULT NULL;

COMMENT ON COLUMN planly_bake_groups.capacity_profile IS
  'Label matching a capacity_profiles entry on equipment types. E.g. "Cookies" matches {"label":"Cookies","capacity":38} on the tray type.';

-- Set initial values for existing bake groups at Shipton Mill site
UPDATE planly_bake_groups SET capacity_profile = 'Pastries' WHERE name = 'Swirls';
UPDATE planly_bake_groups SET capacity_profile = 'Pastries' WHERE name = 'Croissants';
UPDATE planly_bake_groups SET capacity_profile = 'Pastries' WHERE name = 'Savory';
UPDATE planly_bake_groups SET capacity_profile = 'Cookies' WHERE name = 'Cookies';
