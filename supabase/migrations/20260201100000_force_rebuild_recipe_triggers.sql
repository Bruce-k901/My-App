-- ============================================================================
-- Migration: 20260201100000_force_rebuild_recipe_triggers.sql
-- Description: Force rebuild all recipe ingredient triggers to fix yield_factor
--              and stock_item_id errors by completely dropping and recreating
-- ============================================================================

-- ============================================================================
-- STEP 1: Drop ALL existing triggers on recipe_ingredients (both table and view)
-- ============================================================================
DROP TRIGGER IF EXISTS recipe_ingredients_insert_trigger ON public.recipe_ingredients;
DROP TRIGGER IF EXISTS recipe_ingredients_update_trigger ON public.recipe_ingredients;
DROP TRIGGER IF EXISTS recipe_ingredients_delete_trigger ON public.recipe_ingredients;
DROP TRIGGER IF EXISTS recipe_ingredients_changed ON stockly.recipe_ingredients;
DROP TRIGGER IF EXISTS auto_update_recipe_costs ON stockly.recipe_ingredients;
DROP TRIGGER IF EXISTS update_recipe_cost_on_ingredient_change ON stockly.recipe_ingredients;

-- ============================================================================
-- STEP 2: Drop ALL trigger functions with CASCADE
-- ============================================================================
DROP FUNCTION IF EXISTS public.insert_recipe_ingredients() CASCADE;
DROP FUNCTION IF EXISTS public.update_recipe_ingredients() CASCADE;
DROP FUNCTION IF EXISTS public.delete_recipe_ingredients() CASCADE;
DROP FUNCTION IF EXISTS trigger_recipe_cost_update() CASCADE;
DROP FUNCTION IF EXISTS stockly.trigger_recalculate_recipe() CASCADE;

-- ============================================================================
-- STEP 3: Recreate VIEW trigger functions (NO yield_factor, uses ingredient_id)
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
  );
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

-- ============================================================================
-- STEP 4: Recreate cost update trigger function
-- ============================================================================

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

-- ============================================================================
-- STEP 5: Recreate INSTEAD OF triggers on VIEW
-- ============================================================================

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
-- STEP 6: Recreate trigger on BASE TABLE for cost calculation
-- ============================================================================

CREATE TRIGGER recipe_ingredients_changed
  AFTER INSERT OR UPDATE OR DELETE ON stockly.recipe_ingredients
  FOR EACH ROW
  EXECUTE FUNCTION stockly.trigger_recalculate_recipe();
