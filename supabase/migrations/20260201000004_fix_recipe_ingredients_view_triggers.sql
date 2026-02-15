-- ============================================================================
-- Migration: 20260201000004_fix_recipe_ingredients_view_triggers.sql
-- Description: COMPLETE FIX for all recipe functions and triggers
--              1. Drop and recreate ALL cost calculation functions with ingredient_id
--              2. Fix INSTEAD OF triggers on views to use correct column names
-- ============================================================================

-- ============================================================================
-- PART 1: Drop and recreate ALL cost calculation functions
-- ============================================================================

-- Drop ALL versions of cost-related functions with CASCADE to remove triggers
DROP FUNCTION IF EXISTS stockly.calculate_recipe_cost(UUID) CASCADE;
DROP FUNCTION IF EXISTS stockly.calculate_recipe_cost(UUID, BOOLEAN) CASCADE;
DROP FUNCTION IF EXISTS public.calculate_recipe_cost(UUID) CASCADE;
DROP FUNCTION IF EXISTS calculate_recipe_cost(UUID) CASCADE;
DROP FUNCTION IF EXISTS propagate_cost_to_parent_recipes(UUID) CASCADE;
DROP FUNCTION IF EXISTS update_recipe_and_ingredient_cost(UUID) CASCADE;
DROP FUNCTION IF EXISTS trigger_recipe_cost_update() CASCADE;
DROP FUNCTION IF EXISTS stockly.trigger_recalculate_recipe() CASCADE;
DROP FUNCTION IF EXISTS trigger_ingredient_cost_propagate() CASCADE;

-- RECREATE: stockly.calculate_recipe_cost
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

  -- Sum all line costs
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
    JOIN public.ingredients_library i ON i.id = ri.ingredient_id  -- CORRECT: ingredient_id
    WHERE ri.recipe_id = p_recipe_id
      AND ri.ingredient_id IS NOT NULL;
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

-- RECREATE: public.calculate_recipe_cost
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
    JOIN public.ingredients_library i ON i.id = ri.ingredient_id  -- CORRECT: ingredient_id
    WHERE ri.recipe_id = p_recipe_id
      AND ri.ingredient_id IS NOT NULL;
  END IF;

  RETURN v_total_cost;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RECREATE: propagate_cost_to_parent_recipes
CREATE OR REPLACE FUNCTION propagate_cost_to_parent_recipes(p_ingredient_id UUID)
RETURNS void AS $$
DECLARE
  v_recipe_id UUID;
BEGIN
  FOR v_recipe_id IN
    SELECT DISTINCT ri.recipe_id
    FROM stockly.recipe_ingredients ri
    WHERE ri.ingredient_id = p_ingredient_id  -- CORRECT: ingredient_id
  LOOP
    PERFORM update_recipe_and_ingredient_cost(v_recipe_id);
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RECREATE: update_recipe_and_ingredient_cost
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

-- RECREATE: trigger_recipe_cost_update
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

-- RECREATE: stockly.trigger_recalculate_recipe
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

-- RECREATE: trigger_ingredient_cost_propagate
CREATE OR REPLACE FUNCTION trigger_ingredient_cost_propagate()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.unit_cost IS DISTINCT FROM OLD.unit_cost THEN
    PERFORM propagate_cost_to_parent_recipes(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop all triggers on recipe_ingredients and recreate
DROP TRIGGER IF EXISTS recipe_ingredients_changed ON stockly.recipe_ingredients;
DROP TRIGGER IF EXISTS auto_update_recipe_costs ON stockly.recipe_ingredients;
DROP TRIGGER IF EXISTS update_recipe_cost_on_ingredient_change ON stockly.recipe_ingredients;

CREATE TRIGGER recipe_ingredients_changed
  AFTER INSERT OR UPDATE OR DELETE ON stockly.recipe_ingredients
  FOR EACH ROW
  EXECUTE FUNCTION stockly.trigger_recalculate_recipe();

DROP TRIGGER IF EXISTS auto_propagate_ingredient_cost ON public.ingredients_library;
CREATE TRIGGER auto_propagate_ingredient_cost
  AFTER UPDATE ON public.ingredients_library
  FOR EACH ROW
  EXECUTE FUNCTION trigger_ingredient_cost_propagate();

-- ============================================================================
-- PART 2: Fix INSTEAD OF triggers on recipe_ingredients view
-- ============================================================================

-- VIEW columns: id, recipe_id, ingredient_id, sub_recipe_id, quantity, unit_id,
--               sort_order, line_cost, company_id, created_at, updated_at
CREATE OR REPLACE FUNCTION public.insert_recipe_ingredients()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO stockly.recipe_ingredients (
    id,
    recipe_id,
    ingredient_id,
    sub_recipe_id,
    quantity,
    unit_id,
    sort_order,
    line_cost,
    company_id,
    created_at,
    updated_at
  ) VALUES (
    COALESCE(NEW.id, gen_random_uuid()),
    NEW.recipe_id,
    NEW.ingredient_id,
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
    ingredient_id = NEW.ingredient_id,
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

-- ============================================================================
-- PART 3: Fix INSTEAD OF triggers on recipes view
-- ============================================================================

CREATE OR REPLACE FUNCTION public.insert_recipes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO stockly.recipes (
    id, company_id, name, description, recipe_type, category_id, menu_category,
    yield_quantity, yield_unit, is_ingredient, base_unit, shelf_life_days,
    total_cost, cost_per_portion, sell_price, vat_rate, target_gp_percent,
    actual_gp_percent, use_weighted_average, pos_item_code, pos_item_name,
    is_active, is_archived, version, last_costed_at, image_url, notes,
    created_by, created_at, updated_at, recipe_status, output_ingredient_id,
    yield_qty, yield_unit_id, storage_requirements, allergens, version_number,
    code, total_ingredient_cost, calculated_yield_qty, unit_cost,
    last_cost_calculated_at, linked_sop_id, updated_by, data_version
  ) VALUES (
    COALESCE(NEW.id, gen_random_uuid()), NEW.company_id, NEW.name, NEW.description,
    COALESCE(NEW.recipe_type, 'dish'), NEW.category_id, NEW.menu_category,
    COALESCE(NEW.yield_quantity, 1), COALESCE(NEW.yield_unit, 'portion'),
    NEW.is_ingredient, NEW.base_unit, NEW.shelf_life_days, NEW.total_cost,
    NEW.cost_per_portion, NEW.sell_price, NEW.vat_rate, NEW.target_gp_percent,
    NEW.actual_gp_percent, NEW.use_weighted_average, NEW.pos_item_code,
    NEW.pos_item_name, COALESCE(NEW.is_active, true), COALESCE(NEW.is_archived, false),
    NEW.version, NEW.last_costed_at, NEW.image_url, NEW.notes, NEW.created_by,
    COALESCE(NEW.created_at, NOW()), COALESCE(NEW.updated_at, NOW()),
    NEW.recipe_status, NEW.output_ingredient_id, NEW.yield_qty, NEW.yield_unit_id,
    NEW.storage_requirements, NEW.allergens, NEW.version_number, NEW.code,
    NEW.total_ingredient_cost, NEW.calculated_yield_qty, NEW.unit_cost,
    NEW.last_cost_calculated_at, NEW.linked_sop_id, NEW.updated_by, NEW.data_version
  )
  RETURNING * INTO NEW;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.update_recipes()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE stockly.recipes SET
    company_id = NEW.company_id, name = NEW.name, description = NEW.description,
    recipe_type = NEW.recipe_type, category_id = NEW.category_id,
    menu_category = NEW.menu_category, yield_quantity = NEW.yield_quantity,
    yield_unit = NEW.yield_unit, is_ingredient = NEW.is_ingredient,
    base_unit = NEW.base_unit, shelf_life_days = NEW.shelf_life_days,
    total_cost = NEW.total_cost, cost_per_portion = NEW.cost_per_portion,
    sell_price = NEW.sell_price, vat_rate = NEW.vat_rate,
    target_gp_percent = NEW.target_gp_percent, actual_gp_percent = NEW.actual_gp_percent,
    use_weighted_average = NEW.use_weighted_average, pos_item_code = NEW.pos_item_code,
    pos_item_name = NEW.pos_item_name, is_active = NEW.is_active,
    is_archived = NEW.is_archived, version = NEW.version,
    last_costed_at = NEW.last_costed_at, image_url = NEW.image_url, notes = NEW.notes,
    updated_at = COALESCE(NEW.updated_at, NOW()), recipe_status = NEW.recipe_status,
    output_ingredient_id = NEW.output_ingredient_id, yield_qty = NEW.yield_qty,
    yield_unit_id = NEW.yield_unit_id, storage_requirements = NEW.storage_requirements,
    allergens = NEW.allergens, version_number = NEW.version_number, code = NEW.code,
    total_ingredient_cost = NEW.total_ingredient_cost,
    calculated_yield_qty = NEW.calculated_yield_qty, unit_cost = NEW.unit_cost,
    last_cost_calculated_at = NEW.last_cost_calculated_at,
    linked_sop_id = NEW.linked_sop_id, updated_by = NEW.updated_by,
    data_version = NEW.data_version
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate INSTEAD OF triggers on recipes view
DROP TRIGGER IF EXISTS recipes_insert_trigger ON public.recipes;
DROP TRIGGER IF EXISTS recipes_update_trigger ON public.recipes;

CREATE TRIGGER recipes_insert_trigger
  INSTEAD OF INSERT ON public.recipes
  FOR EACH ROW EXECUTE FUNCTION public.insert_recipes();

CREATE TRIGGER recipes_update_trigger
  INSTEAD OF UPDATE ON public.recipes
  FOR EACH ROW EXECUTE FUNCTION public.update_recipes();
