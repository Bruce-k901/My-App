-- Diagnostic query to check if ingredients exist for a recipe
-- Replace '2dbb97de-097a-4ee9-8435-736c3f85a691' with your recipe ID

-- Check base table directly
SELECT 
  ri.id,
  ri.recipe_id,
  ri.ingredient_id,
  ri.quantity,
  ri.unit_id,
  ri.sort_order,
  ri.line_cost,
  ri.company_id,
  il.ingredient_name,
  u.abbreviation as unit_abbreviation
FROM stockly.recipe_ingredients ri
LEFT JOIN public.ingredients_library il ON il.id = ri.ingredient_id
LEFT JOIN public.uom u ON u.id = ri.unit_id
WHERE ri.recipe_id = '2dbb97de-097a-4ee9-8435-736c3f85a691'
ORDER BY ri.sort_order;

-- Check view
SELECT * 
FROM public.recipe_ingredients
WHERE recipe_id = '2dbb97de-097a-4ee9-8435-736c3f85a691'
ORDER BY sort_order;

-- Count comparison
SELECT 
  'Base table' as source,
  COUNT(*) as count
FROM stockly.recipe_ingredients
WHERE recipe_id = '2dbb97de-097a-4ee9-8435-736c3f85a691'
UNION ALL
SELECT 
  'View' as source,
  COUNT(*) as count
FROM public.recipe_ingredients
WHERE recipe_id = '2dbb97de-097a-4ee9-8435-736c3f85a691';

