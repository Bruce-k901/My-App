-- ============================================================================
-- Migration: Ensure stock_levels unique index exists for ON CONFLICT clause
-- ============================================================================

-- Create the unique index on the stockly schema table (public.stock_levels is a view)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'stockly' AND table_name = 'stock_levels' AND table_type = 'BASE TABLE') THEN
    CREATE UNIQUE INDEX IF NOT EXISTS idx_stock_levels_unique
      ON stockly.stock_levels(stock_item_id, site_id, COALESCE(storage_area_id, '00000000-0000-0000-0000-000000000000'::uuid));
    RAISE NOTICE 'Created unique index on stockly.stock_levels';
  ELSE
    RAISE NOTICE 'stockly.stock_levels table not found, skipping index creation';
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
