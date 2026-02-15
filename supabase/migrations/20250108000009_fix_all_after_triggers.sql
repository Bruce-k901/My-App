-- Fix ALL AFTER triggers and their functions to use ingredient_id
-- This ensures no function called by triggers references stock_item_id
-- This migration only runs if stockly schema exists
DO $$
BEGIN
  -- Check if stockly schema exists - exit early if it doesn't
  IF NOT EXISTS (
    SELECT 1 FROM pg_namespace WHERE nspname = 'stockly'
  ) THEN
    RAISE NOTICE 'stockly schema does not exist - skipping fix_all_after_triggers migration';
    RETURN;
  END IF;
  
  RAISE NOTICE 'stockly schema found - proceeding with fix_all_after_triggers migration';
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

  -- ============================================================================
  -- 1. Fix calculate_recipe_total_cost function (used by cost update trigger)
  -- ============================================================================

  EXECUTE $sql1$
    CREATE OR REPLACE FUNCTION calculate_recipe_total_cost(p_recipe_id UUID)
    RETURNS DECIMAL AS $func$
    DECLARE
      v_total_cost DECIMAL := 0;
    BEGIN
      -- IMPORTANT: Use line_cost if it exists (saved by application)
      -- Only recalculate if line_cost is NULL or 0
      -- This preserves the costs calculated and saved by the application
      SELECT COALESCE(SUM(
        CASE 
          WHEN ri.line_cost IS NOT NULL AND ri.line_cost > 0 THEN
            -- Use the saved line_cost (already calculated with yield factor)
            ri.line_cost
          ELSE
            -- Fallback: calculate if line_cost not set
            CASE 
              WHEN i.yield_percent IS NOT NULL AND i.yield_percent > 0 THEN
                (i.unit_cost * ri.quantity) / (i.yield_percent / 100.0)
              ELSE
                i.unit_cost * ri.quantity
            END
        END
      ), 0)
      INTO v_total_cost
      FROM stockly.recipe_ingredients ri
      LEFT JOIN public.ingredients_library i ON i.id = ri.ingredient_id  -- LEFT JOIN in case ingredient not found
      WHERE ri.recipe_id = p_recipe_id;
      
      RETURN v_total_cost;
    END;
    $func$ LANGUAGE plpgsql SECURITY DEFINER;
  $sql1$;

  -- ============================================================================
  -- 2. Fix calculate_recipe_yield function
  -- ============================================================================

  EXECUTE $sql2$
    CREATE OR REPLACE FUNCTION calculate_recipe_yield(p_recipe_id UUID)
    RETURNS DECIMAL AS $func$
    DECLARE
      v_total_yield DECIMAL := 0;
    BEGIN
      -- Sum quantities of all ingredients
      SELECT COALESCE(SUM(ri.quantity), 0)
      INTO v_total_yield
      FROM stockly.recipe_ingredients ri
      WHERE ri.recipe_id = p_recipe_id;
      
      RETURN v_total_yield;
    END;
    $func$ LANGUAGE plpgsql SECURITY DEFINER;
  $sql2$;

  -- ============================================================================
  -- 3. Fix update_recipe_costs_and_propagate function
  -- ============================================================================

  EXECUTE $sql3$
    CREATE OR REPLACE FUNCTION update_recipe_costs_and_propagate(p_recipe_id UUID)
    RETURNS void AS $func$
    DECLARE
      v_total_cost DECIMAL;
      v_yield_qty DECIMAL;
      v_unit_cost DECIMAL;
      v_output_ingredient_id UUID;
      v_company_id UUID;
    BEGIN
      -- Calculate total cost
      v_total_cost := calculate_recipe_total_cost(p_recipe_id);
      
      -- Calculate yield
      v_yield_qty := calculate_recipe_yield(p_recipe_id);
      
      -- Calculate unit cost
      IF v_yield_qty > 0 THEN
        v_unit_cost := v_total_cost / v_yield_qty;
      ELSE
        v_unit_cost := 0;
      END IF;
      
      -- Update recipe with calculated values
      UPDATE stockly.recipes
      SET 
        total_ingredient_cost = v_total_cost,
        calculated_yield_qty = v_yield_qty,
        unit_cost = v_unit_cost,
        last_cost_calculated_at = NOW()
      WHERE id = p_recipe_id
      RETURNING output_ingredient_id, company_id 
      INTO v_output_ingredient_id, v_company_id;
      
      -- If recipe is linked to a prep item, update the ingredient's unit_cost
      IF v_output_ingredient_id IS NOT NULL THEN
        UPDATE public.ingredients_library
        SET 
          unit_cost = v_unit_cost,
          last_cost_update = NOW()
        WHERE id = v_output_ingredient_id
          AND is_prep_item = true;
        
        -- Record cost history for tracking (if table exists)
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'stockly' AND table_name = 'recipe_cost_history') THEN
          INSERT INTO stockly.recipe_cost_history (
            recipe_id,
            total_cost,
            cost_per_portion,
            costed_at,
            trigger_type
          ) VALUES (
            p_recipe_id,
            v_total_cost,
            v_unit_cost,
            NOW(),
            'ingredient_change'
          ) ON CONFLICT DO NOTHING;
        END IF;
        
        -- Propagate cost changes to parent recipes (recursive)
        PERFORM propagate_cost_to_parent_recipes(v_output_ingredient_id);
      END IF;
  END;
  $func$ LANGUAGE plpgsql SECURITY DEFINER;
  $sql3$;

  -- ============================================================================
  -- 4. Fix propagate_cost_to_parent_recipes function
  -- ============================================================================

  EXECUTE $sql4$
    CREATE OR REPLACE FUNCTION propagate_cost_to_parent_recipes(p_ingredient_id UUID)
    RETURNS void AS $func$
    DECLARE
      v_recipe_id UUID;
    BEGIN
      -- Find all recipes that use this ingredient
      -- FIXED: Use ingredient_id, NOT stock_item_id
      FOR v_recipe_id IN
        SELECT DISTINCT recipe_id
        FROM stockly.recipe_ingredients
        WHERE ingredient_id = p_ingredient_id  -- FIXED: NOT stock_item_id
      LOOP
        -- Recalculate each parent recipe (this will cascade)
        PERFORM update_recipe_costs_and_propagate(v_recipe_id);
      END LOOP;
  END;
  $func$ LANGUAGE plpgsql SECURITY DEFINER;
  $sql4$;

  -- ============================================================================
  -- 5. Fix trigger_recipe_cost_update function (AFTER trigger)
  -- ============================================================================

  EXECUTE $sql5$
    CREATE OR REPLACE FUNCTION trigger_recipe_cost_update()
    RETURNS TRIGGER AS $func$
    BEGIN
      IF TG_OP = 'DELETE' THEN
        PERFORM update_recipe_costs_and_propagate(OLD.recipe_id);
      ELSE
        PERFORM update_recipe_costs_and_propagate(NEW.recipe_id);
      END IF;
      RETURN COALESCE(NEW, OLD);
  END;
  $func$ LANGUAGE plpgsql;
  $sql5$;

  -- ============================================================================
  -- 6. Fix check_sop_needs_update function (used by SOP linking trigger)
  -- ============================================================================

  EXECUTE $sql6$
    CREATE OR REPLACE FUNCTION check_sop_needs_update(p_recipe_id UUID)
    RETURNS BOOLEAN AS $func$
    DECLARE
      v_recipe_updated_at TIMESTAMPTZ;
      v_sop_synced_at TIMESTAMPTZ;
      v_ingredient_count INTEGER;
    BEGIN
      -- Get recipe's last update time
      SELECT updated_at INTO v_recipe_updated_at
      FROM stockly.recipes
      WHERE id = p_recipe_id;
      
      -- Get SOP's last sync time
      SELECT last_synced_with_recipe_at INTO v_sop_synced_at
      FROM public.sop_entries
      WHERE linked_recipe_id = p_recipe_id
      LIMIT 1;
      
      -- If SOP was never synced, it needs update
      IF v_sop_synced_at IS NULL THEN
        RETURN TRUE;
      END IF;
      
      -- If recipe was updated after last sync, it needs update
      IF v_recipe_updated_at > v_sop_synced_at THEN
        RETURN TRUE;
      END IF;
      
      -- Check if ingredient count changed (simplified check)
      SELECT COUNT(*) INTO v_ingredient_count
      FROM stockly.recipe_ingredients
      WHERE recipe_id = p_recipe_id;
      
      -- If we can't determine, assume it needs update
      RETURN TRUE;
  END;
  $func$ LANGUAGE plpgsql;
  $sql6$;

  -- ============================================================================
  -- 7. Fix trigger_flag_sop_update function (AFTER trigger)
  -- ============================================================================

  EXECUTE $sql7$
    CREATE OR REPLACE FUNCTION trigger_flag_sop_update()
    RETURNS TRIGGER AS $func$
    DECLARE
      v_linked_sop_id UUID;
      v_needs_update BOOLEAN;
    BEGIN
      -- Get linked SOP ID from recipe
      SELECT linked_sop_id INTO v_linked_sop_id
      FROM stockly.recipes
      WHERE id = COALESCE(NEW.recipe_id, OLD.recipe_id);
      
      IF v_linked_sop_id IS NOT NULL THEN
        -- Check if SOP needs update
        v_needs_update := check_sop_needs_update(COALESCE(NEW.recipe_id, OLD.recipe_id));
        
        -- Update SOP entry
        UPDATE public.sop_entries
        SET needs_update = v_needs_update
        WHERE id = v_linked_sop_id;
      END IF;
      
      RETURN COALESCE(NEW, OLD);
  END;
  $func$ LANGUAGE plpgsql;
  $sql7$;

  -- ============================================================================
  -- 8. Ensure triggers are correctly set up
  -- ============================================================================

  -- Drop and recreate cost update trigger
  DROP TRIGGER IF EXISTS auto_update_recipe_costs ON stockly.recipe_ingredients;
  CREATE TRIGGER auto_update_recipe_costs
    AFTER INSERT OR UPDATE OR DELETE ON stockly.recipe_ingredients
    FOR EACH ROW
    EXECUTE FUNCTION trigger_recipe_cost_update();

  -- Drop and recreate SOP flag trigger
  DROP TRIGGER IF EXISTS flag_sop_on_recipe_change ON stockly.recipe_ingredients;
  CREATE TRIGGER flag_sop_on_recipe_change
    AFTER INSERT OR UPDATE OR DELETE ON stockly.recipe_ingredients
    FOR EACH ROW
    EXECUTE FUNCTION trigger_flag_sop_update();

  -- ============================================================================
  -- 9. Fix stockly.calculate_recipe_cost function (called by trigger_recalculate_recipe)
  -- ============================================================================

  -- Drop the function first if it exists (to avoid return type conflicts)
  DROP FUNCTION IF EXISTS stockly.calculate_recipe_cost(UUID) CASCADE;

  -- Recreate it with correct ingredient_id references
  -- NOTE: This function should NOT update line_cost in recipe_ingredients
  -- The line_cost is calculated and saved by the application
  -- This function only calculates the total recipe cost
  EXECUTE $sql8$
    CREATE OR REPLACE FUNCTION stockly.calculate_recipe_cost(p_recipe_id UUID)
    RETURNS NUMERIC AS $func$
    DECLARE
      v_total_cost NUMERIC := 0;
    BEGIN
      -- Sum up line_cost from all ingredients (line_cost is already calculated)
      -- If line_cost is NULL, calculate it from quantity, unit_cost, and yield_percent
      SELECT COALESCE(SUM(
        CASE 
          WHEN ri.line_cost IS NOT NULL AND ri.line_cost > 0 THEN
            ri.line_cost
          ELSE
            -- Calculate line_cost if not set: (unit_cost * quantity) / (yield_percent / 100)
            COALESCE(
              (i.unit_cost * ri.quantity) / NULLIF(COALESCE(i.yield_percent, 100) / 100.0, 0),
              0
            )
        END
      ), 0)
      INTO v_total_cost
      FROM stockly.recipe_ingredients ri
      LEFT JOIN public.ingredients_library i ON i.id = ri.ingredient_id
      WHERE ri.recipe_id = p_recipe_id
        AND ri.ingredient_id IS NOT NULL;
      
      RETURN v_total_cost;
    END;
    $func$ LANGUAGE plpgsql SECURITY DEFINER;
  $sql8$;

  -- ============================================================================
  -- 10. Fix trigger_recalculate_recipe function (from 05-stockly-recipes.sql)
  -- ============================================================================

  -- Drop and recreate to ensure it doesn't overwrite line_cost
  DROP FUNCTION IF EXISTS stockly.trigger_recalculate_recipe() CASCADE;

  -- Recreate trigger function - but DON'T call calculate_recipe_cost
  -- because it might overwrite line_cost that was just saved
  -- Instead, just update the recipe's total_cost using the sum of line_costs
  EXECUTE $sql9$
    CREATE OR REPLACE FUNCTION stockly.trigger_recalculate_recipe()
    RETURNS TRIGGER AS $func$
    DECLARE
      v_total_cost NUMERIC;
    BEGIN
      -- Calculate total cost from sum of line_costs (don't recalculate line_costs)
      SELECT COALESCE(SUM(ri.line_cost), 0)
      INTO v_total_cost
      FROM stockly.recipe_ingredients ri
      WHERE ri.recipe_id = COALESCE(NEW.recipe_id, OLD.recipe_id);
      
      -- Update recipe's total_cost (if the column exists)
      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'stockly' 
        AND table_name = 'recipes' 
        AND column_name = 'total_cost'
      ) THEN
        UPDATE stockly.recipes
        SET total_cost = v_total_cost,
            last_costed_at = NOW()
        WHERE id = COALESCE(NEW.recipe_id, OLD.recipe_id);
      END IF;
      
      RETURN COALESCE(NEW, OLD);
  END;
  $func$ LANGUAGE plpgsql;
  $sql9$;

  -- ============================================================================
  -- 11. Fix any other triggers that might exist
  -- ============================================================================

  -- Drop old triggers that might reference stock_item_id
  DROP TRIGGER IF EXISTS update_allergens_on_ingredient_change ON stockly.recipe_ingredients;
  DROP TRIGGER IF EXISTS update_recipe_cost_on_ingredient_change ON stockly.recipe_ingredients;
  DROP TRIGGER IF EXISTS recipe_ingredients_changed ON stockly.recipe_ingredients;

  -- Recreate allergen trigger with correct function (already fixed in migration 20250108000006)
  CREATE TRIGGER update_allergens_on_ingredient_change
    AFTER INSERT OR UPDATE OR DELETE ON stockly.recipe_ingredients
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_recipe_allergens();

  -- Recreate recipe_ingredients_changed trigger with the fixed function
  CREATE TRIGGER recipe_ingredients_changed
    AFTER INSERT OR UPDATE OR DELETE ON stockly.recipe_ingredients
    FOR EACH ROW 
    EXECUTE FUNCTION stockly.trigger_recalculate_recipe();

END $$;

