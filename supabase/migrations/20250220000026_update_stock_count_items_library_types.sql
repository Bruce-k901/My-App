-- ============================================================================
-- Migration: Update stock_count_items library_type constraint and remove ingredient_id FK
-- Description: 
--   1. Add 'ppe' and 'chemicals' to allowed library types
--   2. Remove foreign key constraint on ingredient_id (it now references multiple library tables)
-- ============================================================================

DO $$
BEGIN
  -- Check if stock_count_items table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'stock_count_items'
  ) THEN
    
    -- Step 1: Drop the existing library_type constraint if it exists
    IF EXISTS (
      SELECT 1 FROM information_schema.constraint_column_usage 
      WHERE table_schema = 'public' 
      AND table_name = 'stock_count_items' 
      AND constraint_name = 'stock_count_items_library_type_check'
    ) THEN
      ALTER TABLE public.stock_count_items 
      DROP CONSTRAINT stock_count_items_library_type_check;
      
      RAISE NOTICE '✅ Dropped existing library_type constraint';
    END IF;
    
    -- Step 2: Add new constraint with all library types
    ALTER TABLE public.stock_count_items 
    ADD CONSTRAINT stock_count_items_library_type_check 
    CHECK (library_type IN ('ingredients', 'packaging', 'foh', 'first_aid', 'ppe', 'chemicals'));
    
    RAISE NOTICE '✅ Added updated library_type constraint with ppe and chemicals';
    
    -- Step 3: Drop the foreign key constraint on ingredient_id
    -- Since ingredient_id now references multiple library tables (based on library_type),
    -- we cannot use a single foreign key constraint
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = 'stock_count_items' 
      AND constraint_name = 'stock_count_items_ingredient_id_fkey'
    ) THEN
      ALTER TABLE public.stock_count_items 
      DROP CONSTRAINT stock_count_items_ingredient_id_fkey;
      
      RAISE NOTICE '✅ Dropped foreign key constraint on ingredient_id (now supports multiple library types)';
    END IF;
    
  ELSE
    RAISE NOTICE '⚠️ stock_count_items table does not exist in public schema';
  END IF;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error updating stock_count_items constraints: %', SQLERRM;
END $$;
