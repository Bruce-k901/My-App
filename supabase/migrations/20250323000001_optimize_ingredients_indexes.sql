-- ============================================================================
-- Migration: 20250323000001_optimize_ingredients_indexes.sql
-- Description: Add composite indexes for better query performance on ingredients_library
-- ============================================================================

DO $$
BEGIN
  -- Composite index for company_id + ingredient_name ordering (most common query pattern)
  -- This speeds up the ORDER BY ingredient_name query significantly
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'ingredients_library'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_ingredients_company_name 
      ON public.ingredients_library(company_id, ingredient_name);
    
    RAISE NOTICE 'Created composite index idx_ingredients_company_name';
  END IF;

  -- Index for company_id + category filtering (for category filter dropdown)
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'ingredients_library'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_ingredients_company_category 
      ON public.ingredients_library(company_id, category)
      WHERE category IS NOT NULL;
    
    RAISE NOTICE 'Created composite index idx_ingredients_company_category';
  END IF;

  -- Index for supplier lookups (used in closed card view)
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'ingredients_library'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_ingredients_company_supplier 
      ON public.ingredients_library(company_id, supplier)
      WHERE supplier IS NOT NULL;
    
    RAISE NOTICE 'Created composite index idx_ingredients_company_supplier';
  END IF;

  RAISE NOTICE 'Migration 20250323000001 completed successfully';
END $$;

