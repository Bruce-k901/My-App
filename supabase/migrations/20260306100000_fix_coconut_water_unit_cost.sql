-- Direct fix for coconut water and any other L->ml conversions that were missed
-- The previous migration may not have caught all cases

-- First, let's see what we're dealing with
DO $$
DECLARE
  affected_rows integer;
BEGIN
  -- Fix all recipe ingredients where:
  -- 1. Stock item base unit is 'L' (litres)
  -- 2. Recipe ingredient unit is 'ml' (millilitres)
  -- 3. Unit cost is >= 0.10 (anything over £0.10/ml is likely £/L that wasn't converted)

  UPDATE stockly.recipe_ingredients
  SET unit_cost = unit_cost / 1000,
      line_cost = (unit_cost / 1000) * quantity,
      updated_at = NOW()
  WHERE id IN (
    SELECT ri.id
    FROM stockly.recipe_ingredients ri
    JOIN stockly.stock_items si ON ri.ingredient_id = si.id
    JOIN public.uom base_unit ON si.base_unit_id = base_unit.id
    JOIN public.uom ing_unit ON ri.unit_id = ing_unit.id
    WHERE base_unit.abbreviation = 'L'
      AND ing_unit.abbreviation = 'ml'
      AND ri.unit_cost >= 0.10  -- Changed from > to >= to catch edge cases
  );

  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RAISE NOTICE 'Fixed % recipe ingredient(s) with L->ml unit cost conversion', affected_rows;

  -- Also check for kg->g conversions that might be wrong (though less common)
  UPDATE stockly.recipe_ingredients
  SET unit_cost = unit_cost / 1000,
      line_cost = (unit_cost / 1000) * quantity,
      updated_at = NOW()
  WHERE id IN (
    SELECT ri.id
    FROM stockly.recipe_ingredients ri
    JOIN stockly.stock_items si ON ri.ingredient_id = si.id
    JOIN public.uom base_unit ON si.base_unit_id = base_unit.id
    JOIN public.uom ing_unit ON ri.unit_id = ing_unit.id
    WHERE base_unit.abbreviation = 'kg'
      AND ing_unit.abbreviation = 'g'
      AND ri.unit_cost >= 1.00  -- If cost per gram is >= £1, it's likely £/kg
  );

  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RAISE NOTICE 'Fixed % recipe ingredient(s) with kg->g unit cost conversion', affected_rows;
END $$;
