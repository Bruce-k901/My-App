-- Force recalculation of ALL recipe costs to pick up the unit cost fixes
-- This will update updated_at which should bust any caches

DO $$
DECLARE
  rec RECORD;
  total_updated INTEGER := 0;
BEGIN
  -- Force update all recipe_ingredients to recalculate line_cost
  UPDATE stockly.recipe_ingredients
  SET line_cost = unit_cost * quantity,
      updated_at = NOW()
  WHERE unit_cost > 0;

  GET DIAGNOSTICS total_updated = ROW_COUNT;
  RAISE NOTICE 'Force-recalculated % recipe ingredient line costs', total_updated;

  -- Now recalculate total costs for all recipes
  UPDATE stockly.recipes r
  SET total_cost = (
    SELECT COALESCE(SUM(ri.line_cost), 0)
    FROM stockly.recipe_ingredients ri
    WHERE ri.recipe_id = r.id
  ),
  updated_at = NOW();

  GET DIAGNOSTICS total_updated = ROW_COUNT;
  RAISE NOTICE 'Recalculated total costs for % recipes', total_updated;

END $$;
