-- ============================================================================
-- Migration: 20250322000004_recipe_circular_check.sql
-- Description: Prevents circular dependencies in recipe ingredients
-- Updates existing circular check to work with ingredients_library linked_recipe_id
-- ============================================================================

DO $$
BEGIN
  -- Check if stockly schema exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_namespace WHERE nspname = 'stockly'
  ) THEN
    RAISE NOTICE 'stockly schema does not exist - skipping recipe_circular_check migration';
    RETURN;
  END IF;

  -- Check if stockly.recipe_ingredients table exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'stockly' 
    AND table_name = 'recipe_ingredients' 
    AND table_type = 'BASE TABLE'
  ) THEN
    RAISE NOTICE 'stockly.recipe_ingredients table does not exist - skipping recipe_circular_check migration';
    RETURN;
  END IF;

  -- Drop existing circular check function and trigger if they exist
  -- (We're replacing with an improved version that handles linked_recipe_id)
  -- Note: public.recipe_ingredients is a VIEW, so we need to drop trigger from stockly.recipe_ingredients
  DROP TRIGGER IF EXISTS trg_recipe_circular_check ON stockly.recipe_ingredients;
  DROP TRIGGER IF EXISTS check_circular_before_insert ON stockly.recipe_ingredients;
  DROP FUNCTION IF EXISTS check_recipe_circular_ref();
  DROP FUNCTION IF EXISTS check_recipe_circular_dependency(UUID, UUID);
  DROP FUNCTION IF EXISTS prevent_recipe_circular_dependency();

  -- ============================================================================
  -- Function: check_recipe_circular_dependency
  -- Checks if adding an ingredient would create a circular dependency
  -- Works with both sub_recipe_id (old) and ingredients_library.linked_recipe_id (new)
  -- ============================================================================
  EXECUTE $sql_func1$
    CREATE OR REPLACE FUNCTION check_recipe_circular_dependency(
      p_recipe_id UUID,
      p_ingredient_id UUID
    ) RETURNS BOOLEAN AS $func$
    DECLARE
      v_max_depth INTEGER := 10; -- prevent infinite loops
      v_has_circular BOOLEAN := FALSE;
      v_linked_recipe_id UUID;
    BEGIN
      -- Check if this ingredient is linked to a recipe (via ingredients_library.linked_recipe_id)
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ingredients_library') THEN
        SELECT linked_recipe_id INTO v_linked_recipe_id
        FROM public.ingredients_library
        WHERE id = p_ingredient_id;
      END IF;
      
      -- If ingredient isn't a prep item, no circular dependency possible
      IF v_linked_recipe_id IS NULL THEN
        RETURN FALSE;
      END IF;
      
      -- Check if we're trying to add a recipe to itself
      IF v_linked_recipe_id = p_recipe_id THEN
        RETURN TRUE;
      END IF;
      
      -- Recursively check if p_recipe_id appears in the ingredient tree
      -- Only if stockly.recipe_ingredients and ingredients_library exist
      IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'stockly' AND table_name = 'recipe_ingredients'
      ) AND EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'ingredients_library'
      ) THEN
        WITH RECURSIVE recipe_tree AS (
          -- Start with the ingredient's linked recipe
          SELECT 
            v_linked_recipe_id as recipe_id,
            1 as depth
          
          UNION ALL
          
          -- Find all ingredients used in recipes, and their linked recipes
          SELECT 
            il.linked_recipe_id as recipe_id,
            rt.depth + 1
          FROM recipe_tree rt
          JOIN stockly.recipe_ingredients ri ON ri.recipe_id = rt.recipe_id
          JOIN public.ingredients_library il ON il.id = ri.stock_item_id
          WHERE il.linked_recipe_id IS NOT NULL
            AND rt.depth < v_max_depth
        )
        SELECT EXISTS (
          SELECT 1 FROM recipe_tree WHERE recipe_id = p_recipe_id
        ) INTO v_has_circular;
      END IF;
      
      RETURN COALESCE(v_has_circular, FALSE);
    END;
    $func$ LANGUAGE plpgsql;
  $sql_func1$;

  -- ============================================================================
  -- Function: prevent_recipe_circular_dependency (Trigger Function)
  -- Called before insert/update on recipe_ingredients
  -- ============================================================================
  EXECUTE $sql_func2$
    CREATE OR REPLACE FUNCTION prevent_recipe_circular_dependency()
    RETURNS TRIGGER AS $func$
    DECLARE
      v_ingredient_id UUID;
    BEGIN
      -- Determine ingredient ID based on recipe_ingredients structure
      -- New system: uses stock_item_id pointing to ingredients_library
      -- Old system: uses sub_recipe_id pointing to recipes
      v_ingredient_id := COALESCE(NEW.stock_item_id, NEW.sub_recipe_id);
      
      IF v_ingredient_id IS NULL THEN
        RETURN NEW; -- No ingredient specified, skip check
      END IF;
      
      -- Check for circular dependency
      IF check_recipe_circular_dependency(NEW.recipe_id, v_ingredient_id) THEN
        RAISE EXCEPTION 'Circular dependency detected: This ingredient''s recipe would create a loop';
      END IF;
      
      RETURN NEW;
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
    CREATE TRIGGER check_circular_before_insert
      BEFORE INSERT OR UPDATE ON stockly.recipe_ingredients
      FOR EACH ROW
      EXECUTE FUNCTION prevent_recipe_circular_dependency();
  END IF;

  RAISE NOTICE 'Circular dependency prevention migration completed successfully';
END $$;

