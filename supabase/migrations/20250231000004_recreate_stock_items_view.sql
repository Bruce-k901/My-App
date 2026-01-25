-- ============================================================================
-- Migration: 20250231000004_recreate_stock_items_view.sql
-- Description: Recreates the stock_items view to ensure new columns are visible
-- This forces PostgREST to see the allergens, pack_size, and pack_cost columns
-- ============================================================================

DO $$
BEGIN
  -- Check if stockly.stock_items table exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'stockly' 
    AND table_name = 'stock_items'
  ) THEN
    RAISE NOTICE 'stockly.stock_items table does not exist - skipping stock_items view recreation';
    RETURN;
  END IF;

  -- Drop and recreate the view to ensure new columns are included
  DROP VIEW IF EXISTS public.stock_items CASCADE;

  EXECUTE $sql_view1$
    CREATE VIEW public.stock_items AS
    SELECT * FROM stockly.stock_items;
  $sql_view1$;

  -- Grant permissions
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_items TO authenticated;

  -- Notify PostgREST to reload schema cache
  NOTIFY pgrst, 'reload schema';
  PERFORM pg_notify('pgrst', 'reload schema');

END $$;

