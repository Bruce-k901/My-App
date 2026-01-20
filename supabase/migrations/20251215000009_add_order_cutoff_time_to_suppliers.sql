-- ============================================================================
-- Migration: Add Order Cutoff Time to Suppliers
-- Description: Adds order_cutoff_time column to suppliers table
-- Date: 2025-12-15
-- ============================================================================

-- Add order_cutoff_time column to stockly.suppliers
DO $$
BEGIN
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
DROP VIEW IF EXISTS public.suppliers CASCADE;
CREATE VIEW public.suppliers AS
SELECT * FROM stockly.suppliers;
ALTER VIEW public.suppliers SET (security_invoker = true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
END $$;
