-- Fix recipe_cost_history insert to use correct column names
-- This migration only runs if stockly schema exists
DO $$
BEGIN
  -- Check if stockly schema exists - exit early if it doesn't
  IF NOT EXISTS (
    SELECT 1 FROM pg_namespace WHERE nspname = 'stockly'
  ) THEN
    RAISE NOTICE 'stockly schema does not exist - skipping fix_recipe_cost_history_insert migration';
    RETURN;
  END IF;
  
  RAISE NOTICE 'stockly schema found - proceeding with fix_recipe_cost_history_insert migration';
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

  -- Check what columns actually exist in recipe_cost_history
  -- The migration is trying to insert unit_cost but the table might have different column names

  -- First, let's make the insert conditional and use the correct column names
  -- Based on the table definition in 05-stockly-recipes.sql, the table has:
  -- recipe_id, total_cost, cost_per_unit, yield_quantity, costed_at, company_id

  -- Use dollar-quoting to avoid quote escaping issues
  EXECUTE $sql$
    CREATE OR REPLACE FUNCTION stockly.update_recipe_costs_and_propagate(p_recipe_id UUID)
    RETURNS void AS $func$
    DECLARE
      v_total_cost DECIMAL;
      v_yield_qty DECIMAL;
      v_unit_cost DECIMAL;
      v_output_ingredient_id UUID;
      v_company_id UUID;
    BEGIN
      -- Calculate total cost
      v_total_cost := stockly.calculate_recipe_total_cost(p_recipe_id);
      
      -- Calculate yield
      v_yield_qty := stockly.calculate_recipe_yield(p_recipe_id);
      
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
        -- Based on 05-stockly-recipes.sql, the table has:
        -- recipe_id, costed_at, total_cost, cost_per_portion, gp_percent, trigger_type, trigger_details, costed_by
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'stockly' AND tablename = 'recipe_cost_history') THEN
          -- Insert using the correct column names from the actual table schema
          INSERT INTO stockly.recipe_cost_history (
            recipe_id,
            total_cost,
            cost_per_portion,
            costed_at,
            trigger_type
          ) VALUES (
            p_recipe_id,
            v_total_cost,
            v_unit_cost,  -- unit_cost maps to cost_per_portion
            NOW(),
            'ingredient_change'
          ) ON CONFLICT DO NOTHING;
        END IF;
        
        -- Propagate cost changes to parent recipes (recursive)
        PERFORM stockly.propagate_cost_to_parent_recipes(v_output_ingredient_id);
      END IF;
    END;
    $func$ LANGUAGE plpgsql SECURITY DEFINER;
  $sql$;
END $$;

