-- ============================================================================
-- Migration: 20260201000002_add_updated_by_to_recipes_view.sql
-- Description: Add missing updated_by column to public.recipes view
-- ============================================================================

-- Need to DROP and recreate since we're adding a column in the middle
DROP VIEW IF EXISTS public.recipes CASCADE;

-- Recreate the recipes view with ALL columns including updated_by
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
  updated_by,  -- ADDED at end to avoid column order issues
  data_version
FROM stockly.recipes;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipes TO authenticated;
