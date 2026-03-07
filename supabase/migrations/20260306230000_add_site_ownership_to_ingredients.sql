-- Migration: 20260305200000_add_site_ownership_to_ingredients.sql
-- Description: Add site ownership to ingredients_library for flexible per-site ingredients
-- Date: 2026-03-05

-- Add site ownership column
-- NULL = company-wide ingredient (available to all sites)
-- Specific site_id = site-specific ingredient (only available to that site)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'ingredients_library'
    AND column_name = 'owner_site_id'
  ) THEN
    ALTER TABLE public.ingredients_library
      ADD COLUMN owner_site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Index for fast site-specific lookups
CREATE INDEX IF NOT EXISTS idx_ingredients_library_owner_site
  ON public.ingredients_library(company_id, owner_site_id);

-- Index for finding site-specific ingredients
CREATE INDEX IF NOT EXISTS idx_ingredients_library_site_specific
  ON public.ingredients_library(owner_site_id)
  WHERE owner_site_id IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN public.ingredients_library.owner_site_id IS
  'Site ownership: NULL = available to all sites (company-wide); specific site_id = site-specific ingredient only available to that site';

-- View: Ingredients available to a specific site
-- Returns ingredients owned by the site OR company-wide (NULL owner_site_id)
CREATE OR REPLACE VIEW public.v_site_ingredients AS
SELECT
  il.*,
  s.name AS owner_site_name,
  CASE
    WHEN il.owner_site_id IS NULL THEN TRUE
    ELSE FALSE
  END AS is_company_wide
FROM public.ingredients_library il
LEFT JOIN public.sites s ON s.id = il.owner_site_id;

GRANT SELECT ON public.v_site_ingredients TO authenticated;

COMMENT ON VIEW public.v_site_ingredients IS
  'View of ingredients with site ownership information. Use WHERE owner_site_id IS NULL OR owner_site_id = $site_id to get ingredients available to a site.';

-- Function: Get ingredients available to a site
-- Returns ingredients owned by the site OR company-wide
CREATE OR REPLACE FUNCTION public.get_site_ingredients(p_site_id UUID, p_company_id UUID)
RETURNS TABLE (
  id UUID,
  company_id UUID,
  ingredient_name TEXT,
  category TEXT,
  unit TEXT,
  unit_cost NUMERIC,
  owner_site_id UUID,
  owner_site_name TEXT,
  is_company_wide BOOLEAN,
  is_retail_saleable BOOLEAN,
  is_wholesale_saleable BOOLEAN,
  is_online_saleable BOOLEAN,
  retail_price NUMERIC,
  wholesale_price NUMERIC,
  online_price NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    il.id,
    il.company_id,
    il.ingredient_name,
    il.category,
    il.unit,
    il.unit_cost,
    il.owner_site_id,
    s.name AS owner_site_name,
    (il.owner_site_id IS NULL) AS is_company_wide,
    il.is_retail_saleable,
    il.is_wholesale_saleable,
    il.is_online_saleable,
    il.retail_price,
    il.wholesale_price,
    il.online_price
  FROM public.ingredients_library il
  LEFT JOIN public.sites s ON s.id = il.owner_site_id
  WHERE il.company_id = p_company_id
    AND (il.owner_site_id IS NULL OR il.owner_site_id = p_site_id)
  ORDER BY il.ingredient_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_site_ingredients(UUID, UUID) TO authenticated;

COMMENT ON FUNCTION public.get_site_ingredients IS
  'Get all ingredients available to a specific site (site-specific + company-wide ingredients)';

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
