-- ============================================================================
-- Migration: Add public view for ingredient_price_history
-- Description: Exposes stockly.ingredient_price_history to PostgREST via public schema
-- ============================================================================

-- Create public view for ingredient_price_history
CREATE OR REPLACE VIEW public.ingredient_price_history AS
SELECT
  id,
  company_id,
  ingredient_id,
  old_unit_cost,
  new_unit_cost,
  old_pack_cost,
  new_pack_cost,
  old_pack_size,
  new_pack_size,
  change_percent,
  source,
  source_ref,
  recorded_at,
  recorded_by,
  notes
FROM stockly.ingredient_price_history;

-- Set security invoker for RLS
ALTER VIEW public.ingredient_price_history SET (security_invoker = true);

-- Grant permissions
GRANT SELECT ON public.ingredient_price_history TO authenticated;
GRANT SELECT ON public.ingredient_price_history TO anon;

-- Also grant on the underlying table for the view to work
GRANT SELECT ON stockly.ingredient_price_history TO authenticated;
GRANT SELECT ON stockly.ingredient_price_history TO anon;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
