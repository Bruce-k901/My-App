-- ============================================================================
-- Migration: 20250231000002_add_pack_size_pack_cost_to_stock_items.sql
-- Description: Adds pack_size and pack_cost columns to stock_items table
-- Pack size/cost allows calculating unit cost automatically
-- ============================================================================

DO $$
BEGIN
  -- Add pack_size column to stockly.stock_items (the underlying table)
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'stockly' 
    AND table_name = 'stock_items'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'stockly' 
      AND table_name = 'stock_items' 
      AND column_name = 'pack_size'
    ) THEN
      ALTER TABLE stockly.stock_items 
      ADD COLUMN pack_size NUMERIC(12, 3) DEFAULT NULL;
      
      COMMENT ON COLUMN stockly.stock_items.pack_size IS 'Size of the pack/package in base units (e.g., 25 for 25kg bag)';
    END IF;
    
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'stockly' 
      AND table_name = 'stock_items' 
      AND column_name = 'pack_cost'
    ) THEN
      ALTER TABLE stockly.stock_items 
      ADD COLUMN pack_cost NUMERIC(10, 2) DEFAULT NULL;
      
      COMMENT ON COLUMN stockly.stock_items.pack_cost IS 'Cost of the entire pack/package (e.g., 50.00 for a 25kg bag)';
    END IF;
  END IF;
  
  -- Also check public.stock_items if it's a table (not a view)
  -- If it's a view, it will automatically reflect the change from stockly.stock_items
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'stock_items'
    AND table_type = 'BASE TABLE'  -- Only proceed if it's a table, not a view
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'stock_items' 
      AND column_name = 'pack_size'
    ) THEN
      ALTER TABLE public.stock_items 
      ADD COLUMN pack_size NUMERIC(12, 3) DEFAULT NULL;
      
      COMMENT ON COLUMN public.stock_items.pack_size IS 'Size of the pack/package in base units';
    END IF;
    
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'stock_items' 
      AND column_name = 'pack_cost'
    ) THEN
      ALTER TABLE public.stock_items 
      ADD COLUMN pack_cost NUMERIC(10, 2) DEFAULT NULL;
      
      COMMENT ON COLUMN public.stock_items.pack_cost IS 'Cost of the entire pack/package';
    END IF;
  END IF;
END $$;

