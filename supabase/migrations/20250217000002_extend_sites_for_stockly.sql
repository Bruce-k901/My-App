-- ============================================================================
-- Migration: Extend Sites Table for Stockly
-- Description: Add location_type, POS configuration, and internal markup fields
-- Note: This migration will be skipped if sites table doesn't exist yet
-- ============================================================================

DO $$
BEGIN
  -- Only proceed if sites table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sites') THEN
    -- Add location_type to distinguish site types
    ALTER TABLE public.sites 
    ADD COLUMN IF NOT EXISTS location_type TEXT DEFAULT 'site'
      CHECK (location_type IN ('site', 'cpu', 'warehouse', 'external'));

    -- Add POS configuration
    ALTER TABLE public.sites
    ADD COLUMN IF NOT EXISTS pos_provider TEXT 
      CHECK (pos_provider IN ('square', 'lightspeed', 'toast', 'zonal', 'other', NULL)),
    ADD COLUMN IF NOT EXISTS pos_config JSONB DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS pos_location_id TEXT;

    -- For CPU locations: internal markup when selling to sites
    ALTER TABLE public.sites
    ADD COLUMN IF NOT EXISTS internal_markup_percent DECIMAL(5,2) DEFAULT 0;

    -- Comments
    COMMENT ON COLUMN public.sites.location_type IS 
      'site=restaurant/bar with POS, cpu=central production unit, warehouse=storage only, external=offsite storage';
    COMMENT ON COLUMN public.sites.pos_config IS 
      'POS-specific config: {api_key, location_id, webhook_url, sync_interval}';
    COMMENT ON COLUMN public.sites.internal_markup_percent IS 
      'Markup % when CPU sells to sites (internal invoicing)';

    -- Update existing sites to be type 'site'
    UPDATE public.sites SET location_type = 'site' WHERE location_type IS NULL;
  ELSE
    RAISE NOTICE '⚠️ sites table does not exist yet - skipping column additions';
  END IF;
END $$;

