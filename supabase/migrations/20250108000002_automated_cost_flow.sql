-- Automated cost calculation and propagation system
-- This migration only runs if stockly schema exists
DO $$
BEGIN
  -- Check if stockly schema exists - exit early if it doesn't
  IF NOT EXISTS (
    SELECT 1 FROM pg_namespace WHERE nspname = 'stockly'
  ) THEN
    RAISE NOTICE 'stockly schema does not exist - skipping automated_cost_flow migration';
    RETURN;
  END IF;
  
  -- Check if recipes table exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'stockly' 
    AND tablename = 'recipes'
  ) THEN
    RAISE NOTICE 'stockly.recipes table does not exist - skipping automated_cost_flow migration';
    RETURN;
  END IF;
  
  RAISE NOTICE 'stockly schema and recipes table found - proceeding with automated_cost_flow migration';
END $$;

-- Only proceed if schema and table exist (checked above)
DO $$
BEGIN
  -- Check if stockly schema and recipes table exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_namespace WHERE nspname = 'stockly'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'stockly' 
    AND tablename = 'recipes'
  ) THEN
    RETURN;
  END IF;

  -- 1. Add computed fields to recipes table
  EXECUTE 'ALTER TABLE stockly.recipes
    ADD COLUMN IF NOT EXISTS total_ingredient_cost DECIMAL(12,4),
    ADD COLUMN IF NOT EXISTS calculated_yield_qty DECIMAL(12,4),
    ADD COLUMN IF NOT EXISTS unit_cost DECIMAL(12,4),
    ADD COLUMN IF NOT EXISTS last_cost_calculated_at TIMESTAMPTZ';

  -- 2. Add last_cost_update to ingredients_library if not exists
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'ingredients_library'
  ) THEN
    EXECUTE 'ALTER TABLE public.ingredients_library
      ADD COLUMN IF NOT EXISTS last_cost_update TIMESTAMPTZ';
  END IF;

  -- 3. Function to calculate recipe total cost
  EXECUTE '
  CREATE OR REPLACE FUNCTION calculate_recipe_total_cost(p_recipe_id UUID)
  RETURNS DECIMAL AS $func$
  DECLARE
    v_total_cost DECIMAL := 0;
  BEGIN
    -- Sum all ingredient costs with yield factor applied
    SELECT COALESCE(SUM(
      CASE 
        WHEN i.yield_percent IS NOT NULL AND i.yield_percent > 0 THEN
          (i.unit_cost * ri.quantity) / (i.yield_percent / 100.0)
        ELSE
          i.unit_cost * ri.quantity
      END
    ), 0)
    INTO v_total_cost
    FROM stockly.recipe_ingredients ri
    INNER JOIN public.ingredients_library i ON i.id = ri.ingredient_id
    WHERE ri.recipe_id = p_recipe_id;
    
    RETURN v_total_cost;
  END;
  $func$ LANGUAGE plpgsql SECURITY DEFINER;
  ';

  -- 4. Function to calculate recipe yield (sum of ingredient quantities)
  EXECUTE '
  CREATE OR REPLACE FUNCTION calculate_recipe_yield(p_recipe_id UUID)
  RETURNS DECIMAL AS $func$
  DECLARE
    v_total_yield DECIMAL := 0;
  BEGIN
    -- Sum quantities of all ingredients
    -- TODO: Add unit conversion when ingredients have different units
    SELECT COALESCE(SUM(ri.quantity), 0)
    INTO v_total_yield
    FROM stockly.recipe_ingredients ri
    WHERE ri.recipe_id = p_recipe_id;
    
    RETURN v_total_yield;
  END;
  $func$ LANGUAGE plpgsql SECURITY DEFINER;
  ';

  -- 5. Master function to update recipe costs and propagate back to ingredient
  EXECUTE '
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
    
    -- If recipe is linked to a prep item, update the ingredient''s unit_cost
    IF v_output_ingredient_id IS NOT NULL THEN
      UPDATE public.ingredients_library
      SET 
        unit_cost = v_unit_cost,
        last_cost_update = NOW()
      WHERE id = v_output_ingredient_id
        AND is_prep_item = true;
      
      -- Record cost history for tracking (if table exists)
      IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = ''stockly'' AND tablename = ''recipe_cost_history'') THEN
        INSERT INTO stockly.recipe_cost_history (
          recipe_id,
          total_cost,
          unit_cost,
          yield_qty,
          recorded_at,
          company_id
        ) VALUES (
          p_recipe_id,
          v_total_cost,
          v_unit_cost,
          v_yield_qty,
          NOW(),
          v_company_id
        ) ON CONFLICT DO NOTHING;
      END IF;
      
      -- Propagate cost changes to parent recipes (recursive)
      PERFORM propagate_cost_to_parent_recipes(v_output_ingredient_id);
    END IF;
  END;
  $func$ LANGUAGE plpgsql SECURITY DEFINER;
  ';

  -- 6. Function to propagate costs up the recipe tree
  EXECUTE '
  CREATE OR REPLACE FUNCTION propagate_cost_to_parent_recipes(p_ingredient_id UUID)
  RETURNS void AS $func$
  DECLARE
    v_recipe_id UUID;
  BEGIN
    -- Find all recipes that use this ingredient
    FOR v_recipe_id IN
      SELECT DISTINCT recipe_id
      FROM stockly.recipe_ingredients
      WHERE ingredient_id = p_ingredient_id
    LOOP
      -- Recalculate each parent recipe (this will cascade)
      PERFORM update_recipe_costs_and_propagate(v_recipe_id);
    END LOOP;
  END;
  $func$ LANGUAGE plpgsql SECURITY DEFINER;
  ';

  -- 7. Trigger to auto-update costs when recipe ingredients change
  EXECUTE '
  CREATE OR REPLACE FUNCTION trigger_recipe_cost_update()
  RETURNS TRIGGER AS $func$
  BEGIN
    IF TG_OP = ''DELETE'' THEN
      PERFORM update_recipe_costs_and_propagate(OLD.recipe_id);
    ELSE
      PERFORM update_recipe_costs_and_propagate(NEW.recipe_id);
    END IF;
    RETURN COALESCE(NEW, OLD);
  END;
  $func$ LANGUAGE plpgsql;
  ';

  EXECUTE 'DROP TRIGGER IF EXISTS auto_update_recipe_costs ON stockly.recipe_ingredients';

  EXECUTE 'CREATE TRIGGER auto_update_recipe_costs
    AFTER INSERT OR UPDATE OR DELETE ON stockly.recipe_ingredients
    FOR EACH ROW
    EXECUTE FUNCTION trigger_recipe_cost_update()';

  -- 8. Trigger to propagate when ingredient prices change
  EXECUTE '
  CREATE OR REPLACE FUNCTION trigger_ingredient_cost_propagate()
  RETURNS TRIGGER AS $func$
  BEGIN
    -- If unit_cost changed, propagate to all recipes using this ingredient
    IF NEW.unit_cost IS DISTINCT FROM OLD.unit_cost THEN
      PERFORM propagate_cost_to_parent_recipes(NEW.id);
    END IF;
    RETURN NEW;
  END;
  $func$ LANGUAGE plpgsql;
  ';

  EXECUTE 'DROP TRIGGER IF EXISTS auto_propagate_ingredient_cost ON public.ingredients_library';

  EXECUTE 'CREATE TRIGGER auto_propagate_ingredient_cost
    AFTER UPDATE ON public.ingredients_library
    FOR EACH ROW
    EXECUTE FUNCTION trigger_ingredient_cost_propagate()';
END $$;

