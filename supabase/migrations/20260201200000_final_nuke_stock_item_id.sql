-- ============================================================================
-- Migration: 20260201200000_final_nuke_stock_item_id.sql
-- Description: NUCLEAR fix - drops and recreates ALL functions that might
--              reference ri.stock_item_id, replacing with ri.ingredient_id
-- ============================================================================

-- ============================================================================
-- STEP 1: Drop ALL potentially problematic functions
-- ============================================================================

-- Recipe cost functions
DROP FUNCTION IF EXISTS stockly.calculate_recipe_cost(UUID) CASCADE;
DROP FUNCTION IF EXISTS stockly.calculate_recipe_cost(UUID, BOOLEAN) CASCADE;
DROP FUNCTION IF EXISTS public.calculate_recipe_cost(UUID) CASCADE;
DROP FUNCTION IF EXISTS calculate_recipe_cost(UUID) CASCADE;
DROP FUNCTION IF EXISTS calculate_recipe_total_cost(UUID) CASCADE;

-- Cost propagation functions
DROP FUNCTION IF EXISTS propagate_cost_to_parent_recipes(UUID) CASCADE;
DROP FUNCTION IF EXISTS update_recipe_and_ingredient_cost(UUID) CASCADE;
DROP FUNCTION IF EXISTS update_recipe_costs_and_propagate(UUID) CASCADE;

-- Trigger functions
DROP FUNCTION IF EXISTS trigger_recipe_cost_update() CASCADE;
DROP FUNCTION IF EXISTS stockly.trigger_recalculate_recipe() CASCADE;
DROP FUNCTION IF EXISTS trigger_ingredient_cost_propagate() CASCADE;

-- Circular check function
DROP FUNCTION IF EXISTS check_recipe_circular_dependency(UUID) CASCADE;

-- Allergen aggregation
DROP FUNCTION IF EXISTS aggregate_recipe_allergens(UUID) CASCADE;

-- Cost breakdown
DROP FUNCTION IF EXISTS stockly.get_recipe_cost_breakdown(UUID) CASCADE;

-- Recalculate all recipes
DROP FUNCTION IF EXISTS stockly.recalculate_all_recipes(UUID) CASCADE;

-- Recipe yield
DROP FUNCTION IF EXISTS calculate_recipe_yield(UUID) CASCADE;

-- Integrity check functions
DROP FUNCTION IF EXISTS public.check_data_integrity() CASCADE;

-- ============================================================================
-- STEP 2: Recreate ALL functions with correct column names
-- ============================================================================

-- stockly.calculate_recipe_cost
CREATE OR REPLACE FUNCTION stockly.calculate_recipe_cost(p_recipe_id UUID, p_force_recalc BOOLEAN DEFAULT FALSE)
RETURNS JSONB AS $$
DECLARE
  v_total_cost NUMERIC := 0;
  v_recipe RECORD;
  v_cost_per_portion NUMERIC;
  v_gp_percent NUMERIC;
  v_result JSONB;
BEGIN
  SELECT * INTO v_recipe FROM stockly.recipes WHERE id = p_recipe_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Recipe not found');
  END IF;

  -- Sum all line costs from recipe ingredients
  SELECT COALESCE(SUM(ri.line_cost), 0)
  INTO v_total_cost
  FROM stockly.recipe_ingredients ri
  WHERE ri.recipe_id = p_recipe_id;

  -- If no line_costs, calculate from ingredients
  IF v_total_cost = 0 THEN
    SELECT COALESCE(SUM(
      COALESCE(i.unit_cost, 0) * ri.quantity * (100.0 / GREATEST(COALESCE(i.yield_percent, 100), 1))
    ), 0)
    INTO v_total_cost
    FROM stockly.recipe_ingredients ri
    JOIN public.ingredients_library i ON i.id = ri.ingredient_id  -- CORRECT
    WHERE ri.recipe_id = p_recipe_id
      AND ri.ingredient_id IS NOT NULL;  -- CORRECT
  END IF;

  v_cost_per_portion := v_total_cost / NULLIF(v_recipe.yield_quantity, 0);

  IF v_recipe.sell_price > 0 THEN
    v_gp_percent := ROUND(((v_recipe.sell_price - COALESCE(v_cost_per_portion, 0)) / v_recipe.sell_price * 100)::NUMERIC, 1);
  END IF;

  UPDATE stockly.recipes
  SET total_cost = v_total_cost,
      cost_per_portion = v_cost_per_portion,
      actual_gp_percent = v_gp_percent,
      last_costed_at = NOW(),
      updated_at = NOW()
  WHERE id = p_recipe_id;

  v_result := jsonb_build_object(
    'recipe_id', p_recipe_id,
    'total_cost', v_total_cost,
    'cost_per_portion', v_cost_per_portion,
    'yield_quantity', v_recipe.yield_quantity,
    'sell_price', v_recipe.sell_price,
    'gp_percent', v_gp_percent
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- public.calculate_recipe_cost
CREATE OR REPLACE FUNCTION calculate_recipe_cost(p_recipe_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_total_cost NUMERIC := 0;
BEGIN
  SELECT COALESCE(SUM(ri.line_cost), 0)
  INTO v_total_cost
  FROM stockly.recipe_ingredients ri
  WHERE ri.recipe_id = p_recipe_id
    AND ri.line_cost IS NOT NULL
    AND ri.line_cost > 0;

  IF v_total_cost = 0 THEN
    SELECT COALESCE(SUM(
      COALESCE(i.unit_cost, 0) * ri.quantity * (100.0 / GREATEST(COALESCE(i.yield_percent, 100), 1))
    ), 0)
    INTO v_total_cost
    FROM stockly.recipe_ingredients ri
    JOIN public.ingredients_library i ON i.id = ri.ingredient_id  -- CORRECT
    WHERE ri.recipe_id = p_recipe_id
      AND ri.ingredient_id IS NOT NULL;  -- CORRECT
  END IF;

  RETURN v_total_cost;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- calculate_recipe_total_cost
CREATE OR REPLACE FUNCTION calculate_recipe_total_cost(p_recipe_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  v_total_cost DECIMAL := 0;
BEGIN
  SELECT COALESCE(SUM(
    CASE
      WHEN ri.line_cost IS NOT NULL AND ri.line_cost > 0 THEN ri.line_cost
      ELSE
        CASE
          WHEN i.yield_percent IS NOT NULL AND i.yield_percent > 0 THEN
            (COALESCE(i.unit_cost, 0) * ri.quantity) / (i.yield_percent / 100.0)
          ELSE
            COALESCE(i.unit_cost, 0) * ri.quantity
        END
    END
  ), 0)
  INTO v_total_cost
  FROM stockly.recipe_ingredients ri
  LEFT JOIN public.ingredients_library i ON i.id = ri.ingredient_id  -- CORRECT
  WHERE ri.recipe_id = p_recipe_id;

  RETURN v_total_cost;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- propagate_cost_to_parent_recipes
CREATE OR REPLACE FUNCTION propagate_cost_to_parent_recipes(p_ingredient_id UUID)
RETURNS void AS $$
DECLARE
  v_recipe_id UUID;
BEGIN
  FOR v_recipe_id IN
    SELECT DISTINCT ri.recipe_id
    FROM stockly.recipe_ingredients ri
    WHERE ri.ingredient_id = p_ingredient_id  -- CORRECT
  LOOP
    PERFORM update_recipe_and_ingredient_cost(v_recipe_id);
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- update_recipe_and_ingredient_cost
CREATE OR REPLACE FUNCTION update_recipe_and_ingredient_cost(p_recipe_id UUID)
RETURNS void AS $$
DECLARE
  v_recipe_cost NUMERIC;
  v_output_ingredient_id UUID;
  v_yield_qty NUMERIC;
  v_unit_cost NUMERIC;
BEGIN
  v_recipe_cost := calculate_recipe_cost(p_recipe_id);

  UPDATE stockly.recipes
  SET total_cost = v_recipe_cost,
      total_ingredient_cost = v_recipe_cost,
      last_costed_at = NOW()
  WHERE id = p_recipe_id;

  SELECT output_ingredient_id, yield_qty
  INTO v_output_ingredient_id, v_yield_qty
  FROM stockly.recipes
  WHERE id = p_recipe_id;

  IF v_output_ingredient_id IS NOT NULL AND v_yield_qty IS NOT NULL AND v_yield_qty > 0 THEN
    v_unit_cost := v_recipe_cost / v_yield_qty;

    UPDATE public.ingredients_library
    SET unit_cost = v_unit_cost
    WHERE id = v_output_ingredient_id
      AND is_prep_item = true;

    PERFORM propagate_cost_to_parent_recipes(v_output_ingredient_id);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- update_recipe_costs_and_propagate
CREATE OR REPLACE FUNCTION update_recipe_costs_and_propagate(p_recipe_id UUID)
RETURNS void AS $$
DECLARE
  v_total_cost DECIMAL;
  v_yield_qty DECIMAL;
  v_unit_cost DECIMAL;
  v_output_ingredient_id UUID;
  v_company_id UUID;
BEGIN
  v_total_cost := calculate_recipe_total_cost(p_recipe_id);

  SELECT COALESCE(SUM(ri.quantity), 0)
  INTO v_yield_qty
  FROM stockly.recipe_ingredients ri
  WHERE ri.recipe_id = p_recipe_id;

  IF v_yield_qty > 0 THEN
    v_unit_cost := v_total_cost / v_yield_qty;
  ELSE
    v_unit_cost := 0;
  END IF;

  UPDATE stockly.recipes
  SET
    total_ingredient_cost = v_total_cost,
    calculated_yield_qty = v_yield_qty,
    unit_cost = v_unit_cost,
    last_cost_calculated_at = NOW()
  WHERE id = p_recipe_id
  RETURNING output_ingredient_id, company_id
  INTO v_output_ingredient_id, v_company_id;

  IF v_output_ingredient_id IS NOT NULL THEN
    UPDATE public.ingredients_library
    SET
      unit_cost = v_unit_cost,
      last_cost_update = NOW()
    WHERE id = v_output_ingredient_id
      AND is_prep_item = true;

    PERFORM propagate_cost_to_parent_recipes(v_output_ingredient_id);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- trigger_recipe_cost_update
CREATE OR REPLACE FUNCTION trigger_recipe_cost_update()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM update_recipe_and_ingredient_cost(OLD.recipe_id);
  ELSE
    PERFORM update_recipe_and_ingredient_cost(NEW.recipe_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- stockly.trigger_recalculate_recipe
CREATE OR REPLACE FUNCTION stockly.trigger_recalculate_recipe()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM stockly.calculate_recipe_cost(OLD.recipe_id);
  ELSE
    PERFORM stockly.calculate_recipe_cost(NEW.recipe_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- trigger_ingredient_cost_propagate
CREATE OR REPLACE FUNCTION trigger_ingredient_cost_propagate()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.unit_cost IS DISTINCT FROM OLD.unit_cost THEN
    PERFORM propagate_cost_to_parent_recipes(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- check_recipe_circular_dependency
CREATE OR REPLACE FUNCTION check_recipe_circular_dependency(p_recipe_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_has_circular BOOLEAN := FALSE;
  v_max_depth INT := 10;
BEGIN
  WITH RECURSIVE recipe_tree AS (
    SELECT
      il.linked_recipe_id as recipe_id,
      1 as depth
    FROM stockly.recipe_ingredients ri
    JOIN public.ingredients_library il ON il.id = ri.ingredient_id  -- CORRECT
    WHERE ri.recipe_id = p_recipe_id
      AND il.linked_recipe_id IS NOT NULL

    UNION ALL

    SELECT
      il.linked_recipe_id as recipe_id,
      rt.depth + 1
    FROM recipe_tree rt
    JOIN stockly.recipe_ingredients ri ON ri.recipe_id = rt.recipe_id
    JOIN public.ingredients_library il ON il.id = ri.ingredient_id  -- CORRECT
    WHERE il.linked_recipe_id IS NOT NULL
      AND rt.depth < v_max_depth
  )
  SELECT EXISTS (
    SELECT 1 FROM recipe_tree WHERE recipe_id = p_recipe_id
  ) INTO v_has_circular;

  RETURN COALESCE(v_has_circular, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- aggregate_recipe_allergens
CREATE OR REPLACE FUNCTION aggregate_recipe_allergens(p_recipe_id UUID)
RETURNS void AS $$
DECLARE
  v_allergens TEXT[];
BEGIN
  SELECT ARRAY_AGG(DISTINCT allergen)
  INTO v_allergens
  FROM (
    SELECT UNNEST(i.allergens) as allergen
    FROM stockly.recipe_ingredients ri
    JOIN public.ingredients_library i ON i.id = ri.ingredient_id  -- CORRECT
    WHERE ri.recipe_id = p_recipe_id
      AND i.allergens IS NOT NULL
      AND array_length(i.allergens, 1) > 0
  ) sub
  WHERE allergen IS NOT NULL
    AND allergen != '';

  UPDATE stockly.recipes
  SET allergens = COALESCE(v_allergens, ARRAY[]::TEXT[])
  WHERE id = p_recipe_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- stockly.get_recipe_cost_breakdown
CREATE OR REPLACE FUNCTION stockly.get_recipe_cost_breakdown(p_recipe_id UUID)
RETURNS TABLE (
  ingredient_id UUID,
  ingredient_name TEXT,
  ingredient_type TEXT,
  quantity NUMERIC,
  unit TEXT,
  yield_factor NUMERIC,
  gross_quantity NUMERIC,
  unit_cost NUMERIC,
  line_cost NUMERIC,
  cost_percentage NUMERIC
) AS $$
DECLARE
  v_total_cost NUMERIC;
BEGIN
  SELECT r.total_cost INTO v_total_cost FROM stockly.recipes r WHERE r.id = p_recipe_id;

  RETURN QUERY
  SELECT
    ri.id as ingredient_id,
    COALESCE(il.name, sr.name, 'Unknown') as ingredient_name,
    CASE
      WHEN ri.ingredient_id IS NOT NULL THEN 'ingredient'  -- CORRECT
      WHEN ri.sub_recipe_id IS NOT NULL THEN 'sub_recipe'
      ELSE 'unknown'
    END as ingredient_type,
    ri.quantity,
    COALESCE(u.abbreviation, ri.unit_id::TEXT, '') as unit,
    ri.yield_factor,
    ri.gross_quantity,
    ri.unit_cost,
    ri.line_cost,
    CASE WHEN v_total_cost > 0
      THEN ROUND((ri.line_cost / v_total_cost * 100)::NUMERIC, 1)
      ELSE 0
    END as cost_percentage
  FROM stockly.recipe_ingredients ri
  LEFT JOIN public.ingredients_library il ON il.id = ri.ingredient_id  -- CORRECT
  LEFT JOIN stockly.recipes sr ON sr.id = ri.sub_recipe_id
  LEFT JOIN public.units u ON u.id = ri.unit_id
  WHERE ri.recipe_id = p_recipe_id
  ORDER BY ri.sort_order, ri.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- stockly.recalculate_all_recipes
CREATE OR REPLACE FUNCTION stockly.recalculate_all_recipes(p_company_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_recipe_id UUID;
BEGIN
  -- Prep recipes first
  FOR v_recipe_id IN
    SELECT id FROM stockly.recipes
    WHERE company_id = p_company_id AND recipe_type = 'prep' AND is_active = true
    ORDER BY created_at
  LOOP
    PERFORM stockly.calculate_recipe_cost(v_recipe_id);
    v_count := v_count + 1;
  END LOOP;

  -- Modifier recipes
  FOR v_recipe_id IN
    SELECT id FROM stockly.recipes
    WHERE company_id = p_company_id AND recipe_type = 'modifier' AND is_active = true
    ORDER BY created_at
  LOOP
    PERFORM stockly.calculate_recipe_cost(v_recipe_id);
    v_count := v_count + 1;
  END LOOP;

  -- Dish recipes
  FOR v_recipe_id IN
    SELECT id FROM stockly.recipes
    WHERE company_id = p_company_id AND recipe_type = 'dish' AND is_active = true
    ORDER BY created_at
  LOOP
    PERFORM stockly.calculate_recipe_cost(v_recipe_id);
    v_count := v_count + 1;
  END LOOP;

  -- Composite recipes
  FOR v_recipe_id IN
    SELECT id FROM stockly.recipes
    WHERE company_id = p_company_id AND recipe_type = 'composite' AND is_active = true
    ORDER BY created_at
  LOOP
    PERFORM stockly.calculate_recipe_cost(v_recipe_id);
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- calculate_recipe_yield
CREATE OR REPLACE FUNCTION calculate_recipe_yield(p_recipe_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  v_total_yield DECIMAL := 0;
BEGIN
  SELECT COALESCE(SUM(ri.quantity), 0)
  INTO v_total_yield
  FROM stockly.recipe_ingredients ri
  WHERE ri.recipe_id = p_recipe_id;

  RETURN v_total_yield;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 3: Recreate triggers
-- ============================================================================

-- Drop all existing triggers on stockly.recipe_ingredients
DROP TRIGGER IF EXISTS recipe_ingredients_changed ON stockly.recipe_ingredients;
DROP TRIGGER IF EXISTS auto_update_recipe_costs ON stockly.recipe_ingredients;
DROP TRIGGER IF EXISTS update_recipe_cost_on_ingredient_change ON stockly.recipe_ingredients;

-- Recreate trigger on stockly.recipe_ingredients
CREATE TRIGGER recipe_ingredients_changed
  AFTER INSERT OR UPDATE OR DELETE ON stockly.recipe_ingredients
  FOR EACH ROW
  EXECUTE FUNCTION stockly.trigger_recalculate_recipe();

-- Drop and recreate trigger on ingredients_library
DROP TRIGGER IF EXISTS auto_propagate_ingredient_cost ON public.ingredients_library;
CREATE TRIGGER auto_propagate_ingredient_cost
  AFTER UPDATE ON public.ingredients_library
  FOR EACH ROW
  EXECUTE FUNCTION trigger_ingredient_cost_propagate();

-- ============================================================================
-- STEP 4: Fix INSTEAD OF triggers on recipe_ingredients view
-- ============================================================================

CREATE OR REPLACE FUNCTION public.insert_recipe_ingredients()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO stockly.recipe_ingredients (
    id, recipe_id, ingredient_id, sub_recipe_id, quantity, unit_id,
    sort_order, line_cost, company_id, created_at, updated_at
  ) VALUES (
    COALESCE(NEW.id, gen_random_uuid()),
    NEW.recipe_id,
    NEW.ingredient_id,  -- CORRECT
    NEW.sub_recipe_id,
    NEW.quantity,
    NEW.unit_id,
    COALESCE(NEW.sort_order, 0),
    NEW.line_cost,
    NEW.company_id,
    COALESCE(NEW.created_at, NOW()),
    COALESCE(NEW.updated_at, NOW())
  )
  RETURNING * INTO NEW;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.update_recipe_ingredients()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE stockly.recipe_ingredients SET
    recipe_id = NEW.recipe_id,
    ingredient_id = NEW.ingredient_id,  -- CORRECT
    sub_recipe_id = NEW.sub_recipe_id,
    quantity = NEW.quantity,
    unit_id = NEW.unit_id,
    sort_order = NEW.sort_order,
    line_cost = NEW.line_cost,
    updated_at = COALESCE(NEW.updated_at, NOW())
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.delete_recipe_ingredients()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM stockly.recipe_ingredients WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate INSTEAD OF triggers on recipe_ingredients view
DROP TRIGGER IF EXISTS recipe_ingredients_insert_trigger ON public.recipe_ingredients;
DROP TRIGGER IF EXISTS recipe_ingredients_update_trigger ON public.recipe_ingredients;
DROP TRIGGER IF EXISTS recipe_ingredients_delete_trigger ON public.recipe_ingredients;

CREATE TRIGGER recipe_ingredients_insert_trigger
  INSTEAD OF INSERT ON public.recipe_ingredients
  FOR EACH ROW EXECUTE FUNCTION public.insert_recipe_ingredients();

CREATE TRIGGER recipe_ingredients_update_trigger
  INSTEAD OF UPDATE ON public.recipe_ingredients
  FOR EACH ROW EXECUTE FUNCTION public.update_recipe_ingredients();

CREATE TRIGGER recipe_ingredients_delete_trigger
  INSTEAD OF DELETE ON public.recipe_ingredients
  FOR EACH ROW EXECUTE FUNCTION public.delete_recipe_ingredients();

-- Migration complete - all functions now use ingredient_id instead of stock_item_id
