-- ============================================================================
-- Migration: 20250231000004_recreate_stock_items_view.sql
-- Description: Recreates the stock_items view to ensure new columns are visible
-- This forces PostgREST to see the allergens, pack_size, and pack_cost columns
-- ============================================================================

-- Drop and recreate the view to ensure new columns are included
DROP VIEW IF EXISTS public.stock_items CASCADE;

CREATE VIEW public.stock_items AS
SELECT * FROM stockly.stock_items;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_items TO authenticated;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

