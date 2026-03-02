-- ============================================================================
-- Migration: 20250231000006_fix_public_stock_items_conflict.sql
-- Description: Fixes conflict between public.stock_items table and view
-- Drops the table if it exists and ensures only the view exists
-- The view should select from stockly.stock_items (the actual table)
-- ============================================================================

DO $$
BEGIN
  -- Check if stockly.stock_items table exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'stockly' 
    AND table_name = 'stock_items'
  ) THEN
    RAISE NOTICE 'stockly.stock_items table does not exist - skipping stock_items view conflict fix';
    RETURN;
  END IF;

  -- Drop the table if it exists (it should be a view, not a table)
  DROP TABLE IF EXISTS public.stock_items CASCADE;

  -- Ensure the view exists and selects from stockly.stock_items
  EXECUTE $sql_view1$
    CREATE OR REPLACE VIEW public.stock_items AS
    SELECT * FROM stockly.stock_items;
  $sql_view1$;

  -- Grant permissions
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_items TO authenticated;

  -- Notify PostgREST to reload schema cache
  NOTIFY pgrst, 'reload schema';
  PERFORM pg_notify('pgrst', 'reload schema');

END $$;

