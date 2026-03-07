-- ============================================================================
-- Migration: Add unique constraint to stock_levels for upsert
-- ============================================================================

-- Create the unique index needed for ON CONFLICT clause
CREATE UNIQUE INDEX IF NOT EXISTS idx_stock_levels_unique_item_site
  ON stockly.stock_levels(stock_item_id, site_id, COALESCE(storage_area_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
