-- Add array columns for multiple group support
ALTER TABLE planly_process_stages
ADD COLUMN IF NOT EXISTS bake_group_ids UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS destination_group_ids UUID[] DEFAULT '{}';

-- Migrate existing single group references to arrays
UPDATE planly_process_stages
SET bake_group_ids = ARRAY[bake_group_id]::UUID[]
WHERE bake_group_id IS NOT NULL AND (bake_group_ids IS NULL OR bake_group_ids = '{}');

UPDATE planly_process_stages
SET destination_group_ids = ARRAY[destination_group_id]::UUID[]
WHERE destination_group_id IS NOT NULL AND (destination_group_ids IS NULL OR destination_group_ids = '{}');

-- Create indexes for array queries
CREATE INDEX IF NOT EXISTS idx_process_stages_bake_groups
  ON planly_process_stages USING GIN (bake_group_ids);

CREATE INDEX IF NOT EXISTS idx_process_stages_dest_groups
  ON planly_process_stages USING GIN (destination_group_ids);

-- Add comments
COMMENT ON COLUMN planly_process_stages.bake_group_ids IS 'Array of bake group UUIDs this stage applies to. Empty array = all groups.';
COMMENT ON COLUMN planly_process_stages.destination_group_ids IS 'Array of destination group UUIDs this stage applies to. Empty array = all groups.';
