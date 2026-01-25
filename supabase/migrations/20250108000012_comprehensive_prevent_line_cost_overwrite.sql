-- COMPREHENSIVE FIX: Prevent ALL functions and triggers from overwriting line_cost
-- This migration ensures that line_cost values saved by the application are NEVER overwritten
-- by any database trigger or function.
-- This migration only runs if stockly schema exists
DO $$
BEGIN
  -- Check if stockly schema exists - exit early if it doesn't
  IF NOT EXISTS (
    SELECT 1 FROM pg_namespace WHERE nspname = 'stockly'
  ) THEN
    RAISE NOTICE 'stockly schema does not exist - skipping comprehensive_prevent_line_cost_overwrite migration';
    RETURN;
  END IF;
  
  RAISE NOTICE 'stockly schema found - proceeding with comprehensive_prevent_line_cost_overwrite migration';
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
  -- 1. Drop ALL versions of stockly.calculate_recipe_cost (JSONB and NUMERIC)
  --    We'll recreate only the safe NUMERIC version that doesn't update line_cost
  -- ============================================================================

  DROP FUNCTION IF EXISTS stockly.calculate_recipe_cost(UUID) CASCADE;
  DROP FUNCTION IF EXISTS stockly.calculate_recipe_cost(UUID, BOOLEAN) CASCADE;

  -- ============================================================================
  -- 2. Recreate stockly.calculate_recipe_cost as NUMERIC function that ONLY sums line_cost
  --    This function MUST NEVER update line_cost in recipe_ingredients
  -- ============================================================================

  EXECUTE $sql1$
    CREATE OR REPLACE FUNCTION stockly.calculate_recipe_cost(p_recipe_id UUID)
    RETURNS NUMERIC AS $func$
    DECLARE
      v_total_cost NUMERIC := 0;
    BEGIN
      -- CRITICAL: Only sum existing line_costs, DO NOT recalculate or update them
      -- The application calculates and saves line_cost, we must preserve it
      SELECT COALESCE(SUM(ri.line_cost), 0)
      INTO v_total_cost
      FROM stockly.recipe_ingredients ri
      WHERE ri.recipe_id = p_recipe_id;
      
      -- Update the recipe's total_cost and total_ingredient_cost (if columns exist)
      -- But DO NOT update line_cost in recipe_ingredients
      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'stockly' 
        AND table_name = 'recipes' 
        AND column_name = 'total_cost'
      ) THEN
        UPDATE stockly.recipes
        SET total_cost = v_total_cost,
            last_costed_at = NOW()
        WHERE id = p_recipe_id;
      END IF;
      
      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'stockly' 
        AND table_name = 'recipes' 
        AND column_name = 'total_ingredient_cost'
      ) THEN
        UPDATE stockly.recipes
        SET total_ingredient_cost = v_total_cost,
            last_cost_calculated_at = NOW()
        WHERE id = p_recipe_id;
      END IF;
      
      RETURN v_total_cost;
    END;
    $func$ LANGUAGE plpgsql SECURITY DEFINER;
  $sql1$;

  -- ============================================================================
  -- 3. Ensure trigger_recalculate_recipe ONLY sums line_cost, never updates it
  -- ============================================================================

  DROP FUNCTION IF EXISTS stockly.trigger_recalculate_recipe() CASCADE;

  EXECUTE $sql2$
    CREATE OR REPLACE FUNCTION stockly.trigger_recalculate_recipe()
    RETURNS TRIGGER AS $func$
    BEGIN
      -- CRITICAL: Only call calculate_recipe_cost which sums line_cost
      -- This function does NOT update line_cost in recipe_ingredients
      IF TG_OP = 'DELETE' THEN
        PERFORM stockly.calculate_recipe_cost(OLD.recipe_id);
      ELSE
        PERFORM stockly.calculate_recipe_cost(NEW.recipe_id);
      END IF;
      
      RETURN COALESCE(NEW, OLD);
    END;
    $func$ LANGUAGE plpgsql;
  $sql2$;

  -- ============================================================================
  -- 4. Ensure calculate_recipe_total_cost uses line_cost if it exists
  --    (This is called by update_recipe_costs_and_propagate)
  -- ============================================================================

  DROP FUNCTION IF EXISTS calculate_recipe_total_cost(UUID) CASCADE;

  EXECUTE $sql3$
    CREATE OR REPLACE FUNCTION calculate_recipe_total_cost(p_recipe_id UUID)
    RETURNS DECIMAL AS $func$
    DECLARE
      v_total_cost DECIMAL := 0;
    BEGIN
      -- CRITICAL: Use line_cost if it exists (saved by application)
      -- Only recalculate if line_cost is NULL or 0 (fallback)
      SELECT COALESCE(SUM(
        CASE 
          WHEN ri.line_cost IS NOT NULL AND ri.line_cost > 0 THEN
            -- Use the saved line_cost (already calculated with yield factor)
            ri.line_cost
          ELSE
            -- Fallback: calculate if line_cost not set (shouldn't happen if app saves correctly)
            CASE 
              WHEN i.yield_percent IS NOT NULL AND i.yield_percent > 0 THEN
                (i.unit_cost * ri.quantity) / (i.yield_percent / 100.0)
              ELSE
                COALESCE(i.unit_cost, 0) * ri.quantity
            END
        END
      ), 0)
      INTO v_total_cost
      FROM stockly.recipe_ingredients ri
      LEFT JOIN public.ingredients_library i ON i.id = ri.ingredient_id
      WHERE ri.recipe_id = p_recipe_id;
      
      RETURN v_total_cost;
    END;
    $func$ LANGUAGE plpgsql SECURITY DEFINER;
  $sql3$;

  -- ============================================================================
  -- 5. Drop and recreate ALL triggers on stockly.recipe_ingredients
  --    Ensure they don't call any function that updates line_cost
  -- ============================================================================

  -- Drop ALL existing triggers
  DROP TRIGGER IF EXISTS recipe_ingredients_changed ON stockly.recipe_ingredients;
  DROP TRIGGER IF EXISTS auto_update_recipe_costs ON stockly.recipe_ingredients;
  DROP TRIGGER IF EXISTS flag_sop_on_recipe_change ON stockly.recipe_ingredients;
  DROP TRIGGER IF EXISTS update_allergens_on_ingredient_change ON stockly.recipe_ingredients;
  DROP TRIGGER IF EXISTS recipe_ingredients_updated_at ON stockly.recipe_ingredients;

  -- Recreate recipe_ingredients_changed trigger (only sums line_cost, doesn't update it)
  CREATE TRIGGER recipe_ingredients_changed
    AFTER INSERT OR UPDATE OR DELETE ON stockly.recipe_ingredients
    FOR EACH ROW 
    EXECUTE FUNCTION stockly.trigger_recalculate_recipe();

  -- Recreate auto_update_recipe_costs trigger (calls update_recipe_costs_and_propagate)
  -- This is safe because update_recipe_costs_and_propagate calls calculate_recipe_total_cost
  -- which uses line_cost if it exists
  CREATE TRIGGER auto_update_recipe_costs
    AFTER INSERT OR UPDATE OR DELETE ON stockly.recipe_ingredients
    FOR EACH ROW
    EXECUTE FUNCTION trigger_recipe_cost_update();

  -- Recreate flag_sop_on_recipe_change trigger (safe, doesn't touch line_cost)
  CREATE TRIGGER flag_sop_on_recipe_change
    AFTER INSERT OR UPDATE OR DELETE ON stockly.recipe_ingredients
    FOR EACH ROW
    EXECUTE FUNCTION trigger_flag_sop_update();

  -- Recreate update_allergens_on_ingredient_change trigger (safe, doesn't touch line_cost)
  CREATE TRIGGER update_allergens_on_ingredient_change
    AFTER INSERT OR UPDATE OR DELETE ON stockly.recipe_ingredients
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_recipe_allergens();

  -- Recreate updated_at trigger (safe, only updates timestamp)
  CREATE TRIGGER recipe_ingredients_updated_at
    BEFORE UPDATE ON stockly.recipe_ingredients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

  -- ============================================================================
  -- 6. Add a constraint/check to prevent accidental line_cost updates
  --    This is a safeguard - if any function tries to set line_cost to 0 or NULL
  --    when it was previously set, we'll catch it (but we won't block valid updates)
  -- ============================================================================

  -- Note: We can't add a CHECK constraint that prevents overwriting because
  -- the application needs to be able to update line_cost. Instead, we rely on
  -- ensuring all triggers and functions preserve line_cost.

END $$;

