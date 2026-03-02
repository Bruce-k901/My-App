-- ============================================================================
-- Migration: Fix stock_levels - add missing columns and recreate view
-- Description: Add avg_cost and total_value columns that are needed for stock updates
-- ============================================================================

-- First add the missing columns to the underlying table
DO $$
BEGIN
  -- Add avg_cost if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'stockly' AND table_name = 'stock_levels' AND column_name = 'avg_cost'
  ) THEN
    ALTER TABLE stockly.stock_levels ADD COLUMN avg_cost DECIMAL(10,4);
    RAISE NOTICE 'Added avg_cost column to stockly.stock_levels';
  END IF;

  -- Add total_value if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'stockly' AND table_name = 'stock_levels' AND column_name = 'total_value'
  ) THEN
    ALTER TABLE stockly.stock_levels ADD COLUMN total_value DECIMAL(12,2);
    RAISE NOTICE 'Added total_value column to stockly.stock_levels';
  END IF;

  -- Add last_count_at if it doesn't exist (might be named differently)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'stockly' AND table_name = 'stock_levels' AND column_name = 'last_count_at'
  ) THEN
    ALTER TABLE stockly.stock_levels ADD COLUMN last_count_at TIMESTAMPTZ;
    RAISE NOTICE 'Added last_count_at column to stockly.stock_levels';
  END IF;
END $$;

-- Drop and recreate the view with all columns
DROP VIEW IF EXISTS public.stock_levels CASCADE;

CREATE VIEW public.stock_levels AS
SELECT * FROM stockly.stock_levels;

ALTER VIEW public.stock_levels SET (security_invoker = true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_levels TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_levels TO anon;

-- Create insert trigger function
CREATE OR REPLACE FUNCTION public.insert_stock_levels()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO stockly.stock_levels (
    id, stock_item_id, site_id, storage_area_id,
    quantity, avg_cost, value, total_value,
    last_movement_at, last_count_at, updated_at
  ) VALUES (
    COALESCE(NEW.id, gen_random_uuid()), NEW.stock_item_id, NEW.site_id, NEW.storage_area_id,
    NEW.quantity, NEW.avg_cost, NEW.value, NEW.total_value,
    NEW.last_movement_at, NEW.last_count_at, COALESCE(NEW.updated_at, NOW())
  )
  ON CONFLICT (stock_item_id, site_id, COALESCE(storage_area_id, '00000000-0000-0000-0000-000000000000'::uuid))
  DO UPDATE SET
    quantity = EXCLUDED.quantity,
    avg_cost = COALESCE(EXCLUDED.avg_cost, stockly.stock_levels.avg_cost),
    value = EXCLUDED.value,
    total_value = COALESCE(EXCLUDED.total_value, stockly.stock_levels.total_value),
    last_movement_at = EXCLUDED.last_movement_at,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS stock_levels_insert_trigger ON public.stock_levels;
CREATE TRIGGER stock_levels_insert_trigger
  INSTEAD OF INSERT ON public.stock_levels
  FOR EACH ROW EXECUTE FUNCTION public.insert_stock_levels();

-- Create update trigger function
CREATE OR REPLACE FUNCTION public.update_stock_levels()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE stockly.stock_levels
  SET
    quantity = COALESCE(NEW.quantity, OLD.quantity),
    avg_cost = COALESCE(NEW.avg_cost, OLD.avg_cost),
    value = COALESCE(NEW.value, OLD.value),
    total_value = COALESCE(NEW.total_value, OLD.total_value),
    last_movement_at = COALESCE(NEW.last_movement_at, OLD.last_movement_at),
    updated_at = NOW()
  WHERE id = OLD.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS stock_levels_update_trigger ON public.stock_levels;
CREATE TRIGGER stock_levels_update_trigger
  INSTEAD OF UPDATE ON public.stock_levels
  FOR EACH ROW EXECUTE FUNCTION public.update_stock_levels();

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
