-- ============================================================================
-- Migration: Sync existing stock levels to ingredients_library.current_stock
-- Description: One-time sync for items that were already delivered
-- ============================================================================

-- Update ingredients_library.current_stock from stockly.stock_levels
-- Sum all stock levels across sites for each ingredient
UPDATE public.ingredients_library il
SET current_stock = COALESCE(stock_totals.total_qty, 0),
    updated_at = NOW()
FROM (
  SELECT
    si.library_item_id,
    SUM(sl.quantity) as total_qty
  FROM stockly.stock_items si
  JOIN stockly.stock_levels sl ON sl.stock_item_id = si.id
  WHERE si.library_type = 'ingredients_library'
    AND si.library_item_id IS NOT NULL
  GROUP BY si.library_item_id
) stock_totals
WHERE il.id = stock_totals.library_item_id;

-- Log how many were updated
DO $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.ingredients_library
  WHERE current_stock > 0;

  RAISE NOTICE 'Updated current_stock for % ingredients', v_count;
END $$;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
