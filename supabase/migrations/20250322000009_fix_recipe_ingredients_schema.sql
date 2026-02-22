-- ============================================================================
-- Migration: 20250322000009_fix_recipe_ingredients_schema.sql
-- Description: Rename stock_item_id to ingredient_id and fix foreign key
--              to point to ingredients_library instead of stock_items
-- ============================================================================

DO $$
BEGIN
  -- Check if recipe_ingredients table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'stockly' 
    AND table_name = 'recipe_ingredients'
    AND table_type = 'BASE TABLE'
  ) THEN
    
    -- 1. Drop old foreign key constraint if it exists
    ALTER TABLE stockly.recipe_ingredients
      DROP CONSTRAINT IF EXISTS recipe_ingredients_stock_item_id_fkey;
    
    -- 2. Rename column from stock_item_id to ingredient_id
    ALTER TABLE stockly.recipe_ingredients
      RENAME COLUMN stock_item_id TO ingredient_id;
    
    -- 3. Update the ingredient_source CHECK constraint to use ingredient_id
    ALTER TABLE stockly.recipe_ingredients
      DROP CONSTRAINT IF EXISTS ingredient_source;
    
    ALTER TABLE stockly.recipe_ingredients
      ADD CONSTRAINT ingredient_source CHECK (
        (ingredient_id IS NOT NULL AND sub_recipe_id IS NULL) OR
        (ingredient_id IS NULL AND sub_recipe_id IS NOT NULL)
      );
    
    -- 4. Add new foreign key constraint pointing to ingredients_library
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'ingredients_library'
    ) THEN
      ALTER TABLE stockly.recipe_ingredients
        ADD CONSTRAINT recipe_ingredients_ingredient_id_fkey
          FOREIGN KEY (ingredient_id)
          REFERENCES public.ingredients_library(id)
          ON DELETE CASCADE;
      
      RAISE NOTICE 'Added foreign key constraint to ingredients_library';
    END IF;
    
    -- 5. Add index on ingredient_id for performance
    CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_ingredient_id
      ON stockly.recipe_ingredients(ingredient_id)
      WHERE ingredient_id IS NOT NULL;
    
    RAISE NOTICE 'Renamed stock_item_id to ingredient_id in stockly.recipe_ingredients';
    
  ELSE
    RAISE NOTICE 'stockly.recipe_ingredients table does not exist, skipping';
  END IF;
  
  -- 6. Recreate view with new column name
  -- Keep view simple for updatability (SELECT * is automatically updatable)
  -- Application code can JOIN with ingredients_library as needed
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'stockly' 
    AND table_name = 'recipe_ingredients'
    AND table_type = 'BASE TABLE'
  ) THEN
    DROP VIEW IF EXISTS public.recipe_ingredients CASCADE;
    
    CREATE OR REPLACE VIEW public.recipe_ingredients AS
      SELECT * FROM stockly.recipe_ingredients;
    
    -- Grant permissions on the view
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipe_ingredients TO authenticated;
    
    RAISE NOTICE 'Recreated public.recipe_ingredients view with ingredient_id';
  END IF;
  
  RAISE NOTICE 'Migration 20250322000009 completed successfully';
END $$;

