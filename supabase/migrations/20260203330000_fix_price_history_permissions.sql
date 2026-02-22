-- ============================================================================
-- Migration: Fix price history permissions
-- Description: Ensure both authenticated and service role can read price history
-- ============================================================================

-- Drop and recreate view without security_invoker (simpler approach)
DROP VIEW IF EXISTS public.ingredient_price_history;

CREATE VIEW public.ingredient_price_history AS
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

-- Grant SELECT on the view
GRANT SELECT ON public.ingredient_price_history TO authenticated;
GRANT SELECT ON public.ingredient_price_history TO anon;
GRANT SELECT ON public.ingredient_price_history TO service_role;

-- Grant on underlying stockly table (required for the view to work)
GRANT SELECT ON stockly.ingredient_price_history TO authenticated;
GRANT SELECT ON stockly.ingredient_price_history TO anon;
GRANT SELECT ON stockly.ingredient_price_history TO service_role;

-- Also grant on stock_movements for the history panel
GRANT SELECT ON stockly.stock_movements TO authenticated;
GRANT SELECT ON stockly.stock_movements TO anon;
GRANT SELECT ON stockly.stock_movements TO service_role;

-- Create or replace stock_movements view if it doesn't exist
DROP VIEW IF EXISTS public.stock_movements;

CREATE VIEW public.stock_movements AS
SELECT * FROM stockly.stock_movements;

GRANT SELECT ON public.stock_movements TO authenticated;
GRANT SELECT ON public.stock_movements TO anon;
GRANT SELECT ON public.stock_movements TO service_role;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
