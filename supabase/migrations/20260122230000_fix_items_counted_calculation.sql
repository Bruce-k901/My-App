-- ============================================================================
-- Migration: Fix items_counted calculation
-- Description: Updates is_counted flag for items with counted_quantity and
--              recalculates items_counted for all stock counts
-- Date: 2026-01-22
-- ============================================================================

BEGIN;

-- ============================================================================
-- Fix is_counted flag for items that have counted_quantity but is_counted is false
-- ============================================================================
DO $$
DECLARE
  v_schema_name TEXT;
  v_table_name TEXT;
  v_items_updated INTEGER := 0;
  v_counts_updated INTEGER := 0;
BEGIN
  -- Determine which schema has stock_count_items
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_schema = 'stockly' AND table_name = 'stock_count_items') THEN
    v_schema_name := 'stockly';
    v_table_name := 'stock_count_items';
  ELSIF EXISTS (SELECT 1 FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = 'stock_count_items') THEN
    v_schema_name := 'public';
    v_table_name := 'stock_count_items';
  ELSE
    RAISE NOTICE 'stock_count_items table not found in stockly or public schema';
    RETURN;
  END IF;

  RAISE NOTICE 'Fixing is_counted flag in schema: %', v_schema_name;

  -- Update is_counted to true for items that have counted_quantity but is_counted is false/null
  EXECUTE format('
    UPDATE %I.%I
    SET is_counted = true
    WHERE counted_quantity IS NOT NULL
      AND (is_counted = false OR is_counted IS NULL)',
    v_schema_name, v_table_name
  );
  
  GET DIAGNOSTICS v_items_updated = ROW_COUNT;
  RAISE NOTICE 'Updated % items with is_counted flag', v_items_updated;

  -- Recalculate items_counted for all stock counts
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_schema = 'stockly' AND table_name = 'stock_counts') THEN
    EXECUTE '
      UPDATE stockly.stock_counts
      SET 
        items_counted = (
          SELECT COUNT(*) 
          FROM stockly.stock_count_items 
          WHERE stock_count_id = stock_counts.id 
            AND is_counted = true
        ),
        updated_at = NOW()
      WHERE EXISTS (
        SELECT 1 FROM stockly.stock_count_items 
        WHERE stock_count_id = stock_counts.id
      )';
    
    GET DIAGNOSTICS v_counts_updated = ROW_COUNT;
    RAISE NOTICE 'Recalculated items_counted for % stock counts', v_counts_updated;
  ELSIF EXISTS (SELECT 1 FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = 'stock_counts') THEN
    EXECUTE '
      UPDATE public.stock_counts
      SET 
        items_counted = (
          SELECT COUNT(*) 
          FROM public.stock_count_items 
          WHERE stock_count_id = stock_counts.id 
            AND (status = ''counted'' OR is_counted = true)
        ),
        updated_at = NOW()
      WHERE EXISTS (
        SELECT 1 FROM public.stock_count_items 
        WHERE stock_count_id = stock_counts.id
      )';
    
    GET DIAGNOSTICS v_counts_updated = ROW_COUNT;
    RAISE NOTICE 'Recalculated items_counted for % stock counts', v_counts_updated;
  END IF;

  RAISE NOTICE 'Fix completed successfully';
END $$;

COMMIT;
