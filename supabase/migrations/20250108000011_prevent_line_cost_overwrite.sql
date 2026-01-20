-- Prevent line_cost from being overwritten by triggers
-- This ensures that line_cost values saved by the application are preserved

BEGIN;

-- ============================================================================
-- 1. Drop the old JSONB version of calculate_recipe_cost that updates line_cost
-- ============================================================================

-- Drop the JSONB version (if it exists) - it updates line_cost which we don't want
DROP FUNCTION IF EXISTS stockly.calculate_recipe_cost(UUID) CASCADE;

-- The NUMERIC version (created in 20250108000009) doesn't update line_cost, which is correct

-- ============================================================================
-- 2. Ensure trigger_recalculate_recipe doesn't update line_cost
-- ============================================================================

-- Drop and recreate to ensure it only sums existing line_costs
DROP FUNCTION IF EXISTS stockly.trigger_recalculate_recipe() CASCADE;

CREATE OR REPLACE FUNCTION stockly.trigger_recalculate_recipe()
RETURNS TRIGGER AS $$
DECLARE
  v_total_cost NUMERIC;
BEGIN
  -- IMPORTANT: Only sum existing line_costs, DO NOT recalculate or update them
  -- The application calculates and saves line_cost, we should preserve it
  SELECT COALESCE(SUM(ri.line_cost), 0)
  INTO v_total_cost
  FROM stockly.recipe_ingredients ri
  WHERE ri.recipe_id = COALESCE(NEW.recipe_id, OLD.recipe_id);
  
  -- Update recipe's total_cost (if the column exists)
  -- But DO NOT update line_cost in recipe_ingredients
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'stockly' 
    AND table_name = 'recipes' 
    AND column_name = 'total_cost'
  ) THEN
    UPDATE stockly.recipes
    SET total_cost = v_total_cost,
        last_costed_at = NOW()
    WHERE id = COALESCE(NEW.recipe_id, OLD.recipe_id);
  END IF;
  
  -- Also update total_ingredient_cost if that column exists (from automated_cost_flow migration)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'stockly' 
    AND table_name = 'recipes' 
    AND column_name = 'total_ingredient_cost'
  ) THEN
    UPDATE stockly.recipes
    SET total_ingredient_cost = v_total_cost,
        last_cost_calculated_at = NOW()
    WHERE id = COALESCE(NEW.recipe_id, OLD.recipe_id);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 3. Ensure the trigger exists
-- ============================================================================

DROP TRIGGER IF EXISTS recipe_ingredients_changed ON stockly.recipe_ingredients;

CREATE TRIGGER recipe_ingredients_changed
  AFTER INSERT OR UPDATE OR DELETE ON stockly.recipe_ingredients
  FOR EACH ROW 
  EXECUTE FUNCTION stockly.trigger_recalculate_recipe();

COMMIT;

