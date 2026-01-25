-- Fix all functions that still reference stock_item_id instead of ingredient_id
-- This migration ensures all functions use ingredient_id consistently
-- This migration only runs if stockly schema exists
DO $$
BEGIN
  -- Check if stockly schema exists - exit early if it doesn't
  IF NOT EXISTS (
    SELECT 1 FROM pg_namespace WHERE nspname = 'stockly'
  ) THEN
    RAISE NOTICE 'stockly schema does not exist - skipping fix_stock_item_id_references migration';
    RETURN;
  END IF;
  
  RAISE NOTICE 'stockly schema found - proceeding with fix_stock_item_id_references migration';
END $$;

-- Only proceed if schema exists (checked above)
DO $$
BEGIN
  -- Check if stockly schema exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_namespace WHERE nspname = 'stockly'
  ) THEN
    RETURN;
  END IF;

  -- 1. Fix update_recipe_allergens function (from 20250322000005_allergen_propagation.sql)
  -- This function has ri.stock_item_id on line 30
  EXECUTE $sql1$
    CREATE OR REPLACE FUNCTION update_recipe_allergens(p_recipe_id UUID)
    RETURNS void AS $func$
    DECLARE
      v_allergens TEXT[];
    BEGIN
      -- Collect all unique allergens from recipe ingredients
      -- FIXED: Use ingredient_id instead of stock_item_id
      SELECT ARRAY_AGG(DISTINCT allergen)
      INTO v_allergens
      FROM (
        SELECT UNNEST(i.allergens) as allergen
        FROM stockly.recipe_ingredients ri
        JOIN public.ingredients_library i ON i.id = ri.ingredient_id  -- FIXED: was ri.stock_item_id
        WHERE ri.recipe_id = p_recipe_id
          AND ri.ingredient_id IS NOT NULL  -- FIXED: was ri.stock_item_id
          AND i.allergens IS NOT NULL
          AND array_length(i.allergens, 1) > 0
      ) sub
      WHERE allergen IS NOT NULL
        AND allergen != '';
      
      -- Update recipe with aggregated allergens
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
  $sql1$;

  -- 2. Fix trigger_update_recipe_allergens function
  EXECUTE $sql2$
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
  $sql2$;

  -- 3. Fix check_recipe_circular_dependency function (from 20250322000004_recipe_circular_check.sql)
  -- This function has ri.stock_item_id on line 64
  EXECUTE $sql3$
    CREATE OR REPLACE FUNCTION check_recipe_circular_dependency(
      p_recipe_id UUID,
      p_ingredient_id UUID
    ) RETURNS BOOLEAN AS $func$
    DECLARE
      v_max_depth INTEGER := 10;
      v_has_circular BOOLEAN := FALSE;
      v_linked_recipe_id UUID;
    BEGIN
      -- Check if this ingredient is linked to a recipe
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
      WITH RECURSIVE recipe_tree AS (
        -- Start with the ingredient's linked recipe
        SELECT 
          v_linked_recipe_id as recipe_id,
          1 as depth
        
        UNION ALL
        
        -- Find all ingredients used in recipes, and their linked recipes
        -- FIXED: Use ingredient_id instead of stock_item_id
        SELECT 
          il.linked_recipe_id as recipe_id,
          rt.depth + 1
        FROM recipe_tree rt
        JOIN stockly.recipe_ingredients ri ON ri.recipe_id = rt.recipe_id
        JOIN public.ingredients_library il ON il.id = ri.ingredient_id  -- FIXED: was ri.stock_item_id
        WHERE il.linked_recipe_id IS NOT NULL
          AND rt.depth < v_max_depth
      )
      SELECT EXISTS (
        SELECT 1 FROM recipe_tree WHERE recipe_id = p_recipe_id
      ) INTO v_has_circular;
      
      RETURN COALESCE(v_has_circular, FALSE);
    END;
    $func$ LANGUAGE plpgsql;
  $sql3$;

  -- 4. Fix prevent_recipe_circular_dependency trigger function
  -- This function has NEW.stock_item_id on line 88
  EXECUTE $sql4$
    CREATE OR REPLACE FUNCTION prevent_recipe_circular_dependency()
    RETURNS TRIGGER AS $func$
    DECLARE
      v_ingredient_id UUID;
    BEGIN
      -- FIXED: Use ingredient_id instead of stock_item_id
      v_ingredient_id := COALESCE(NEW.ingredient_id, NEW.sub_recipe_id);  -- FIXED: was NEW.stock_item_id
      
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
  $sql4$;

  -- 5. Ensure triggers are recreated with correct functions
  DROP TRIGGER IF EXISTS update_allergens_on_ingredient_change ON stockly.recipe_ingredients;
  DROP TRIGGER IF EXISTS check_circular_before_insert ON stockly.recipe_ingredients;
  DROP TRIGGER IF EXISTS prevent_recipe_circular_reference ON stockly.recipe_ingredients;

  -- Recreate allergen trigger
  CREATE TRIGGER update_allergens_on_ingredient_change
    AFTER INSERT OR UPDATE OR DELETE ON stockly.recipe_ingredients
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_recipe_allergens();

  -- Recreate circular dependency trigger
  CREATE TRIGGER check_circular_before_insert
    BEFORE INSERT OR UPDATE ON stockly.recipe_ingredients
    FOR EACH ROW
    EXECUTE FUNCTION prevent_recipe_circular_dependency();

END $$;

