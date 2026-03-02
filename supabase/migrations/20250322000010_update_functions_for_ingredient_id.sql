-- ============================================================================
-- Migration: 20250322000010_update_functions_for_ingredient_id.sql
-- Description: Update all database functions to use ingredient_id instead of stock_item_id
-- ============================================================================

DO $$
BEGIN
  -- ============================================================================
  -- Update calculate_recipe_cost() function
  -- ============================================================================
  DROP FUNCTION IF EXISTS calculate_recipe_cost(UUID);
  
  CREATE OR REPLACE FUNCTION calculate_recipe_cost(p_recipe_id UUID)
  RETURNS NUMERIC AS $calc_function$
  DECLARE
    v_total_cost NUMERIC := 0;
    v_ingredient_cost NUMERIC;
    v_quantity NUMERIC;
    v_unit_cost NUMERIC;
    v_yield_percent NUMERIC;
  BEGIN
    -- Sum up costs of all ingredients in the recipe
    FOR v_ingredient_cost, v_quantity, v_unit_cost, v_yield_percent IN
      SELECT 
        -- Calculate effective cost: unit_cost × quantity × (1 / (yield_percent / 100))
        CASE 
          WHEN COALESCE(i.yield_percent, 100) > 0 THEN
            COALESCE(
              -- Use unit_cost if it exists, otherwise calculate from pack_cost/pack_size
              CASE 
                WHEN i.unit_cost IS NOT NULL AND i.unit_cost > 0 THEN i.unit_cost
                WHEN i.pack_cost IS NOT NULL AND i.pack_size IS NOT NULL AND i.pack_size > 0 THEN
                  i.pack_cost / i.pack_size
                ELSE 0
              END,
              0
            ) * ri.quantity * (100.0 / COALESCE(i.yield_percent, 100))
          ELSE 0
        END as ingredient_cost,
        ri.quantity,
        COALESCE(
          i.unit_cost,
          CASE 
            WHEN i.pack_cost IS NOT NULL AND i.pack_size IS NOT NULL AND i.pack_size > 0 THEN
              i.pack_cost / i.pack_size
            ELSE 0
          END
        ) as unit_cost,
        COALESCE(i.yield_percent, 100) as yield_percent
      FROM stockly.recipe_ingredients ri
      JOIN public.ingredients_library i ON i.id = ri.ingredient_id
      WHERE ri.recipe_id = p_recipe_id
        AND ri.ingredient_id IS NOT NULL
    LOOP
      v_total_cost := v_total_cost + COALESCE(v_ingredient_cost, 0);
    END LOOP;
    
    RETURN v_total_cost;
  END;
  $calc_function$ LANGUAGE plpgsql;

  -- ============================================================================
  -- Update propagate_cost_to_parent_recipes() function
  -- ============================================================================
  DROP FUNCTION IF EXISTS propagate_cost_to_parent_recipes(UUID);
  
  CREATE OR REPLACE FUNCTION propagate_cost_to_parent_recipes(p_ingredient_id UUID)
  RETURNS void AS $propagate_function$
  DECLARE
    v_recipe_id UUID;
  BEGIN
    -- Find all recipes that use this ingredient
    FOR v_recipe_id IN
      SELECT DISTINCT ri.recipe_id
      FROM stockly.recipe_ingredients ri
      WHERE ri.ingredient_id = p_ingredient_id
    LOOP
      -- Recalculate each parent recipe's cost
      PERFORM update_recipe_and_ingredient_cost(v_recipe_id);
    END LOOP;
  END;
  $propagate_function$ LANGUAGE plpgsql;

  -- ============================================================================
  -- update_recipe_and_ingredient_cost() doesn't need changes (no direct stock_item_id reference)
  -- ============================================================================

  -- ============================================================================
  -- Update update_recipe_allergens() function
  -- ============================================================================
  DROP FUNCTION IF EXISTS update_recipe_allergens(UUID);
  
  CREATE OR REPLACE FUNCTION update_recipe_allergens(p_recipe_id UUID)
  RETURNS void AS $function$
  DECLARE
    v_allergens TEXT[];
  BEGIN
    -- Collect all unique allergens from recipe ingredients
    -- Works with ingredients_library table
    SELECT ARRAY_AGG(DISTINCT allergen)
    INTO v_allergens
    FROM (
      SELECT UNNEST(i.allergens) as allergen
      FROM stockly.recipe_ingredients ri
      JOIN public.ingredients_library i ON i.id = ri.ingredient_id
      WHERE ri.recipe_id = p_recipe_id
        AND ri.ingredient_id IS NOT NULL
        AND i.allergens IS NOT NULL
        AND array_length(i.allergens, 1) > 0
    ) sub
    WHERE allergen IS NOT NULL
      AND allergen != '';
    
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
  $function$ LANGUAGE plpgsql;

  -- ============================================================================
  -- Update check_recipe_circular_dependency() function
  -- ============================================================================
  DROP FUNCTION IF EXISTS check_recipe_circular_dependency(UUID, UUID);
  
  CREATE OR REPLACE FUNCTION check_recipe_circular_dependency(
    p_recipe_id UUID,
    p_ingredient_id UUID
  ) RETURNS BOOLEAN AS $function$
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
      JOIN public.ingredients_library il ON il.id = ri.ingredient_id
      WHERE il.linked_recipe_id IS NOT NULL
        AND rt.depth < v_max_depth
    )
    SELECT EXISTS (
      SELECT 1 FROM recipe_tree WHERE recipe_id = p_recipe_id
    ) INTO v_has_circular;
    
    RETURN COALESCE(v_has_circular, FALSE);
  END;
  $function$ LANGUAGE plpgsql;

  -- ============================================================================
  -- Update prevent_recipe_circular_dependency() trigger function
  -- ============================================================================
  -- Drop trigger first, then drop function
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'stockly' 
    AND table_name = 'recipe_ingredients'
    AND table_type = 'BASE TABLE'
  ) THEN
    DROP TRIGGER IF EXISTS check_circular_before_insert ON stockly.recipe_ingredients;
  END IF;
  
  DROP FUNCTION IF EXISTS prevent_recipe_circular_dependency();
  
  CREATE OR REPLACE FUNCTION prevent_recipe_circular_dependency()
  RETURNS TRIGGER AS $trigger$
  DECLARE
    v_ingredient_id UUID;
  BEGIN
    -- Determine ingredient ID based on recipe_ingredients structure
    -- New system: uses ingredient_id pointing to ingredients_library
    -- Old system: uses sub_recipe_id pointing to recipes
    v_ingredient_id := COALESCE(NEW.ingredient_id, NEW.sub_recipe_id);
    
    IF v_ingredient_id IS NULL THEN
      RETURN NEW; -- No ingredient specified, skip check
    END IF;
    
    -- Check for circular dependency
    IF check_recipe_circular_dependency(NEW.recipe_id, v_ingredient_id) THEN
      RAISE EXCEPTION 'Circular dependency detected: This ingredient''s recipe would create a loop';
    END IF;
    
    RETURN NEW;
  END;
  $trigger$ LANGUAGE plpgsql;
  
  -- Recreate the trigger
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

  -- ============================================================================
  -- trigger_update_recipe_allergens() doesn't need changes (no direct stock_item_id reference)
  -- ============================================================================

  -- ============================================================================
  -- trigger_recipe_cost_update() doesn't need changes (no direct stock_item_id reference)
  -- ============================================================================

  RAISE NOTICE 'Migration 20250322000010 completed successfully - all functions updated to use ingredient_id';
END $$;

