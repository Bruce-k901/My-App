-- ============================================================================
-- Migration: 20260201000005_force_fix_yield_factor.sql
-- Description: Force fix the insert_recipe_ingredients function that references
--              yield_factor which doesn't exist in the VIEW
-- ============================================================================

-- Drop and recreate the function that's causing the yield_factor error
DROP FUNCTION IF EXISTS public.insert_recipe_ingredients() CASCADE;
DROP FUNCTION IF EXISTS public.update_recipe_ingredients() CASCADE;
DROP FUNCTION IF EXISTS public.delete_recipe_ingredients() CASCADE;

-- VIEW columns: id, recipe_id, ingredient_id, sub_recipe_id, quantity, unit_id,
--               sort_order, line_cost, company_id, created_at, updated_at
-- NOTE: yield_factor does NOT exist in the VIEW!

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

  -- Return the NEW record (can't use RETURNING * INTO NEW for views)
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
