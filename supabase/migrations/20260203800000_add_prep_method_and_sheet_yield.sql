-- ============================================================================
-- ADD PREP METHOD TO PRODUCTS AND SHEET YIELD TO PROCESSING GROUPS
-- ============================================================================
-- This migration adds:
-- 1. prep_method enum for products (laminated, frozen, fresh, par_baked)
-- 2. sheet_yield_kg to processing groups for dough sheet calculation
-- ============================================================================

-- Create the prep_method enum type
DO $$ BEGIN
  CREATE TYPE prep_method AS ENUM ('laminated', 'frozen', 'fresh', 'par_baked');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add prep_method to planly_products
ALTER TABLE planly_products
  ADD COLUMN IF NOT EXISTS prep_method prep_method DEFAULT 'fresh';

-- Add sheet_yield_kg to planly_processing_groups
-- This is how many kg of dough makes one "sheet" (for laminated products)
-- e.g., 1kg sheet yields 10 croissants
ALTER TABLE planly_processing_groups
  ADD COLUMN IF NOT EXISTS sheet_yield_kg DECIMAL(10,3);

-- Add lamination_method to processing groups (for laminated doughs)
-- e.g., 'single_fold', 'double_fold', 'book_fold'
ALTER TABLE planly_processing_groups
  ADD COLUMN IF NOT EXISTS lamination_method VARCHAR(50);

-- Comment the columns for clarity
COMMENT ON COLUMN planly_products.prep_method IS 'How this product is prepared: laminated (croissants), frozen (cookies from freezer), fresh (mixed day-of), par_baked (just finish baking)';
COMMENT ON COLUMN planly_processing_groups.sheet_yield_kg IS 'Weight in kg of one dough sheet. Used to calculate total sheets needed.';
COMMENT ON COLUMN planly_processing_groups.lamination_method IS 'For laminated doughs: single_fold, double_fold, book_fold, etc.';

-- Create index for prep_method queries
CREATE INDEX IF NOT EXISTS idx_planly_products_prep_method ON planly_products(prep_method);
