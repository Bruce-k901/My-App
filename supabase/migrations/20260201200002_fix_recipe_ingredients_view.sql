-- ============================================================================
-- Migration: 20260201200002_fix_recipe_ingredients_view.sql
-- Description: Drop and recreate recipe_ingredients view with correct columns
-- ============================================================================

-- Drop existing view and triggers
DROP VIEW IF EXISTS public.recipe_ingredients CASCADE;

-- Recreate the view with ingredient_id (NOT stock_item_id)
CREATE OR REPLACE VIEW public.recipe_ingredients AS
SELECT
  ri.id,
  ri.recipe_id,
  ri.ingredient_id,  -- CORRECT column name
  ri.sub_recipe_id,
  ri.quantity,
  ri.unit_id,
  ri.sort_order,
  ri.line_cost,
  ri.unit_cost,
  ri.yield_factor,
  ri.gross_quantity,
  ri.preparation_notes,
  ri.is_optional,
  ri.company_id,
  ri.created_at,
  ri.updated_at,
  -- Joined fields from ingredients_library
  il.ingredient_name,
  il.unit_cost as ingredient_unit_cost,
  il.pack_cost,
  il.pack_size,
  il.yield_percent,
  il.supplier,
  il.is_prep_item,
  il.allergens,
  -- Joined fields from uom (units of measure)
  u.abbreviation as unit_abbreviation,
  u.name as unit_name,
  -- Sub-recipe name if applicable
  sr.name as sub_recipe_name
FROM stockly.recipe_ingredients ri
LEFT JOIN public.ingredients_library il ON il.id = ri.ingredient_id
LEFT JOIN public.uom u ON u.id = ri.unit_id
LEFT JOIN stockly.recipes sr ON sr.id = ri.sub_recipe_id;

-- Grant permissions
GRANT SELECT ON public.recipe_ingredients TO authenticated;
GRANT INSERT ON public.recipe_ingredients TO authenticated;
GRANT UPDATE ON public.recipe_ingredients TO authenticated;
GRANT DELETE ON public.recipe_ingredients TO authenticated;

-- Recreate INSTEAD OF triggers for the view
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
    unit_cost,
    yield_factor,
    gross_quantity,
    preparation_notes,
    is_optional,
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
    NEW.unit_cost,
    NEW.yield_factor,
    NEW.gross_quantity,
    NEW.preparation_notes,
    COALESCE(NEW.is_optional, false),
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
    unit_cost = NEW.unit_cost,
    yield_factor = NEW.yield_factor,
    gross_quantity = NEW.gross_quantity,
    preparation_notes = NEW.preparation_notes,
    is_optional = NEW.is_optional,
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

-- Create INSTEAD OF triggers
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

-- Recreate the cost recalculation trigger on the base table
DROP TRIGGER IF EXISTS recipe_ingredients_changed ON stockly.recipe_ingredients;
CREATE TRIGGER recipe_ingredients_changed
  AFTER INSERT OR UPDATE OR DELETE ON stockly.recipe_ingredients
  FOR EACH ROW
  EXECUTE FUNCTION stockly.trigger_recalculate_recipe();
