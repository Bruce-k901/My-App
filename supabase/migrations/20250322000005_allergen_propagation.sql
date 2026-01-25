-- ============================================================================
-- Migration: 20250322000005_allergen_propagation.sql
-- Description: Automatically aggregates allergens from recipe ingredients
-- ============================================================================

DO $$
BEGIN
  -- Check if stockly schema exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_namespace WHERE nspname = 'stockly'
  ) THEN
    RAISE NOTICE 'stockly schema does not exist - skipping allergen_propagation migration';
    RETURN;
  END IF;

  -- Check if stockly.recipe_ingredients table exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'stockly' 
    AND table_name = 'recipe_ingredients' 
    AND table_type = 'BASE TABLE'
  ) THEN
    RAISE NOTICE 'stockly.recipe_ingredients table does not exist - skipping allergen_propagation migration';
    RETURN;
  END IF;

  -- Drop existing function and trigger if they exist
  -- Note: public.recipe_ingredients is a VIEW, so we need to drop trigger from stockly.recipe_ingredients
  DROP TRIGGER IF EXISTS update_allergens_on_ingredient_change ON stockly.recipe_ingredients;
  DROP FUNCTION IF EXISTS trigger_update_recipe_allergens();
  DROP FUNCTION IF EXISTS update_recipe_allergens(UUID);

  -- ============================================================================
  -- Function: update_recipe_allergens
  -- Aggregates all unique allergens from recipe ingredients
  -- ============================================================================
  EXECUTE $sql_func1$
    CREATE OR REPLACE FUNCTION update_recipe_allergens(p_recipe_id UUID)
    RETURNS void AS $func$
    DECLARE
      v_allergens TEXT[];
    BEGIN
      -- Collect all unique allergens from recipe ingredients
      -- Works with ingredients_library table (new system)
      -- Only if ingredients_library exists
      IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'ingredients_library'
      ) THEN
        SELECT ARRAY_AGG(DISTINCT allergen)
        INTO v_allergens
        FROM (
          SELECT UNNEST(i.allergens) as allergen
          FROM stockly.recipe_ingredients ri
          JOIN public.ingredients_library i ON i.id = ri.stock_item_id
          WHERE ri.recipe_id = p_recipe_id
            AND i.allergens IS NOT NULL
            AND array_length(i.allergens, 1) > 0
        ) sub
        WHERE allergen IS NOT NULL
          AND allergen != '';
      END IF;
      
      -- Update recipe with aggregated allergens (must update stockly.recipes, not the view)
      IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'stockly' 
        AND table_name = 'recipes'
        AND table_type = 'BASE TABLE'
        AND EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'stockly' 
          AND table_name = 'recipes' 
          AND column_name = 'allergens'
        )
      ) THEN
        UPDATE stockly.recipes
        SET allergens = COALESCE(v_allergens, ARRAY[]::TEXT[])
        WHERE id = p_recipe_id;
      END IF;
    END;
    $func$ LANGUAGE plpgsql;
  $sql_func1$;

  -- ============================================================================
  -- Function: trigger_update_recipe_allergens (Trigger Function)
  -- Called after insert/update/delete on recipe_ingredients
  -- ============================================================================
  EXECUTE $sql_func2$
    CREATE OR REPLACE FUNCTION trigger_update_recipe_allergens()
    RETURNS TRIGGER AS $func$
    BEGIN
      -- Update allergens for affected recipe(s)
      IF TG_OP = 'DELETE' THEN
        PERFORM update_recipe_allergens(OLD.recipe_id);
      ELSE
        PERFORM update_recipe_allergens(NEW.recipe_id);
      END IF;
      RETURN COALESCE(NEW, OLD);
    END;
    $func$ LANGUAGE plpgsql;
  $sql_func2$;

  -- ============================================================================
  -- Create trigger on recipe_ingredients (must be on stockly.recipe_ingredients, not the view)
  -- ============================================================================
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'stockly' 
    AND table_name = 'recipe_ingredients' 
    AND table_type = 'BASE TABLE'
  ) THEN
    CREATE TRIGGER update_allergens_on_ingredient_change
      AFTER INSERT OR UPDATE OR DELETE ON stockly.recipe_ingredients
      FOR EACH ROW
      EXECUTE FUNCTION trigger_update_recipe_allergens();
  END IF;

  RAISE NOTICE 'Allergen propagation migration completed successfully';
END $$;

