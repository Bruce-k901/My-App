-- ============================================================================
-- Migration: 20250322000006_recipe_cost_calculation.sql
-- Description: Calculates recipe costs from ingredients (with yield_percent),
--              updates prep item costs, and propagates cost changes up recipe tree
-- ============================================================================

DO $$
BEGIN
  -- Check if stockly schema exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_namespace WHERE nspname = 'stockly'
  ) THEN
    RAISE NOTICE 'stockly schema does not exist - skipping recipe_cost_calculation migration';
    RETURN;
  END IF;

  -- Check if stockly.recipe_ingredients table exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'stockly' 
    AND table_name = 'recipe_ingredients' 
    AND table_type = 'BASE TABLE'
  ) THEN
    RAISE NOTICE 'stockly.recipe_ingredients table does not exist - skipping recipe_cost_calculation migration';
    RETURN;
  END IF;

  -- Drop existing functions if they exist
  -- Note: public.recipe_ingredients is a VIEW, so we need to drop trigger from stockly.recipe_ingredients
  DROP FUNCTION IF EXISTS calculate_recipe_cost(UUID);
  DROP FUNCTION IF EXISTS update_recipe_and_ingredient_cost(UUID);
  DROP FUNCTION IF EXISTS propagate_cost_to_parent_recipes(UUID);
  DROP FUNCTION IF EXISTS trigger_recipe_cost_update();
  DROP TRIGGER IF EXISTS update_recipe_cost_on_ingredient_change ON stockly.recipe_ingredients;

  -- ============================================================================
  -- Function: calculate_recipe_cost
  -- Sums ingredient costs with yield_percent adjustment
  -- Formula: ingredient.unit_cost × quantity × (1 / (yield_percent / 100))
  -- ============================================================================
  EXECUTE $sql_func1$
    CREATE OR REPLACE FUNCTION calculate_recipe_cost(p_recipe_id UUID)
    RETURNS NUMERIC AS $func$
    DECLARE
      v_total_cost NUMERIC := 0;
      v_ingredient_cost NUMERIC;
      v_quantity NUMERIC;
      v_unit_cost NUMERIC;
      v_yield_percent NUMERIC;
    BEGIN
      -- Sum up costs of all ingredients in the recipe
      -- Only if ingredients_library exists
      IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'ingredients_library'
      ) THEN
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
          JOIN public.ingredients_library i ON i.id = ri.stock_item_id
          WHERE ri.recipe_id = p_recipe_id
            AND ri.stock_item_id IS NOT NULL
        LOOP
          v_total_cost := v_total_cost + COALESCE(v_ingredient_cost, 0);
        END LOOP;
      END IF;
      
      RETURN v_total_cost;
    END;
    $func$ LANGUAGE plpgsql;
  $sql_func1$;

  -- ============================================================================
  -- Function: propagate_cost_to_parent_recipes
  -- Recursively updates parent recipe costs when a prep item cost changes
  -- ============================================================================
  EXECUTE $sql_func2$
    CREATE OR REPLACE FUNCTION propagate_cost_to_parent_recipes(p_ingredient_id UUID)
    RETURNS void AS $func$
    DECLARE
      v_recipe_id UUID;
    BEGIN
      -- Find all recipes that use this ingredient
      FOR v_recipe_id IN
        SELECT DISTINCT ri.recipe_id
        FROM stockly.recipe_ingredients ri
        WHERE ri.stock_item_id = p_ingredient_id
      LOOP
        -- Recalculate each parent recipe's cost
        PERFORM update_recipe_and_ingredient_cost(v_recipe_id);
      END LOOP;
    END;
    $func$ LANGUAGE plpgsql;
  $sql_func2$;

  -- ============================================================================
  -- Function: update_recipe_and_ingredient_cost
  -- Updates recipe cost AND linked prep item's unit_cost
  -- Also propagates cost changes up the recipe tree
  -- ============================================================================
  EXECUTE $sql_func3$
    CREATE OR REPLACE FUNCTION update_recipe_and_ingredient_cost(p_recipe_id UUID)
    RETURNS void AS $func$
    DECLARE
      v_recipe_cost NUMERIC;
      v_output_ingredient_id UUID;
      v_yield_qty NUMERIC;
      v_unit_cost NUMERIC;
      v_has_ingredient_cost_column BOOLEAN;
    BEGIN
      -- Calculate total recipe cost
      v_recipe_cost := calculate_recipe_cost(p_recipe_id);
      
      -- Check if ingredient_cost column exists on recipes table (must check stockly.recipes, not the view)
      IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'stockly' AND table_name = 'recipes'
      ) THEN
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'stockly' 
          AND table_name = 'recipes' 
          AND column_name = 'ingredient_cost'
        ) INTO v_has_ingredient_cost_column;
        
        -- Update recipe's ingredient_cost (must update stockly.recipes, not the view)
        IF v_has_ingredient_cost_column THEN
          UPDATE stockly.recipes
          SET ingredient_cost = v_recipe_cost
          WHERE id = p_recipe_id;
        END IF;
        
        -- Get output_ingredient_id and yield_qty (from stockly.recipes)
        SELECT output_ingredient_id, yield_qty
        INTO v_output_ingredient_id, v_yield_qty
        FROM stockly.recipes
        WHERE id = p_recipe_id;
        
        -- If this recipe is linked to a prep item ingredient, update its cost
        IF v_output_ingredient_id IS NOT NULL AND v_yield_qty IS NOT NULL AND v_yield_qty > 0 THEN
          -- Calculate unit cost (total cost / yield quantity)
          v_unit_cost := v_recipe_cost / v_yield_qty;
          
          -- Check if unit_cost column exists on ingredients_library
          IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'ingredients_library' 
            AND column_name = 'unit_cost'
          ) THEN
            UPDATE public.ingredients_library
            SET unit_cost = v_unit_cost
            WHERE id = v_output_ingredient_id
              AND is_prep_item = true;
          END IF;
          
          -- Propagate cost changes up the recipe tree
          -- (if this prep item is used in other recipes)
          PERFORM propagate_cost_to_parent_recipes(v_output_ingredient_id);
        END IF;
      END IF;
    END;
    $func$ LANGUAGE plpgsql;
  $sql_func3$;

  -- ============================================================================
  -- Function: trigger_recipe_cost_update (Trigger Function)
  -- Called after insert/update/delete on recipe_ingredients
  -- ============================================================================
  EXECUTE $sql_func4$
    CREATE OR REPLACE FUNCTION trigger_recipe_cost_update()
    RETURNS TRIGGER AS $func$
    BEGIN
      IF TG_OP = 'DELETE' THEN
        PERFORM update_recipe_and_ingredient_cost(OLD.recipe_id);
      ELSE
        PERFORM update_recipe_and_ingredient_cost(NEW.recipe_id);
      END IF;
      RETURN COALESCE(NEW, OLD);
    END;
    $func$ LANGUAGE plpgsql;
  $sql_func4$;

  -- ============================================================================
  -- Create trigger on recipe_ingredients (must be on stockly.recipe_ingredients, not the view)
  -- ============================================================================
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'stockly' 
    AND table_name = 'recipe_ingredients' 
    AND table_type = 'BASE TABLE'
  ) THEN
    CREATE TRIGGER update_recipe_cost_on_ingredient_change
      AFTER INSERT OR UPDATE OR DELETE ON stockly.recipe_ingredients
      FOR EACH ROW
      EXECUTE FUNCTION trigger_recipe_cost_update();
  END IF;

  RAISE NOTICE 'Recipe cost calculation migration completed successfully';
END $$;

