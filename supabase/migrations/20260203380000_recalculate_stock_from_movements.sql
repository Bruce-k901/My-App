-- ============================================================================
-- Migration: Recalculate stock levels from movement history
-- Description: Fix stock levels that weren't properly accumulated due to
--              earlier function versions. Calculate correct quantities from
--              stock_movements table.
-- ============================================================================

-- Create a function to recalculate stock levels
CREATE OR REPLACE FUNCTION stockly.recalculate_stock_levels()
RETURNS TABLE (
  stock_item_id UUID,
  site_id UUID,
  old_quantity DECIMAL,
  new_quantity DECIMAL,
  movement_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH movement_totals AS (
    -- Calculate net quantity from all movements per stock_item and site
    SELECT
      sm.stock_item_id,
      COALESCE(sm.to_site_id, sm.from_site_id) as site_id,
      SUM(
        CASE
          -- Positive movements (add stock)
          WHEN sm.movement_type IN ('purchase', 'transfer_in', 'production_in', 'return_supplier')
            THEN sm.quantity
          -- Negative movements (remove stock)
          WHEN sm.movement_type IN ('waste', 'transfer_out', 'pos_drawdown', 'internal_sale',
                                     'staff_sale', 'production_out')
            THEN -sm.quantity
          -- Adjustments can be positive or negative
          WHEN sm.movement_type IN ('count_adjustment', 'adjustment')
            THEN sm.quantity
          ELSE 0
        END
      ) as calculated_qty,
      COUNT(*) as num_movements
    FROM stockly.stock_movements sm
    WHERE sm.stock_item_id IS NOT NULL
      AND (sm.to_site_id IS NOT NULL OR sm.from_site_id IS NOT NULL)
    GROUP BY sm.stock_item_id, COALESCE(sm.to_site_id, sm.from_site_id)
  )
  -- Update stock_levels and return what changed
  UPDATE stockly.stock_levels sl
  SET
    quantity = GREATEST(0, mt.calculated_qty), -- Don't allow negative
    total_value = GREATEST(0, mt.calculated_qty) * COALESCE(sl.avg_cost, 0),
    updated_at = NOW()
  FROM movement_totals mt
  WHERE sl.stock_item_id = mt.stock_item_id
    AND sl.site_id = mt.site_id
    AND sl.quantity != mt.calculated_qty
  RETURNING
    sl.stock_item_id,
    sl.site_id,
    sl.quantity as old_quantity,
    mt.calculated_qty as new_quantity,
    mt.num_movements as movement_count;
END;
$$ LANGUAGE plpgsql;

-- Run the recalculation
DO $$
DECLARE
  v_record RECORD;
  v_count INT := 0;
BEGIN
  RAISE NOTICE 'Recalculating stock levels from movements...';

  FOR v_record IN SELECT * FROM stockly.recalculate_stock_levels() LOOP
    RAISE NOTICE 'Updated stock_item % at site %: % -> % (% movements)',
      v_record.stock_item_id,
      v_record.site_id,
      v_record.old_quantity,
      v_record.new_quantity,
      v_record.movement_count;
    v_count := v_count + 1;
  END LOOP;

  RAISE NOTICE 'Recalculated % stock level records', v_count;
END $$;

-- Now sync updated stock levels to ingredients_library
-- The trigger should handle this, but let's ensure it's done
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
WHERE il.id = stock_totals.library_item_id
  AND COALESCE(il.current_stock, 0) != COALESCE(stock_totals.total_qty, 0);

-- Log how many ingredients were updated
DO $$
DECLARE
  v_count INT;
BEGIN
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Synced % ingredient current_stock values', v_count;
END $$;

-- Clean up the function (or keep it for future use)
-- DROP FUNCTION IF EXISTS stockly.recalculate_stock_levels();

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
