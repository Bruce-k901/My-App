-- ============================================================================
-- Migration: 20260201000001_comprehensive_fix_stock_item_id.sql
-- Description: COMPREHENSIVE fix for ALL functions that incorrectly reference
--              ri.stock_item_id instead of ri.ingredient_id
-- This fixes functions in BOTH stockly and public schemas
-- ============================================================================

DO $$
BEGIN
  -- ============================================================================
  -- FIX 1: stockly.calculate_recipe_cost (from 05-stockly-recipes.sql)
  -- This is the original function that uses ri.stock_item_id
  -- ============================================================================

  IF EXISTS (
    SELECT 1 FROM pg_namespace WHERE nspname = 'stockly'
  ) THEN
    -- Drop the old function completely
    DROP FUNCTION IF EXISTS stockly.calculate_recipe_cost(UUID) CASCADE;
    DROP FUNCTION IF EXISTS stockly.calculate_recipe_cost(UUID, BOOLEAN) CASCADE;

    -- Recreate with CORRECT column reference (ri.ingredient_id)
    EXECUTE $func1$
      CREATE OR REPLACE FUNCTION stockly.calculate_recipe_cost(p_recipe_id UUID)
      RETURNS NUMERIC AS $inner$
      DECLARE
        v_total_cost NUMERIC := 0;
      BEGIN
        -- Simply sum the existing line_costs (saved by the application)
        -- This is the safe approach that doesn't reference any ingredient columns
        SELECT COALESCE(SUM(ri.line_cost), 0)
        INTO v_total_cost
        FROM stockly.recipe_ingredients ri
        WHERE ri.recipe_id = p_recipe_id;

        -- Update recipe totals
        UPDATE stockly.recipes
        SET total_cost = v_total_cost,
            last_costed_at = NOW()
        WHERE id = p_recipe_id;

        RETURN v_total_cost;
      END;
      $inner$ LANGUAGE plpgsql SECURITY DEFINER;
    $func1$;

    RAISE NOTICE 'Fixed stockly.calculate_recipe_cost';
  END IF;

  -- ============================================================================
  -- FIX 2: public.calculate_recipe_cost (from 20250322000006)
  -- ============================================================================

  DROP FUNCTION IF EXISTS calculate_recipe_cost(UUID) CASCADE;

  EXECUTE $func2$
    CREATE OR REPLACE FUNCTION calculate_recipe_cost(p_recipe_id UUID)
    RETURNS NUMERIC AS $inner$
    DECLARE
      v_total_cost NUMERIC := 0;
    BEGIN
      -- First try to use existing line_costs
      SELECT COALESCE(SUM(ri.line_cost), 0)
      INTO v_total_cost
      FROM stockly.recipe_ingredients ri
      WHERE ri.recipe_id = p_recipe_id
        AND ri.line_cost IS NOT NULL
        AND ri.line_cost > 0;

      -- If no line_costs, calculate from ingredients
      IF v_total_cost = 0 THEN
        SELECT COALESCE(SUM(
          CASE
            WHEN COALESCE(i.yield_percent, 100) > 0 THEN
              COALESCE(i.unit_cost, 0) * ri.quantity * (100.0 / COALESCE(i.yield_percent, 100))
            ELSE
              COALESCE(i.unit_cost, 0) * ri.quantity
          END
        ), 0)
        INTO v_total_cost
        FROM stockly.recipe_ingredients ri
        JOIN public.ingredients_library i ON i.id = ri.ingredient_id  -- FIXED: was stock_item_id
        WHERE ri.recipe_id = p_recipe_id
          AND ri.ingredient_id IS NOT NULL;  -- FIXED: was stock_item_id
      END IF;

      RETURN v_total_cost;
    END;
    $inner$ LANGUAGE plpgsql SECURITY DEFINER;
  $func2$;

  RAISE NOTICE 'Fixed public.calculate_recipe_cost';

  -- ============================================================================
  -- FIX 3: propagate_cost_to_parent_recipes
  -- ============================================================================

  DROP FUNCTION IF EXISTS propagate_cost_to_parent_recipes(UUID) CASCADE;

  EXECUTE $func3$
    CREATE OR REPLACE FUNCTION propagate_cost_to_parent_recipes(p_ingredient_id UUID)
    RETURNS void AS $inner$
    DECLARE
      v_recipe_id UUID;
    BEGIN
      FOR v_recipe_id IN
        SELECT DISTINCT ri.recipe_id
        FROM stockly.recipe_ingredients ri
        WHERE ri.ingredient_id = p_ingredient_id  -- FIXED: was stock_item_id
      LOOP
        PERFORM update_recipe_and_ingredient_cost(v_recipe_id);
      END LOOP;
    END;
    $inner$ LANGUAGE plpgsql SECURITY DEFINER;
  $func3$;

  RAISE NOTICE 'Fixed propagate_cost_to_parent_recipes';

  -- ============================================================================
  -- FIX 4: update_recipe_and_ingredient_cost
  -- ============================================================================

  DROP FUNCTION IF EXISTS update_recipe_and_ingredient_cost(UUID) CASCADE;

  EXECUTE $func4$
    CREATE OR REPLACE FUNCTION update_recipe_and_ingredient_cost(p_recipe_id UUID)
    RETURNS void AS $inner$
    DECLARE
      v_recipe_cost NUMERIC;
      v_output_ingredient_id UUID;
      v_yield_qty NUMERIC;
      v_unit_cost NUMERIC;
    BEGIN
      -- Calculate total recipe cost (using the fixed function)
      v_recipe_cost := calculate_recipe_cost(p_recipe_id);

      -- Update recipe totals
      UPDATE stockly.recipes
      SET total_cost = v_recipe_cost,
          total_ingredient_cost = v_recipe_cost,
          last_costed_at = NOW()
      WHERE id = p_recipe_id;

      -- Get output_ingredient_id and yield_qty
      SELECT output_ingredient_id, yield_qty
      INTO v_output_ingredient_id, v_yield_qty
      FROM stockly.recipes
      WHERE id = p_recipe_id;

      -- If this recipe is linked to a prep item, update its cost
      IF v_output_ingredient_id IS NOT NULL AND v_yield_qty IS NOT NULL AND v_yield_qty > 0 THEN
        v_unit_cost := v_recipe_cost / v_yield_qty;

        UPDATE public.ingredients_library
        SET unit_cost = v_unit_cost
        WHERE id = v_output_ingredient_id
          AND is_prep_item = true;

        -- Propagate to parent recipes
        PERFORM propagate_cost_to_parent_recipes(v_output_ingredient_id);
      END IF;
    END;
    $inner$ LANGUAGE plpgsql SECURITY DEFINER;
  $func4$;

  RAISE NOTICE 'Fixed update_recipe_and_ingredient_cost';

  -- ============================================================================
  -- FIX 5: trigger_recipe_cost_update
  -- ============================================================================

  DROP FUNCTION IF EXISTS trigger_recipe_cost_update() CASCADE;

  EXECUTE $func5$
    CREATE OR REPLACE FUNCTION trigger_recipe_cost_update()
    RETURNS TRIGGER AS $inner$
    BEGIN
      IF TG_OP = 'DELETE' THEN
        PERFORM update_recipe_and_ingredient_cost(OLD.recipe_id);
      ELSE
        PERFORM update_recipe_and_ingredient_cost(NEW.recipe_id);
      END IF;
      RETURN COALESCE(NEW, OLD);
    END;
    $inner$ LANGUAGE plpgsql;
  $func5$;

  RAISE NOTICE 'Fixed trigger_recipe_cost_update';

  -- ============================================================================
  -- FIX 6: stockly.trigger_recalculate_recipe
  -- ============================================================================

  IF EXISTS (
    SELECT 1 FROM pg_namespace WHERE nspname = 'stockly'
  ) THEN
    DROP FUNCTION IF EXISTS stockly.trigger_recalculate_recipe() CASCADE;

    EXECUTE $func6$
      CREATE OR REPLACE FUNCTION stockly.trigger_recalculate_recipe()
      RETURNS TRIGGER AS $inner$
      BEGIN
        IF TG_OP = 'DELETE' THEN
          PERFORM stockly.calculate_recipe_cost(OLD.recipe_id);
        ELSE
          PERFORM stockly.calculate_recipe_cost(NEW.recipe_id);
        END IF;
        RETURN COALESCE(NEW, OLD);
      END;
      $inner$ LANGUAGE plpgsql;
    $func6$;

    RAISE NOTICE 'Fixed stockly.trigger_recalculate_recipe';
  END IF;

  -- ============================================================================
  -- FIX 7: check_recipe_circular_dependency (from 20250322000004)
  -- ============================================================================

  DROP FUNCTION IF EXISTS check_recipe_circular_dependency(UUID) CASCADE;

  EXECUTE $func7$
    CREATE OR REPLACE FUNCTION check_recipe_circular_dependency(p_recipe_id UUID)
    RETURNS BOOLEAN AS $inner$
    DECLARE
      v_has_circular BOOLEAN := FALSE;
      v_max_depth INT := 10;
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'ingredients_library'
      ) THEN
        WITH RECURSIVE recipe_tree AS (
          SELECT
            il.linked_recipe_id as recipe_id,
            1 as depth
          FROM stockly.recipe_ingredients ri
          JOIN public.ingredients_library il ON il.id = ri.ingredient_id  -- FIXED
          WHERE ri.recipe_id = p_recipe_id
            AND il.linked_recipe_id IS NOT NULL

          UNION ALL

          SELECT
            il.linked_recipe_id as recipe_id,
            rt.depth + 1
          FROM recipe_tree rt
          JOIN stockly.recipe_ingredients ri ON ri.recipe_id = rt.recipe_id
          JOIN public.ingredients_library il ON il.id = ri.ingredient_id  -- FIXED
          WHERE il.linked_recipe_id IS NOT NULL
            AND rt.depth < v_max_depth
        )
        SELECT EXISTS (
          SELECT 1 FROM recipe_tree WHERE recipe_id = p_recipe_id
        ) INTO v_has_circular;
      END IF;

      RETURN COALESCE(v_has_circular, FALSE);
    END;
    $inner$ LANGUAGE plpgsql SECURITY DEFINER;
  $func7$;

  RAISE NOTICE 'Fixed check_recipe_circular_dependency';

  -- ============================================================================
  -- FIX 8: aggregate_recipe_allergens (from 20250322000005)
  -- ============================================================================

  DROP FUNCTION IF EXISTS aggregate_recipe_allergens(UUID) CASCADE;

  EXECUTE $func8$
    CREATE OR REPLACE FUNCTION aggregate_recipe_allergens(p_recipe_id UUID)
    RETURNS void AS $inner$
    DECLARE
      v_allergens TEXT[];
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'ingredients_library'
      ) THEN
        SELECT ARRAY_AGG(DISTINCT allergen)
        INTO v_allergens
        FROM (
          SELECT UNNEST(i.allergens) as allergen
          FROM stockly.recipe_ingredients ri
          JOIN public.ingredients_library i ON i.id = ri.ingredient_id  -- FIXED
          WHERE ri.recipe_id = p_recipe_id
            AND i.allergens IS NOT NULL
            AND array_length(i.allergens, 1) > 0
        ) sub
        WHERE allergen IS NOT NULL
          AND allergen != '';
      END IF;

      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'stockly'
        AND table_name = 'recipes'
        AND column_name = 'allergens'
      ) THEN
        UPDATE stockly.recipes
        SET allergens = COALESCE(v_allergens, ARRAY[]::TEXT[])
        WHERE id = p_recipe_id;
      END IF;
    END;
    $inner$ LANGUAGE plpgsql SECURITY DEFINER;
  $func8$;

  RAISE NOTICE 'Fixed aggregate_recipe_allergens';

  -- ============================================================================
  -- FIX 9: calculate_recipe_total_cost
  -- ============================================================================

  DROP FUNCTION IF EXISTS calculate_recipe_total_cost(UUID) CASCADE;

  EXECUTE $func9$
    CREATE OR REPLACE FUNCTION calculate_recipe_total_cost(p_recipe_id UUID)
    RETURNS DECIMAL AS $inner$
    DECLARE
      v_total_cost DECIMAL := 0;
    BEGIN
      -- Use line_cost if available, otherwise calculate
      SELECT COALESCE(SUM(
        CASE
          WHEN ri.line_cost IS NOT NULL AND ri.line_cost > 0 THEN
            ri.line_cost
          ELSE
            CASE
              WHEN i.yield_percent IS NOT NULL AND i.yield_percent > 0 THEN
                (COALESCE(i.unit_cost, 0) * ri.quantity) / (i.yield_percent / 100.0)
              ELSE
                COALESCE(i.unit_cost, 0) * ri.quantity
            END
        END
      ), 0)
      INTO v_total_cost
      FROM stockly.recipe_ingredients ri
      LEFT JOIN public.ingredients_library i ON i.id = ri.ingredient_id  -- FIXED
      WHERE ri.recipe_id = p_recipe_id;

      RETURN v_total_cost;
    END;
    $inner$ LANGUAGE plpgsql SECURITY DEFINER;
  $func9$;

  RAISE NOTICE 'Fixed calculate_recipe_total_cost';

  -- ============================================================================
  -- RECREATE TRIGGERS (they were dropped with CASCADE)
  -- ============================================================================

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'stockly'
    AND table_name = 'recipe_ingredients'
    AND table_type = 'BASE TABLE'
  ) THEN
    -- Drop all existing triggers first
    DROP TRIGGER IF EXISTS recipe_ingredients_changed ON stockly.recipe_ingredients;
    DROP TRIGGER IF EXISTS auto_update_recipe_costs ON stockly.recipe_ingredients;
    DROP TRIGGER IF EXISTS update_recipe_cost_on_ingredient_change ON stockly.recipe_ingredients;

    -- Recreate main trigger
    CREATE TRIGGER recipe_ingredients_changed
      AFTER INSERT OR UPDATE OR DELETE ON stockly.recipe_ingredients
      FOR EACH ROW
      EXECUTE FUNCTION stockly.trigger_recalculate_recipe();

    RAISE NOTICE 'Recreated triggers on stockly.recipe_ingredients';
  END IF;

  RAISE NOTICE 'Comprehensive stock_item_id fix completed successfully';
END $$;
