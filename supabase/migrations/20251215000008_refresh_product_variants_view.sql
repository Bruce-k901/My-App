-- ============================================================================
-- Migration: Refresh Product Variants View
-- Description: Recreates the product_variants view to ensure all columns are visible
-- Date: 2025-12-15
-- ============================================================================

-- Drop and recreate the view to ensure all columns are included
DROP VIEW IF EXISTS public.product_variants CASCADE;

-- Recreate with SELECT * to include all columns
CREATE VIEW public.product_variants AS
SELECT * FROM stockly.product_variants;

-- Set security_invoker so RLS from underlying table applies
ALTER VIEW public.product_variants SET (security_invoker = true);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_variants TO authenticated;

-- Verify columns exist
DO $$
DECLARE
  v_columns TEXT;
BEGIN
  SELECT string_agg(column_name || ' (' || data_type || ')', E'\n  ' ORDER BY ordinal_position)
  INTO v_columns
  FROM information_schema.columns
  WHERE table_schema = 'public' 
    AND table_name = 'product_variants';
  
  RAISE NOTICE '📋 Columns in public.product_variants view:';
  RAISE NOTICE '  %', v_columns;
  
  -- Check for specific columns
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'product_variants'
      AND column_name = 'product_name'
  ) THEN
    RAISE NOTICE '✅ product_name column exists';
  ELSE
    RAISE WARNING '❌ product_name column MISSING';
  END IF;
END $$;

-- Refresh PostgREST cache
NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
END $$;
