-- ============================================================================
-- Migration: Manual fix for stock quantities to base units
-- Description: Update stock_levels and ingredients to use base units
--              (pack_size × quantity)
-- ============================================================================

-- Update stock levels: multiply quantity by pack_size from ingredients_library
UPDATE stockly.stock_levels sl
SET
  quantity = sl.quantity * COALESCE(NULLIF(il.pack_size, '')::NUMERIC, 1),
  total_value = (sl.quantity * COALESCE(NULLIF(il.pack_size, '')::NUMERIC, 1)) * COALESCE(sl.avg_cost, 0),
  updated_at = NOW()
FROM stockly.stock_items si
JOIN public.ingredients_library il ON si.library_item_id = il.id
WHERE sl.stock_item_id = si.id
  AND si.library_type = 'ingredients_library'
  AND il.pack_size IS NOT NULL
  AND il.pack_size != ''
  AND NULLIF(il.pack_size, '')::NUMERIC > 1
  -- Only update where quantity is small (likely in packs, not base units)
  AND sl.quantity < 1000;

DO $$
DECLARE
  v_count INT;
BEGIN
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Updated % stock_levels to base units', v_count;
END $$;

-- Also update stock movements for consistency
UPDATE stockly.stock_movements sm
SET
  quantity = sm.quantity * COALESCE(NULLIF(il.pack_size, '')::NUMERIC, 1),
  notes = format('%s [Converted: %s packs × %s pack_size]',
                 COALESCE(sm.notes, ''),
                 sm.quantity / COALESCE(NULLIF(il.pack_size, '')::NUMERIC, 1),
                 COALESCE(NULLIF(il.pack_size, '')::NUMERIC, 1))
FROM stockly.stock_items si
JOIN public.ingredients_library il ON si.library_item_id = il.id
WHERE sm.stock_item_id = si.id
  AND si.library_type = 'ingredients_library'
  AND il.pack_size IS NOT NULL
  AND il.pack_size != ''
  AND NULLIF(il.pack_size, '')::NUMERIC > 1
  -- Only update where quantity is small (likely in packs, not base units)
  AND sm.quantity < 1000
  AND sm.movement_type = 'purchase';

DO $$
DECLARE
  v_count INT;
BEGIN
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Updated % stock_movements to base units', v_count;
END $$;

-- Sync to ingredients_library
UPDATE public.ingredients_library il
SET current_stock = stock_totals.total_qty,
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

DO $$
DECLARE
  v_count INT;
BEGIN
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Synced % ingredients current_stock', v_count;
END $$;

-- Notify PostgREST
NOTIFY pgrst, 'reload schema';
