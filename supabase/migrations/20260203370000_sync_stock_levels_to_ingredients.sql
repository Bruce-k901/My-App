-- ============================================================================
-- Migration: Create trigger to sync stock_levels to ingredients_library
-- Description: Automatically update ingredients_library.current_stock when
--              stockly.stock_levels changes (from any source: deliveries,
--              stock counts, waste, sales, transfers, etc.)
-- ============================================================================

-- Create function to sync stock level to ingredients_library
CREATE OR REPLACE FUNCTION stockly.sync_stock_to_ingredients()
RETURNS TRIGGER AS $$
DECLARE
  v_library_item_id UUID;
  v_library_type TEXT;
  v_total_stock DECIMAL(12,4);
BEGIN
  -- Get the library_item_id for this stock_item
  SELECT library_item_id, library_type
  INTO v_library_item_id, v_library_type
  FROM stockly.stock_items
  WHERE id = COALESCE(NEW.stock_item_id, OLD.stock_item_id);

  -- Only sync if linked to ingredients_library
  IF v_library_item_id IS NOT NULL AND v_library_type = 'ingredients_library' THEN
    -- Calculate total stock across all sites for this item
    SELECT COALESCE(SUM(quantity), 0)
    INTO v_total_stock
    FROM stockly.stock_levels
    WHERE stock_item_id = COALESCE(NEW.stock_item_id, OLD.stock_item_id);

    -- Update the ingredients_library current_stock
    UPDATE public.ingredients_library
    SET current_stock = v_total_stock,
        updated_at = NOW()
    WHERE id = v_library_item_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS sync_stock_to_ingredients_trigger ON stockly.stock_levels;

-- Create trigger for INSERT, UPDATE, DELETE on stock_levels
CREATE TRIGGER sync_stock_to_ingredients_trigger
  AFTER INSERT OR UPDATE OR DELETE ON stockly.stock_levels
  FOR EACH ROW
  EXECUTE FUNCTION stockly.sync_stock_to_ingredients();

-- Also create a similar trigger for stock_movements to log to ingredient history
-- This captures waste, sales, transfers, etc.
CREATE OR REPLACE FUNCTION stockly.log_movement_to_ingredient_history()
RETURNS TRIGGER AS $$
DECLARE
  v_library_item_id UUID;
  v_library_type TEXT;
BEGIN
  -- Only process for movement types that affect stock
  IF NEW.movement_type NOT IN ('purchase', 'waste', 'transfer_in', 'transfer_out',
                                'pos_drawdown', 'internal_sale', 'staff_sale',
                                'production_in', 'production_out', 'count_adjustment',
                                'adjustment', 'return_supplier') THEN
    RETURN NEW;
  END IF;

  -- Get the library_item_id for this stock_item
  SELECT library_item_id, library_type
  INTO v_library_item_id, v_library_type
  FROM stockly.stock_items
  WHERE id = NEW.stock_item_id;

  -- Only log if linked to ingredients_library
  IF v_library_item_id IS NOT NULL AND v_library_type = 'ingredients_library' THEN
    -- The stock movement is already recorded in stockly.stock_movements
    -- The sync_stock_to_ingredients_trigger will handle updating current_stock
    -- when stock_levels is updated

    -- We could add additional ingredient-specific logging here if needed
    NULL; -- Placeholder for future enhancements
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for stock_movements (informational, for future use)
DROP TRIGGER IF EXISTS log_movement_to_ingredient_trigger ON stockly.stock_movements;
CREATE TRIGGER log_movement_to_ingredient_trigger
  AFTER INSERT ON stockly.stock_movements
  FOR EACH ROW
  EXECUTE FUNCTION stockly.log_movement_to_ingredient_history();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION stockly.sync_stock_to_ingredients() TO authenticated;
GRANT EXECUTE ON FUNCTION stockly.log_movement_to_ingredient_history() TO authenticated;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
