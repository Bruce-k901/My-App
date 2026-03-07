-- FINAL FIX: This MUST run last to ensure all stock_item_id references are fixed
-- This migration has a very high number (99999999999999) to ensure it runs AFTER all others
-- It fixes the view and INSTEAD OF triggers that handle INSERT/UPDATE operations

BEGIN;

-- ============================================================================
-- CRITICAL FIX: View INSTEAD OF triggers (these handle ALL INSERT/UPDATE operations)
-- ============================================================================

-- Drop ALL existing triggers and functions
DROP TRIGGER IF EXISTS recipe_ingredients_insert_trigger ON public.recipe_ingredients CASCADE;
DROP TRIGGER IF EXISTS recipe_ingredients_update_trigger ON public.recipe_ingredients CASCADE;
DROP TRIGGER IF EXISTS recipe_ingredients_delete_trigger ON public.recipe_ingredients CASCADE;

DROP FUNCTION IF EXISTS public.insert_recipe_ingredients() CASCADE;
DROP FUNCTION IF EXISTS public.update_recipe_ingredients() CASCADE;
DROP FUNCTION IF EXISTS public.delete_recipe_ingredients() CASCADE;

-- Recreate insert function with CORRECT schema (ingredient_id, unit_id, sort_order)
CREATE OR REPLACE FUNCTION public.insert_recipe_ingredients()
RETURNS TRIGGER AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO stockly.recipe_ingredients (
    id, 
    recipe_id, 
    ingredient_id,  -- CORRECT: NOT stock_item_id
    sub_recipe_id, 
    quantity, 
    unit_id,  -- CORRECT: NOT unit
    sort_order,  -- CORRECT: NOT display_order
    line_cost, 
    company_id, 
    created_at, 
    updated_at
  ) VALUES (
    COALESCE(NEW.id, gen_random_uuid()),
    NEW.recipe_id,
    NEW.ingredient_id,  -- CORRECT: NOT NEW.stock_item_id
    NEW.sub_recipe_id,
    NEW.quantity,
    NEW.unit_id,  -- CORRECT: NOT NEW.unit
    COALESCE(NEW.sort_order, 0),  -- CORRECT: NOT NEW.display_order
    NEW.line_cost,
    NEW.company_id,
    COALESCE(NEW.created_at, NOW()),
    COALESCE(NEW.updated_at, NOW())
  )
  RETURNING id INTO v_id;
  
  NEW.id := v_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate update function with CORRECT schema
CREATE OR REPLACE FUNCTION public.update_recipe_ingredients()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE stockly.recipe_ingredients SET 
    recipe_id = NEW.recipe_id,
    ingredient_id = NEW.ingredient_id,  -- CORRECT: NOT NEW.stock_item_id
    sub_recipe_id = NEW.sub_recipe_id,
    quantity = NEW.quantity,
    unit_id = NEW.unit_id,  -- CORRECT: NOT NEW.unit
    sort_order = NEW.sort_order,  -- CORRECT: NOT NEW.display_order
    line_cost = NEW.line_cost,
    company_id = NEW.company_id,
    updated_at = NOW()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- CRITICAL FIX: Ensure view definition is correct
-- ============================================================================

-- Drop and recreate view to ensure it uses correct columns
DROP VIEW IF EXISTS public.recipe_ingredients CASCADE;

CREATE VIEW public.recipe_ingredients AS
SELECT 
  ri.id,
  ri.recipe_id,
  ri.ingredient_id,  -- CORRECT: NOT stock_item_id
  ri.sub_recipe_id,
  ri.quantity,
  ri.unit_id,  -- CORRECT: NOT unit
  ri.sort_order,  -- CORRECT: NOT display_order
  ri.line_cost,
  ri.company_id,
  ri.created_at,
  ri.updated_at,
  -- Ingredient data (from JOIN)
  il.ingredient_name,
  il.supplier,
  il.unit_cost as ingredient_unit_cost,
  il.pack_cost,
  il.pack_size,
  il.yield_percent,
  il.allergens,
  il.is_prep_item,
  il.linked_recipe_id as ingredient_recipe_id,
  -- Unit data (from JOIN)
  u.abbreviation as unit_abbreviation,
  u.name as unit_name,
  u.base_multiplier
FROM stockly.recipe_ingredients ri
LEFT JOIN public.ingredients_library il ON il.id = ri.ingredient_id  -- CORRECT: NOT ri.stock_item_id
LEFT JOIN public.uom u ON u.id = ri.unit_id;  -- CORRECT: NOT ri.unit

-- Recreate triggers after view recreation
CREATE TRIGGER recipe_ingredients_insert_trigger
  INSTEAD OF INSERT ON public.recipe_ingredients
  FOR EACH ROW 
  EXECUTE FUNCTION public.insert_recipe_ingredients();

CREATE TRIGGER recipe_ingredients_update_trigger
  INSTEAD OF UPDATE ON public.recipe_ingredients
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_recipe_ingredients();

-- ============================================================================
-- Add DELETE trigger
-- ============================================================================

-- Drop existing delete function if it exists
DROP FUNCTION IF EXISTS public.delete_recipe_ingredients() CASCADE;

-- Create delete function
CREATE OR REPLACE FUNCTION public.delete_recipe_ingredients()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete from the base table
  DELETE FROM stockly.recipe_ingredients
  WHERE id = OLD.id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create INSTEAD OF DELETE trigger
CREATE TRIGGER recipe_ingredients_delete_trigger
  INSTEAD OF DELETE ON public.recipe_ingredients
  FOR EACH ROW
  EXECUTE FUNCTION public.delete_recipe_ingredients();

-- ============================================================================
-- Grant permissions
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipe_ingredients TO authenticated;

COMMIT;

