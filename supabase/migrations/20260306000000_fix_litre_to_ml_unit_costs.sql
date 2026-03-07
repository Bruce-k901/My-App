-- Fix unit costs for ingredients where the product is in LITRE but ingredient uses ml
-- The import script didn't properly convert £/L to £/ml (should divide by 1000)

-- Update recipe_ingredients where:
-- 1. The ingredient references a stock item with base unit L
-- 2. The recipe ingredient unit is ml
-- 3. The unit_cost looks suspiciously high (> £0.10/ml means > £100/L which is unlikely)

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
    AND ri.unit_cost > 0.10  -- Suspiciously high for ml (would be > £100/L)
    AND ri.unit_cost < 10    -- But not impossibly high (sanity check)
);
