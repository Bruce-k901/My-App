-- Migration: 20260305300000_add_site_ownership_to_recipes.sql
-- Description: Add site ownership to recipes with validation to prevent cross-site contamination
-- Date: 2026-03-05

-- Add site ownership columns to recipes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'stockly'
    AND table_name = 'recipes'
    AND column_name = 'owner_site_id'
  ) THEN
    ALTER TABLE stockly.recipes
      ADD COLUMN owner_site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'stockly'
    AND table_name = 'recipes'
    AND column_name = 'is_production_recipe'
  ) THEN
    ALTER TABLE stockly.recipes
      ADD COLUMN is_production_recipe BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_recipes_owner_site
  ON stockly.recipes(company_id, owner_site_id, recipe_type);

CREATE INDEX IF NOT EXISTS idx_recipes_production
  ON stockly.recipes(company_id, is_production_recipe)
  WHERE is_production_recipe = TRUE;

-- Comments for documentation
COMMENT ON COLUMN stockly.recipes.owner_site_id IS
  'Site ownership: NULL = available to all sites (company-wide recipe); specific site_id = produced/used only by this site';

COMMENT ON COLUMN stockly.recipes.is_production_recipe IS
  'TRUE = this site produces this recipe for sale/transfer to other sites; FALSE = prep recipe used internally only';

-- Validation Function: Recipe ingredients must be available to the recipe's site
CREATE OR REPLACE FUNCTION stockly.validate_recipe_ingredient_site()
RETURNS TRIGGER AS $$
DECLARE
  v_recipe_site_id UUID;
  v_ingredient_site_id UUID;
  v_recipe_company_id UUID;
  v_ingredient_company_id UUID;
BEGIN
  -- Get recipe's site ownership and company
  SELECT owner_site_id, company_id INTO v_recipe_site_id, v_recipe_company_id
  FROM stockly.recipes
  WHERE id = NEW.recipe_id;

  -- Only validate if recipe is site-specific (has owner_site_id)
  IF v_recipe_site_id IS NOT NULL AND NEW.stock_item_id IS NOT NULL THEN
    -- Get ingredient's site ownership via stock_item link
    SELECT il.owner_site_id, il.company_id INTO v_ingredient_site_id, v_ingredient_company_id
    FROM stockly.stock_items si
    JOIN public.ingredients_library il ON il.id = si.library_item_id
    WHERE si.id = NEW.stock_item_id
    AND si.library_type = 'ingredients_library';

    -- Check company match first
    IF v_ingredient_company_id IS NOT NULL AND v_ingredient_company_id != v_recipe_company_id THEN
      RAISE EXCEPTION 'Cannot add ingredient from different company to recipe';
    END IF;

    -- If ingredient is site-specific, it must match recipe's site
    -- Company-wide ingredients (NULL owner_site_id) can be used by any site
    IF v_ingredient_site_id IS NOT NULL AND v_ingredient_site_id != v_recipe_site_id THEN
      RAISE EXCEPTION 'Cannot add ingredient from site % to recipe owned by site %. Use company-wide ingredients or ingredients owned by the same site.',
        v_ingredient_site_id, v_recipe_site_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists (idempotent)
DROP TRIGGER IF EXISTS validate_recipe_ingredient_site ON stockly.recipe_ingredients;

-- Create validation trigger
CREATE TRIGGER validate_recipe_ingredient_site
  BEFORE INSERT OR UPDATE ON stockly.recipe_ingredients
  FOR EACH ROW EXECUTE FUNCTION stockly.validate_recipe_ingredient_site();

COMMENT ON FUNCTION stockly.validate_recipe_ingredient_site() IS
  'Validates that recipe ingredients are available to the recipe''s site. Prevents site-specific ingredients from being used in recipes owned by other sites.';

-- View: Recipes available to a site
CREATE OR REPLACE VIEW stockly.v_site_recipes AS
SELECT
  r.*,
  s.name AS owner_site_name,
  CASE
    WHEN r.owner_site_id IS NULL THEN TRUE
    ELSE FALSE
  END AS is_company_wide
FROM stockly.recipes r
LEFT JOIN public.sites s ON s.id = r.owner_site_id;

GRANT SELECT ON stockly.v_site_recipes TO authenticated;

COMMENT ON VIEW stockly.v_site_recipes IS
  'View of recipes with site ownership information. Use WHERE owner_site_id IS NULL OR owner_site_id = $site_id to get recipes available to a site.';

-- Function: Get recipes available to a site
CREATE OR REPLACE FUNCTION stockly.get_site_recipes(p_site_id UUID, p_company_id UUID)
RETURNS TABLE (
  id UUID,
  company_id UUID,
  name TEXT,
  recipe_type TEXT,
  owner_site_id UUID,
  owner_site_name TEXT,
  is_company_wide BOOLEAN,
  is_production_recipe BOOLEAN,
  yield_quantity NUMERIC,
  yield_unit TEXT,
  cost_per_portion NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.company_id,
    r.name,
    r.recipe_type,
    r.owner_site_id,
    s.name AS owner_site_name,
    (r.owner_site_id IS NULL) AS is_company_wide,
    r.is_production_recipe,
    r.yield_quantity,
    r.yield_unit,
    r.cost_per_portion
  FROM stockly.recipes r
  LEFT JOIN public.sites s ON s.id = r.owner_site_id
  WHERE r.company_id = p_company_id
    AND (r.owner_site_id IS NULL OR r.owner_site_id = p_site_id)
  ORDER BY r.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION stockly.get_site_recipes(UUID, UUID) TO authenticated;

COMMENT ON FUNCTION stockly.get_site_recipes IS
  'Get all recipes available to a specific site (site-specific + company-wide recipes)';

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
