-- Create function to load recipes with creator/updater profile names
-- This is the proper production solution for loading recipes with related data
-- Function is created in public schema for RPC access
-- PRODUCTION-GRADE: Only selects columns that actually exist in the table

BEGIN;

-- Drop function if it exists to avoid conflicts
DROP FUNCTION IF EXISTS public.get_recipes_with_profiles(UUID);

CREATE OR REPLACE FUNCTION public.get_recipes_with_profiles(p_company_id UUID)
RETURNS TABLE (
  id UUID,
  company_id UUID,
  name TEXT,
  code TEXT,
  description TEXT,
  recipe_type TEXT,
  recipe_status TEXT,
  menu_category TEXT,
  yield_qty DECIMAL,
  yield_unit_id UUID,
  total_ingredient_cost DECIMAL,
  total_cost DECIMAL,
  cost_per_portion DECIMAL,
  ingredient_cost DECIMAL,
  calculated_yield_qty DECIMAL,
  unit_cost DECIMAL,
  sell_price DECIMAL,
  target_gp_percent DECIMAL,
  actual_gp_percent DECIMAL,
  shelf_life_days INTEGER,
  storage_requirements TEXT,
  allergens TEXT[],
  version_number DECIMAL,
  is_active BOOLEAN,
  linked_sop_id UUID,
  output_ingredient_id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  created_by UUID,
  updated_by UUID,
  archived_from_recipe_id UUID,
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  last_cost_calculated_at TIMESTAMPTZ,
  created_by_name TEXT,
  updated_by_name TEXT,
  yield_unit JSONB,
  output_ingredient JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.company_id,
    r.name,
    r.code,
    r.description,
    r.recipe_type,
    r.recipe_status,
    r.menu_category,
    -- Use yield_qty if it exists, otherwise fall back to yield_quantity
    COALESCE(r.yield_qty, r.yield_quantity) as yield_qty,
    r.yield_unit_id,
    r.total_ingredient_cost,
    r.total_cost,
    r.cost_per_portion,
    -- ingredient_cost doesn't exist as a column, use total_ingredient_cost or total_cost
    COALESCE(r.total_ingredient_cost, r.total_cost, 0) as ingredient_cost,
    r.calculated_yield_qty,
    r.unit_cost,
    r.sell_price,
    r.target_gp_percent,
    r.actual_gp_percent,
    r.shelf_life_days,
    r.storage_requirements,
    r.allergens,
    r.version_number,
    r.is_active,
    r.linked_sop_id,
    r.output_ingredient_id,
    r.created_at,
    r.updated_at,
    r.created_by,
    r.updated_by,
    r.archived_from_recipe_id,
    r.archived_at,
    r.archived_by,
    r.last_cost_calculated_at,
    -- Creator name with fallback chain
    COALESCE(
      creator.full_name,
      creator.email,
      'Unknown'
    ) as created_by_name,
    -- Updater name with fallback to creator if updater not set
    COALESCE(
      updater.full_name,
      updater.email,
      creator.full_name,
      creator.email,
      'Unknown'
    ) as updated_by_name,
    -- Yield unit as JSONB object (from uom table)
    CASE 
      WHEN u.id IS NOT NULL THEN
        jsonb_build_object(
          'id', u.id,
          'name', u.name,
          'abbreviation', u.abbreviation,
          'base_multiplier', u.base_multiplier,
          'unit_type', u.unit_type
        )
      ELSE NULL
    END as yield_unit,
    -- Output ingredient as JSONB object
    CASE 
      WHEN i.id IS NOT NULL THEN
        jsonb_build_object(
          'id', i.id,
          'ingredient_name', i.ingredient_name,
          'is_prep_item', i.is_prep_item
        )
      ELSE NULL
    END as output_ingredient
  FROM stockly.recipes r
  LEFT JOIN public.profiles creator ON creator.id = r.created_by
  LEFT JOIN public.profiles updater ON updater.id = r.updated_by
  LEFT JOIN public.uom u ON u.id = r.yield_unit_id
  LEFT JOIN public.ingredients_library i ON i.id = r.output_ingredient_id
  WHERE r.company_id = p_company_id
    AND (r.recipe_status IS NULL OR r.recipe_status != 'archived')
    AND (r.is_archived IS NULL OR r.is_archived = false)
  ORDER BY r.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_recipes_with_profiles(UUID) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.get_recipes_with_profiles(UUID) IS 
'Loads all recipes for a company with creator/updater profile names and related data (units, ingredients) as JSONB objects';

COMMIT;

