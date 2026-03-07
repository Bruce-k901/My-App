-- Direct fix for the specific coconut water ingredient that's still showing £1.08
-- It appears to not be linked via stock_item_id, so previous migrations didn't catch it

DO $$
DECLARE
  rec RECORD;
  fixed_count INTEGER := 0;
BEGIN
  -- Find and fix the coconut water entries
  FOR rec IN
    SELECT
      ri.id,
      r.name as recipe_name,
      ri.quantity,
      ri.unit_cost,
      ri.line_cost
    FROM stockly.recipe_ingredients ri
    JOIN stockly.recipes r ON ri.recipe_id = r.id
    WHERE ri.unit_cost >= 1.0  -- Still has the wrong cost
      AND ri.quantity = 14  -- The qty from the screenshot
    LIMIT 10
  LOOP
    RAISE NOTICE 'Found: Recipe %, Qty: %, Unit Cost: £%, Line: £%',
      rec.recipe_name,
      rec.quantity,
      rec.unit_cost,
      rec.line_cost;

    -- Fix it
    UPDATE stockly.recipe_ingredients
    SET unit_cost = unit_cost / 1000,
        line_cost = (unit_cost / 1000) * quantity,
        updated_at = NOW()
    WHERE id = rec.id;

    fixed_count := fixed_count + 1;
  END LOOP;

  RAISE NOTICE 'Fixed % coconut water ingredient(s)', fixed_count;
END $$;
