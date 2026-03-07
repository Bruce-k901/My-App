-- Debug + fix: Find coconut water in recipe_ingredients by searching recipe names
-- that are known to contain coconut water, then fix the expensive line item

DO $$
DECLARE
  v_new_cost DECIMAL := 0.0011;
  rec RECORD;
  v_fixed INTEGER := 0;
BEGIN
  -- Find expensive ingredient lines in recipes that likely contain coconut water
  -- by matching ingredient name through ingredients_library
  FOR rec IN
    SELECT ri.id, ri.unit_cost, ri.quantity, ri.line_cost,
           ri.ingredient_id,
           r.name as recipe_name,
           il.ingredient_name
    FROM stockly.recipe_ingredients ri
    JOIN stockly.recipes r ON ri.recipe_id = r.id
    LEFT JOIN public.ingredients_library il ON ri.ingredient_id = il.id
    WHERE ri.unit_cost > 0.5
    ORDER BY ri.unit_cost DESC
    LIMIT 20
  LOOP
    RAISE NOTICE 'Expensive: recipe="%", ingredient="%", qty=%, unit_cost=£%, line=£%, ing_id=%',
      rec.recipe_name, rec.ingredient_name,
      rec.quantity, rec.unit_cost, rec.line_cost, rec.ingredient_id;
  END LOOP;

  -- Now fix any ingredient line where the name matches coconut water and cost is wrong
  FOR rec IN
    SELECT ri.id, ri.unit_cost as old_cost, ri.quantity, ri.line_cost as old_line,
           r.name as recipe_name, il.ingredient_name
    FROM stockly.recipe_ingredients ri
    JOIN stockly.recipes r ON ri.recipe_id = r.id
    JOIN public.ingredients_library il ON ri.ingredient_id = il.id
    WHERE il.ingredient_name ILIKE '%coconut water%'
      AND ri.unit_cost > 0.01
  LOOP
    RAISE NOTICE 'Fixing "%"->"%": qty=%, £%/unit -> £%/unit',
      rec.recipe_name, rec.ingredient_name, rec.quantity, rec.old_cost, v_new_cost;

    UPDATE stockly.recipe_ingredients
    SET unit_cost = v_new_cost,
        line_cost = v_new_cost * quantity,
        updated_at = NOW()
    WHERE id = rec.id;
    v_fixed := v_fixed + 1;
  END LOOP;

  -- If nothing found by ingredient link, try finding by recipe name + expensive line
  IF v_fixed = 0 THEN
    RAISE NOTICE '--- No direct ingredient link found, trying by cost pattern ---';

    -- The coconut water shows as qty=14, unit_cost=1.08 in the UI
    FOR rec IN
      SELECT ri.id, ri.unit_cost as old_cost, ri.quantity, ri.line_cost as old_line,
             r.name as recipe_name
      FROM stockly.recipe_ingredients ri
      JOIN stockly.recipes r ON ri.recipe_id = r.id
      WHERE ri.quantity = 14
        AND ri.unit_cost BETWEEN 1.0 AND 1.2
    LOOP
      RAISE NOTICE 'Pattern match: recipe="%", qty=%, unit_cost=£%',
        rec.recipe_name, rec.quantity, rec.old_cost;

      UPDATE stockly.recipe_ingredients
      SET unit_cost = v_new_cost,
          line_cost = v_new_cost * quantity,
          updated_at = NOW()
      WHERE id = rec.id;
      v_fixed := v_fixed + 1;
    END LOOP;
  END IF;

  RAISE NOTICE 'Total fixed: %', v_fixed;

  IF v_fixed > 0 THEN
    -- Recalculate affected recipe totals
    UPDATE stockly.recipes r
    SET total_ingredient_cost = sub.total,
        total_cost = sub.total,
        unit_cost = CASE WHEN COALESCE(r.yield_qty, r.yield_quantity, 1) > 0
          THEN sub.total / COALESCE(r.yield_qty, r.yield_quantity, 1)
          ELSE sub.total END,
        cost_per_portion = CASE WHEN COALESCE(r.yield_qty, r.yield_quantity, 1) > 0
          THEN sub.total / COALESCE(r.yield_qty, r.yield_quantity, 1)
          ELSE sub.total END,
        last_cost_calculated_at = NOW(),
        updated_at = NOW()
    FROM (
      SELECT ri.recipe_id, SUM(ri.line_cost) as total
      FROM stockly.recipe_ingredients ri
      GROUP BY ri.recipe_id
    ) sub
    WHERE r.id = sub.recipe_id
      AND r.id IN (
        SELECT DISTINCT ri2.recipe_id
        FROM stockly.recipe_ingredients ri2
        WHERE ri2.quantity = 14
      );

    RAISE NOTICE 'Recipe totals recalculated';
  END IF;
END $$;
