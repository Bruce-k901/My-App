-- ============================================================================
-- Migration: Fix Product Variants RLS Policy
-- Description: Adds WITH CHECK clause to product_variants RLS policy
-- Note: product_variants in public is a VIEW, RLS must be on stockly.product_variants table
-- Date: 2025-12-15
-- ============================================================================

-- Fix product_variants RLS policy on the underlying table (stockly.product_variants)
DO $$
BEGIN
  -- Check if the underlying table exists in stockly schema
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'stockly' AND table_name = 'product_variants') THEN
    -- Fix RLS on stockly.product_variants (the actual table)
    DROP POLICY IF EXISTS product_variants_parent ON stockly.product_variants;
    
    CREATE POLICY product_variants_parent ON stockly.product_variants 
      FOR ALL 
      USING (
        EXISTS (
          SELECT 1 FROM stockly.stock_items si
          WHERE si.id = stockly.product_variants.stock_item_id
            AND stockly.stockly_company_access(si.company_id)
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM stockly.stock_items si
          WHERE si.id = stockly.product_variants.stock_item_id
            AND stockly.stockly_company_access(si.company_id)
        )
      );
    
    RAISE NOTICE '✅ Fixed RLS policy on stockly.product_variants (added WITH CHECK)';
  ELSE
    RAISE WARNING '❌ stockly.product_variants table does not exist';
  END IF;
END $$;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
END $$;
