-- FINAL FIX: Ensure ALL functions, views, and triggers use ingredient_id
-- This migration runs AFTER all others to ensure nothing overwrites our fixes
-- It fixes any remaining stock_item_id references that might exist

BEGIN;

-- ============================================================================
-- 1. FORCE FIX: View INSTEAD OF triggers (these are critical - they handle all INSERT/UPDATE)
-- ============================================================================

-- Drop ALL possible trigger names
DROP TRIGGER IF EXISTS recipe_ingredients_insert_trigger ON public.recipe_ingredients;
DROP TRIGGER IF EXISTS recipe_ingredients_update_trigger ON public.recipe_ingredients;
DROP TRIGGER IF EXISTS recipe_ingredients_delete_trigger ON public.recipe_ingredients;

-- Drop ALL possible function names (with and without parameters)
DROP FUNCTION IF EXISTS public.insert_recipe_ingredients() CASCADE;
DROP FUNCTION IF EXISTS public.update_recipe_ingredients() CASCADE;
DROP FUNCTION IF EXISTS public.delete_recipe_ingredients() CASCADE;

-- Recreate insert function with CORRECT schema
CREATE OR REPLACE FUNCTION public.insert_recipe_ingredients()
RETURNS TRIGGER AS $$
DECLARE
  v_id UUID;
BEGIN
  -- Use ingredient_id, unit_id, sort_order (NOT stock_item_id, unit, display_order)
  INSERT INTO stockly.recipe_ingredients (
    id, 
    recipe_id, 
    ingredient_id,  -- NOT stock_item_id
    sub_recipe_id, 
    quantity, 
    unit_id,  -- NOT unit
    sort_order,  -- NOT display_order
    line_cost, 
    company_id, 
    created_at, 
    updated_at
  ) VALUES (
    COALESCE(NEW.id, gen_random_uuid()),
    NEW.recipe_id,
    NEW.ingredient_id,  -- NOT NEW.stock_item_id
    NEW.sub_recipe_id,
    NEW.quantity,
    NEW.unit_id,  -- NOT NEW.unit
    COALESCE(NEW.sort_order, 0),  -- NOT NEW.display_order
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
  -- Use ingredient_id, unit_id, sort_order (NOT stock_item_id, unit, display_order)
  UPDATE stockly.recipe_ingredients SET 
    recipe_id = NEW.recipe_id,
    ingredient_id = NEW.ingredient_id,  -- NOT NEW.stock_item_id
    sub_recipe_id = NEW.sub_recipe_id,
    quantity = NEW.quantity,
    unit_id = NEW.unit_id,  -- NOT NEW.unit
    sort_order = NEW.sort_order,  -- NOT NEW.display_order
    line_cost = NEW.line_cost,
    company_id = NEW.company_id,
    updated_at = NOW()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate triggers
CREATE TRIGGER recipe_ingredients_insert_trigger
  INSTEAD OF INSERT ON public.recipe_ingredients
  FOR EACH ROW 
  EXECUTE FUNCTION public.insert_recipe_ingredients();

CREATE TRIGGER recipe_ingredients_update_trigger
  INSTEAD OF UPDATE ON public.recipe_ingredients
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_recipe_ingredients();

-- ============================================================================
-- 2. FORCE FIX: Ensure view definition is correct
-- ============================================================================

-- Drop and recreate view to ensure it's correct
DROP VIEW IF EXISTS public.recipe_ingredients CASCADE;

CREATE VIEW public.recipe_ingredients AS
SELECT 
  ri.id,
  ri.recipe_id,
  ri.ingredient_id,  -- NOT stock_item_id
  ri.sub_recipe_id,
  ri.quantity,
  ri.unit_id,  -- NOT unit
  ri.sort_order,  -- NOT display_order
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
LEFT JOIN public.ingredients_library il ON il.id = ri.ingredient_id  -- NOT ri.stock_item_id
LEFT JOIN public.uom u ON u.id = ri.unit_id;  -- NOT ri.unit

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
-- 3. FORCE FIX: All other functions that might reference stock_item_id
-- ============================================================================

-- Fix update_recipe_allergens (if it exists)
CREATE OR REPLACE FUNCTION update_recipe_allergens(p_recipe_id UUID)
RETURNS void AS $$
DECLARE
  v_allergens TEXT[];
BEGIN
  SELECT ARRAY_AGG(DISTINCT allergen)
  INTO v_allergens
  FROM (
    SELECT UNNEST(i.allergens) as allergen
    FROM stockly.recipe_ingredients ri
    JOIN public.ingredients_library i ON i.id = ri.ingredient_id  -- NOT ri.stock_item_id
    WHERE ri.recipe_id = p_recipe_id
      AND ri.ingredient_id IS NOT NULL  -- NOT ri.stock_item_id
      AND i.allergens IS NOT NULL
      AND array_length(i.allergens, 1) > 0
  ) sub
  WHERE allergen IS NOT NULL
    AND allergen != '';
  
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'stockly' 
    AND table_name = 'recipes'
    AND table_type = 'BASE TABLE'
    AND EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'stockly' 
      AND table_name = 'recipes' 
      AND column_name = 'allergens'
    )
  ) THEN
    UPDATE stockly.recipes
    SET allergens = COALESCE(v_allergens, ARRAY[]::TEXT[])
    WHERE id = p_recipe_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Fix trigger_update_recipe_allergens
CREATE OR REPLACE FUNCTION trigger_update_recipe_allergens()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM update_recipe_allergens(OLD.recipe_id);
  ELSE
    PERFORM update_recipe_allergens(NEW.recipe_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Fix check_recipe_circular_dependency
CREATE OR REPLACE FUNCTION check_recipe_circular_dependency(
  p_recipe_id UUID,
  p_ingredient_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_max_depth INTEGER := 10;
  v_has_circular BOOLEAN := FALSE;
  v_linked_recipe_id UUID;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ingredients_library') THEN
    SELECT linked_recipe_id INTO v_linked_recipe_id
    FROM public.ingredients_library
    WHERE id = p_ingredient_id;
  END IF;
  
  IF v_linked_recipe_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  IF v_linked_recipe_id = p_recipe_id THEN
    RETURN TRUE;
  END IF;
  
  WITH RECURSIVE recipe_tree AS (
    SELECT 
      v_linked_recipe_id as recipe_id,
      1 as depth
    
    UNION ALL
    
    SELECT 
      il.linked_recipe_id as recipe_id,
      rt.depth + 1
    FROM recipe_tree rt
    JOIN stockly.recipe_ingredients ri ON ri.recipe_id = rt.recipe_id
    JOIN public.ingredients_library il ON il.id = ri.ingredient_id  -- NOT ri.stock_item_id
    WHERE il.linked_recipe_id IS NOT NULL
      AND rt.depth < v_max_depth
  )
  SELECT EXISTS (
    SELECT 1 FROM recipe_tree WHERE recipe_id = p_recipe_id
  ) INTO v_has_circular;
  
  RETURN COALESCE(v_has_circular, FALSE);
END;
$$ LANGUAGE plpgsql;

-- Fix prevent_recipe_circular_dependency
CREATE OR REPLACE FUNCTION prevent_recipe_circular_dependency()
RETURNS TRIGGER AS $$
DECLARE
  v_ingredient_id UUID;
BEGIN
  v_ingredient_id := COALESCE(NEW.ingredient_id, NEW.sub_recipe_id);  -- NOT NEW.stock_item_id
  
  IF v_ingredient_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  IF check_recipe_circular_dependency(NEW.recipe_id, v_ingredient_id) THEN
    RAISE EXCEPTION 'Circular dependency detected: This ingredient''s recipe would create a loop';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. Grant permissions
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipe_ingredients TO authenticated;

COMMIT;

