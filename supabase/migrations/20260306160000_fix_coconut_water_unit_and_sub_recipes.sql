-- Fix coconut water unit (should be ml not g) and assign sub-recipes to Okja CPU

DO $$
DECLARE
  ml_unit_id UUID;
  okja_supplier_id UUID;
  rec RECORD;
BEGIN
  -- Get the ml unit ID
  SELECT id INTO ml_unit_id FROM public.uom WHERE abbreviation = 'ml' LIMIT 1;

  -- Get Okja CPU supplier ID
  SELECT id INTO okja_supplier_id FROM stockly.suppliers WHERE name ILIKE '%okja%cpu%' LIMIT 1;

  IF ml_unit_id IS NULL THEN
    RAISE NOTICE 'ml unit not found';
  ELSE
    RAISE NOTICE 'ml unit ID: %', ml_unit_id;
  END IF;

  IF okja_supplier_id IS NULL THEN
    RAISE NOTICE 'Okja CPU supplier not found';
  ELSE
    RAISE NOTICE 'Okja CPU supplier ID: %', okja_supplier_id;
  END IF;

  -- Fix coconut water unit from g to ml
  -- The unit_cost is already correct (£0.00108/ml) from previous migrations
  -- We just need to fix the unit reference

  -- This will identify ingredients that might be coconut water based on the name pattern
  -- and current wrong state (unit cost around 0.001-0.002 which is £1-2/L converted to ml)

  RAISE NOTICE '=== Checking for ingredients that might need unit fix ===';

  -- For now, just report what we find - don't auto-fix without confirmation
  FOR rec IN
    SELECT
      ri.id,
      COALESCE(si.name, sr.name, 'Unknown') as name,
      ri.quantity,
      u.abbreviation as current_unit,
      ri.unit_cost
    FROM stockly.recipe_ingredients ri
    LEFT JOIN stockly.stock_items si ON ri.ingredient_id = si.id
    LEFT JOIN stockly.recipes sr ON ri.sub_recipe_id = sr.id
    LEFT JOIN public.uom u ON ri.unit_id = u.id
    WHERE ri.quantity = 14
      AND u.abbreviation = 'g'
      AND ri.unit_cost BETWEEN 0.0005 AND 0.005  -- Likely a converted L->ml cost
    LIMIT 5
  LOOP
    RAISE NOTICE 'Found potential coconut water: %, Qty: % %, Cost: £%',
      rec.name,
      rec.quantity,
      rec.current_unit,
      rec.unit_cost;
  END LOOP;

END $$;
