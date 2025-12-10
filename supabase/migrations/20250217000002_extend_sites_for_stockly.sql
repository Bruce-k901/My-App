-- ============================================================================
-- Migration: Extend Sites Table for Stockly
-- Description: Add location_type, POS configuration, and internal markup fields
-- ============================================================================

BEGIN;

-- Add location_type to distinguish site types
ALTER TABLE sites 
ADD COLUMN IF NOT EXISTS location_type TEXT DEFAULT 'site'
    CHECK (location_type IN ('site', 'cpu', 'warehouse', 'external'));

-- Add POS configuration
ALTER TABLE sites
ADD COLUMN IF NOT EXISTS pos_provider TEXT 
    CHECK (pos_provider IN ('square', 'lightspeed', 'toast', 'zonal', 'other', NULL)),
ADD COLUMN IF NOT EXISTS pos_config JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS pos_location_id TEXT;

-- For CPU locations: internal markup when selling to sites
ALTER TABLE sites
ADD COLUMN IF NOT EXISTS internal_markup_percent DECIMAL(5,2) DEFAULT 0;

-- Comments
COMMENT ON COLUMN sites.location_type IS 
    'site=restaurant/bar with POS, cpu=central production unit, warehouse=storage only, external=offsite storage';
COMMENT ON COLUMN sites.pos_config IS 
    'POS-specific config: {api_key, location_id, webhook_url, sync_interval}';
COMMENT ON COLUMN sites.internal_markup_percent IS 
    'Markup % when CPU sells to sites (internal invoicing)';

-- Update existing sites to be type 'site'
UPDATE sites SET location_type = 'site' WHERE location_type IS NULL;

COMMIT;

