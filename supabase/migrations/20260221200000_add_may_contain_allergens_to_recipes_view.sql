-- @salsa - Fix: Add may_contain_allergens to public.recipes view
-- ============================================================================
-- Migration: 20260221100000_add_may_contain_allergens_to_recipes_view.sql
-- Description: The may_contain_allergens column was added to stockly.recipes
--   in migration 20260220000000 but the public.recipes view (last recreated
--   in 20260201000002 with explicit columns) was never updated. This caused
--   all Supabase queries selecting may_contain_allergens from recipes to fail,
--   including the recipe dropdown on the new production batch page.
-- ============================================================================

-- Drop and recreate view to include may_contain_allergens
DROP VIEW IF EXISTS public.recipes CASCADE;

CREATE VIEW "public"."recipes" AS
SELECT
  id,
  company_id,
  name,
  description,
  recipe_type,
  category_id,
  menu_category,
  yield_quantity,
  yield_unit,
  is_ingredient,
  base_unit,
  shelf_life_days,
  total_cost,
  cost_per_portion,
  sell_price,
  vat_rate,
  target_gp_percent,
  actual_gp_percent,
  use_weighted_average,
  pos_item_code,
  pos_item_name,
  is_active,
  is_archived,
  version,
  last_costed_at,
  image_url,
  notes,
  created_by,
  created_at,
  updated_at,
  recipe_status,
  output_ingredient_id,
  yield_qty,
  yield_unit_id,
  storage_requirements,
  allergens,
  may_contain_allergens,  -- ADDED: was missing from previous view definition
  version_number,
  archived_from_recipe_id,
  archived_at,
  archived_by,
  code,
  total_ingredient_cost,
  calculated_yield_qty,
  unit_cost,
  last_cost_calculated_at,
  linked_sop_id,
  updated_by,
  data_version
FROM stockly.recipes;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipes TO authenticated;

-- ============================================================================
-- Recreate INSTEAD OF triggers (dropped by CASCADE)
-- Updated to include may_contain_allergens
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
    yield_qty, yield_unit_id, storage_requirements, allergens, may_contain_allergens,
    version_number, code, total_ingredient_cost, calculated_yield_qty, unit_cost,
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
    NEW.storage_requirements, NEW.allergens, NEW.may_contain_allergens,
    NEW.version_number, NEW.code,
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
    allergens = NEW.allergens, may_contain_allergens = NEW.may_contain_allergens,
    version_number = NEW.version_number, code = NEW.code,
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

-- Force schema reload
NOTIFY pgrst, 'reload schema';
