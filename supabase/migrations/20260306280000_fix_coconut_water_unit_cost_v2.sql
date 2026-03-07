-- Fix Original Coconut Water - Vita Coco pricing in recipes
-- The unit_cost is £1.08 (per-LITRE) but recipes use g/ml quantities
-- so the unit_cost should be £0.0011 per g/ml
-- Fix recipe_ingredients line costs and recalculate recipe totals
-- Note: ingredients_library has a trigger with stock_item_id issue,
-- so we fix recipe costs directly here

DO $$
DECLARE
  v_ingredient_id UUID;
  v_new_cost DECIMAL := 0.0011;
  rec RECORD;
  v_fixed INTEGER := 0;
BEGIN
  -- Find the coconut water ingredient
  SELECT id INTO v_ingredient_id
  FROM public.ingredients_library
  WHERE ingredient_name ILIKE '%coconut water%vita%'
  LIMIT 1;

  IF v_ingredient_id IS NULL THEN
    RAISE NOTICE 'Coconut water ingredient not found';
    RETURN;
  END IF;

  RAISE NOTICE 'Found coconut water ingredient: %', v_ingredient_id;

  -- Fix recipe_ingredients that use this ingredient with wrong cost
  FOR rec IN
    SELECT ri.id, ri.unit_cost as old_cost, ri.quantity, r.name as recipe_name
    FROM stockly.recipe_ingredients ri
    JOIN stockly.recipes r ON ri.recipe_id = r.id
    WHERE ri.ingredient_id = v_ingredient_id
      AND ri.unit_cost > 0.01
  LOOP
    RAISE NOTICE 'Fixing "%": qty=%, £%/unit -> £%/unit, line £% -> £%',
      rec.recipe_name, rec.quantity, rec.old_cost, v_new_cost,
      rec.old_cost * rec.quantity, v_new_cost * rec.quantity;

    UPDATE stockly.recipe_ingredients
    SET unit_cost = v_new_cost,
        line_cost = v_new_cost * quantity,
        updated_at = NOW()
    WHERE id = rec.id;

    v_fixed := v_fixed + 1;
  END LOOP;

  RAISE NOTICE 'Fixed % recipe ingredient line(s)', v_fixed;

  -- Recalculate total costs for affected recipes
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
    WHERE ri.recipe_id IN (
      SELECT DISTINCT recipe_id FROM stockly.recipe_ingredients WHERE ingredient_id = v_ingredient_id
    )
    GROUP BY ri.recipe_id
  ) sub
  WHERE r.id = sub.recipe_id;

  RAISE NOTICE 'Recipe costs recalculated';
END $$;
