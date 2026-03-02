-- Add bake_group_id, destination_group_id, and time_constraint to process stages
-- These allow stages to reference specific bake groups and destination groups

ALTER TABLE planly_process_stages
ADD COLUMN IF NOT EXISTS bake_group_id UUID REFERENCES planly_bake_groups(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS destination_group_id UUID REFERENCES planly_destination_groups(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS time_constraint TIME;

-- Add indexes for the new foreign keys
CREATE INDEX IF NOT EXISTS idx_process_stages_bake_group ON planly_process_stages(bake_group_id) WHERE bake_group_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_process_stages_dest_group ON planly_process_stages(destination_group_id) WHERE destination_group_id IS NOT NULL;

COMMENT ON COLUMN planly_process_stages.bake_group_id IS 'Optional reference to a bake group for this stage';
COMMENT ON COLUMN planly_process_stages.destination_group_id IS 'Optional reference to a destination group for this stage';
COMMENT ON COLUMN planly_process_stages.time_constraint IS 'Optional time constraint for when this stage should start (e.g., 06:00)';
