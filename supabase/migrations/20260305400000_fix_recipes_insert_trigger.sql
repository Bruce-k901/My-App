-- Fix: recipes INSERT trigger "returned row structure does not match"
-- ============================================================================
-- The insert_recipes() INSTEAD OF trigger on public.recipes uses
-- `RETURNING * INTO NEW` which fails when stockly.recipes has columns
-- not present in the public.recipes view. Fix: use RETURNING id, then
-- SELECT from the view to populate NEW correctly.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.insert_recipes()
RETURNS TRIGGER AS $$
DECLARE
  v_id UUID;
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
    NEW.last_cost_calculated_at, NEW.linked_sop_id, NEW.updated_by,
    COALESCE(NEW.data_version, 1)
  )
  RETURNING id INTO v_id;

  -- Refetch from view to populate NEW with correct structure
  SELECT * INTO NEW FROM public.recipes WHERE id = v_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Force PostgREST schema reload (also fixes stock_categories cache)
NOTIFY pgrst, 'reload schema';
