-- ============================================================================
-- Migration: Add Order Cutoff Time to Suppliers
-- Description: Adds order_cutoff_time column to suppliers table
-- Date: 2025-12-15
-- ============================================================================

-- Add order_cutoff_time column to stockly.suppliers
DO $$
BEGIN
  -- Check if stockly schema and suppliers table exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_namespace WHERE nspname = 'stockly'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'stockly' AND table_name = 'suppliers'
  ) THEN
    RAISE NOTICE 'stockly schema or stockly.suppliers table does not exist - skipping add_order_cutoff_time migration';
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'stockly' 
      AND table_name = 'suppliers' 
      AND column_name = 'order_cutoff_time'
  ) THEN
    ALTER TABLE stockly.suppliers 
    ADD COLUMN order_cutoff_time TIME DEFAULT '14:00';
    
    RAISE NOTICE '✅ Added order_cutoff_time column to stockly.suppliers';
  ELSE
    RAISE NOTICE '⚠️ order_cutoff_time column already exists in stockly.suppliers';
  END IF;
END $$;

-- Refresh the public.suppliers view to include the new column
-- Only if the underlying table exists
DO $$
BEGIN
  -- Check if stockly schema and suppliers table exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_namespace WHERE nspname = 'stockly'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'stockly' AND table_name = 'suppliers'
  ) THEN
    RAISE NOTICE 'stockly schema or stockly.suppliers table does not exist - skipping suppliers view refresh';
    RETURN;
  END IF;

  -- Drop existing view if it exists
  DROP VIEW IF EXISTS public.suppliers CASCADE;

  -- Recreate the view
  EXECUTE $sql_view1$
    CREATE VIEW public.suppliers AS
    SELECT * FROM stockly.suppliers;
  $sql_view1$;

  -- Set security_invoker
  ALTER VIEW public.suppliers SET (security_invoker = true);

  -- Grant permissions
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;

  RAISE NOTICE 'View public.suppliers recreated successfully';
END $$;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
END $$;
