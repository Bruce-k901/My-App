-- ============================================================================
-- Migration: Refresh Product Variants View
-- Description: Recreates the product_variants view to ensure all columns are visible
-- Date: 2025-12-15
-- ============================================================================

-- Drop and recreate the view to ensure all columns are included
-- Only if the underlying table exists
DO $$
BEGIN
  -- Check if stockly schema and product_variants table exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_namespace WHERE nspname = 'stockly'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'stockly' AND table_name = 'product_variants'
  ) THEN
    RAISE NOTICE 'stockly schema or stockly.product_variants table does not exist - skipping product_variants view refresh';
    RETURN;
  END IF;

  -- Drop existing view if it exists
  DROP VIEW IF EXISTS public.product_variants CASCADE;

  -- Recreate with SELECT * to include all columns
  EXECUTE $sql_view1$
    CREATE VIEW public.product_variants AS
    SELECT * FROM stockly.product_variants;
  $sql_view1$;

  -- Set security_invoker so RLS from underlying table applies
  ALTER VIEW public.product_variants SET (security_invoker = true);

  -- Grant permissions
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_variants TO authenticated;

  RAISE NOTICE 'View public.product_variants recreated successfully';
END $$;

-- Verify columns exist
DO $$
DECLARE
  v_columns TEXT;
BEGIN
  -- Only verify if the view exists
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'product_variants') THEN
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
  ELSE
    RAISE NOTICE 'View public.product_variants does not exist - skipping verification';
  END IF;
END $$;

-- Refresh PostgREST cache
NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
END $$;
