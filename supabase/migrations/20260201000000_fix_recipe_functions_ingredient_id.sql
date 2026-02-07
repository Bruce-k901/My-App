-- ============================================================================
-- Migration: 20260201000000_fix_recipe_functions_ingredient_id.sql
-- Description: Fix functions that incorrectly reference stock_item_id
--              instead of ingredient_id on stockly.recipe_ingredients table
-- ============================================================================

DO $$
BEGIN
  -- Check if stockly schema exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_namespace WHERE nspname = 'stockly'
  ) THEN
    RAISE NOTICE 'stockly schema does not exist - skipping';
    RETURN;
  END IF;

  -- ============================================================================
  -- Fix: calculate_recipe_cost function
  -- Changed: ri.stock_item_id -> ri.ingredient_id
  -- ============================================================================
  DROP FUNCTION IF EXISTS calculate_recipe_cost(UUID);

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
      IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'ingredients_library'
      ) THEN
        FOR v_ingredient_cost, v_quantity, v_unit_cost, v_yield_percent IN
          SELECT
            CASE
              WHEN COALESCE(i.yield_percent, 100) > 0 THEN
                COALESCE(
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
          JOIN public.ingredients_library i ON i.id = ri.ingredient_id  -- FIXED: was stock_item_id
          WHERE ri.recipe_id = p_recipe_id
            AND ri.ingredient_id IS NOT NULL  -- FIXED: was stock_item_id
        LOOP
          v_total_cost := v_total_cost + COALESCE(v_ingredient_cost, 0);
        END LOOP;
      END IF;

      RETURN v_total_cost;
    END;
    $func$ LANGUAGE plpgsql;
  $sql_func1$;

  -- ============================================================================
  -- Fix: propagate_cost_to_parent_recipes function
  -- Changed: ri.stock_item_id -> ri.ingredient_id
  -- ============================================================================
  DROP FUNCTION IF EXISTS propagate_cost_to_parent_recipes(UUID);

  EXECUTE $sql_func2$
    CREATE OR REPLACE FUNCTION propagate_cost_to_parent_recipes(p_ingredient_id UUID)
    RETURNS void AS $func$
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
    $func$ LANGUAGE plpgsql;
  $sql_func2$;

  -- ============================================================================
  -- Fix: check_recipe_circular_dependency function
  -- Changed: ri.stock_item_id -> ri.ingredient_id
  -- ============================================================================
  DROP FUNCTION IF EXISTS check_recipe_circular_dependency(UUID);

  EXECUTE $sql_func3$
    CREATE OR REPLACE FUNCTION check_recipe_circular_dependency(p_recipe_id UUID)
    RETURNS BOOLEAN AS $func$
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
          JOIN public.ingredients_library il ON il.id = ri.ingredient_id  -- FIXED: was stock_item_id
          WHERE ri.recipe_id = p_recipe_id
            AND il.linked_recipe_id IS NOT NULL

          UNION ALL

          SELECT
            il.linked_recipe_id as recipe_id,
            rt.depth + 1
          FROM recipe_tree rt
          JOIN stockly.recipe_ingredients ri ON ri.recipe_id = rt.recipe_id
          JOIN public.ingredients_library il ON il.id = ri.ingredient_id  -- FIXED: was stock_item_id
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
  $sql_func3$;

  -- ============================================================================
  -- Fix: aggregate_recipe_allergens function
  -- Changed: ri.stock_item_id -> ri.ingredient_id
  -- ============================================================================
  DROP FUNCTION IF EXISTS aggregate_recipe_allergens(UUID);

  EXECUTE $sql_func4$
    CREATE OR REPLACE FUNCTION aggregate_recipe_allergens(p_recipe_id UUID)
    RETURNS void AS $func$
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
          JOIN public.ingredients_library i ON i.id = ri.ingredient_id  -- FIXED: was stock_item_id
          WHERE ri.recipe_id = p_recipe_id
            AND i.allergens IS NOT NULL
            AND array_length(i.allergens, 1) > 0
        ) sub
        WHERE allergen IS NOT NULL
          AND allergen != '';
      END IF;

      IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'stockly'
        AND table_name = 'recipes'
        AND table_type = 'BASE TABLE'
      ) THEN
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
      END IF;
    END;
    $func$ LANGUAGE plpgsql;
  $sql_func4$;

  -- ============================================================================
  -- Fix: check_recipe_data_integrity function
  -- Changed: ri.stock_item_id -> ri.ingredient_id
  -- ============================================================================
  DROP FUNCTION IF EXISTS check_recipe_data_integrity();

  EXECUTE $sql_func5$
    CREATE OR REPLACE FUNCTION check_recipe_data_integrity()
    RETURNS TABLE(
      issue_type TEXT,
      recipe_id UUID,
      recipe_name TEXT,
      details TEXT
    ) AS $func$
    BEGIN
      RETURN QUERY

      -- Check for orphaned ingredients (no ingredient_id or sub_recipe_id)
      SELECT
        'orphaned_ingredient'::TEXT as issue_type,
        ri.recipe_id,
        r.name as recipe_name,
        'Ingredient has no ingredient_id or sub_recipe_id'::TEXT as details
      FROM stockly.recipe_ingredients ri
      LEFT JOIN stockly.recipes r ON r.id = ri.recipe_id
      WHERE ri.ingredient_id IS NULL AND ri.sub_recipe_id IS NULL  -- FIXED: was stock_item_id

      UNION ALL

      -- Check for ingredients pointing to non-existent ingredients_library entries
      SELECT
        'missing_ingredient'::TEXT as issue_type,
        ri.recipe_id,
        r.name as recipe_name,
        'Ingredient references non-existent ingredient_id: ' || ri.ingredient_id::TEXT as details
      FROM stockly.recipe_ingredients ri
      LEFT JOIN stockly.recipes r ON r.id = ri.recipe_id
      LEFT JOIN public.ingredients_library il ON il.id = ri.ingredient_id
      WHERE ri.ingredient_id IS NOT NULL AND il.id IS NULL

      UNION ALL

      -- Check for sub-recipes pointing to non-existent recipes
      SELECT
        'missing_sub_recipe'::TEXT as issue_type,
        ri.recipe_id,
        r.name as recipe_name,
        'Sub-recipe references non-existent recipe: ' || ri.sub_recipe_id::TEXT as details
      FROM stockly.recipe_ingredients ri
      LEFT JOIN stockly.recipes r ON r.id = ri.recipe_id
      LEFT JOIN stockly.recipes sr ON sr.id = ri.sub_recipe_id
      WHERE ri.sub_recipe_id IS NOT NULL AND sr.id IS NULL;
    END;
    $func$ LANGUAGE plpgsql;
  $sql_func5$;

  RAISE NOTICE 'Fixed all recipe functions to use ingredient_id instead of stock_item_id';
END $$;
