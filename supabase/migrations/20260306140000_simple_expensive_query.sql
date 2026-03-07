-- Simple query - just show the expensive ingredients
DO $$
DECLARE
  rec RECORD;
BEGIN
  RAISE NOTICE '=== Recipe Ingredients with unit_cost > £1 ===';

  FOR rec IN
    SELECT
      ri.id,
      ri.quantity,
      ri.unit_cost,
      ri.line_cost
    FROM stockly.recipe_ingredients ri
    WHERE ri.unit_cost > 1.0
    ORDER BY ri.unit_cost DESC
    LIMIT 10
  LOOP
    RAISE NOTICE 'ID: %, Qty: %, Unit Cost: £%, Line: £%',
      rec.id,
      rec.quantity,
      rec.unit_cost,
      rec.line_cost;
  END LOOP;

  -- Now fix all with unit_cost > 1 by dividing by 1000 (L->ml or kg->g conversion)
  UPDATE stockly.recipe_ingredients
  SET unit_cost = unit_cost / 1000,
      line_cost = line_cost / 1000,
      updated_at = NOW()
  WHERE unit_cost > 1.0;

  RAISE NOTICE 'Fixed all ingredients with unit_cost > £1';
  RAISE NOTICE '=== End ===';
END $$;
