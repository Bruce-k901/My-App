-- ============================================================================
-- Migration: Fix price_history schema to support both use cases
-- Description: Adds columns needed by update_stock_on_delivery_confirm function
--              while keeping existing columns for Phase 2 price change tracking
-- ============================================================================

-- Add columns used by the stock update function (if they don't exist)
DO $$
BEGIN
  -- product_variant_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'stockly' AND table_name = 'price_history' AND column_name = 'product_variant_id'
  ) THEN
    ALTER TABLE stockly.price_history ADD COLUMN product_variant_id UUID;
    RAISE NOTICE 'Added product_variant_id column';
  END IF;

  -- old_price column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'stockly' AND table_name = 'price_history' AND column_name = 'old_price'
  ) THEN
    ALTER TABLE stockly.price_history ADD COLUMN old_price NUMERIC;
    RAISE NOTICE 'Added old_price column';
  END IF;

  -- new_price column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'stockly' AND table_name = 'price_history' AND column_name = 'new_price'
  ) THEN
    ALTER TABLE stockly.price_history ADD COLUMN new_price NUMERIC;
    RAISE NOTICE 'Added new_price column';
  END IF;

  -- old_price_per_base column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'stockly' AND table_name = 'price_history' AND column_name = 'old_price_per_base'
  ) THEN
    ALTER TABLE stockly.price_history ADD COLUMN old_price_per_base NUMERIC;
    RAISE NOTICE 'Added old_price_per_base column';
  END IF;

  -- new_price_per_base column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'stockly' AND table_name = 'price_history' AND column_name = 'new_price_per_base'
  ) THEN
    ALTER TABLE stockly.price_history ADD COLUMN new_price_per_base NUMERIC;
    RAISE NOTICE 'Added new_price_per_base column';
  END IF;

  -- source column (different from change_source)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'stockly' AND table_name = 'price_history' AND column_name = 'source'
  ) THEN
    ALTER TABLE stockly.price_history ADD COLUMN source TEXT;
    RAISE NOTICE 'Added source column';
  END IF;

  -- source_ref column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'stockly' AND table_name = 'price_history' AND column_name = 'source_ref'
  ) THEN
    ALTER TABLE stockly.price_history ADD COLUMN source_ref TEXT;
    RAISE NOTICE 'Added source_ref column';
  END IF;

  -- recorded_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'stockly' AND table_name = 'price_history' AND column_name = 'recorded_at'
  ) THEN
    ALTER TABLE stockly.price_history ADD COLUMN recorded_at TIMESTAMPTZ DEFAULT NOW();
    RAISE NOTICE 'Added recorded_at column';
  END IF;

  -- recorded_by column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'stockly' AND table_name = 'price_history' AND column_name = 'recorded_by'
  ) THEN
    ALTER TABLE stockly.price_history ADD COLUMN recorded_by UUID;
    RAISE NOTICE 'Added recorded_by column';
  END IF;

  -- Make company_id nullable (since function doesn't always have it)
  ALTER TABLE stockly.price_history ALTER COLUMN company_id DROP NOT NULL;

  -- Make ingredient_id nullable (function uses product_variant_id instead)
  ALTER TABLE stockly.price_history ALTER COLUMN ingredient_id DROP NOT NULL;

  -- Make change_source nullable (function uses source column instead)
  ALTER TABLE stockly.price_history ALTER COLUMN change_source DROP NOT NULL;

END $$;

-- Recreate the view to include new columns
DROP VIEW IF EXISTS public.price_history;
CREATE VIEW public.price_history AS
SELECT * FROM stockly.price_history;

GRANT SELECT, INSERT ON public.price_history TO authenticated;
ALTER VIEW public.price_history SET (security_invoker = true);

-- Add insert trigger for the view
CREATE OR REPLACE FUNCTION public.insert_price_history()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO stockly.price_history (
    company_id, ingredient_id, product_variant_id,
    old_unit_cost, new_unit_cost, old_pack_cost, new_pack_cost,
    old_price, new_price, old_price_per_base, new_price_per_base,
    change_percent, change_source, change_reason,
    reference_type, reference_id, source, source_ref,
    changed_by, changed_at, recorded_by, recorded_at, notes
  ) VALUES (
    NEW.company_id, NEW.ingredient_id, NEW.product_variant_id,
    NEW.old_unit_cost, NEW.new_unit_cost, NEW.old_pack_cost, NEW.new_pack_cost,
    NEW.old_price, NEW.new_price, NEW.old_price_per_base, NEW.new_price_per_base,
    NEW.change_percent, NEW.change_source, NEW.change_reason,
    NEW.reference_type, NEW.reference_id, NEW.source, NEW.source_ref,
    NEW.changed_by, COALESCE(NEW.changed_at, NOW()), NEW.recorded_by, COALESCE(NEW.recorded_at, NOW()), NEW.notes
  )
  RETURNING * INTO NEW;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS price_history_insert_trigger ON public.price_history;
CREATE TRIGGER price_history_insert_trigger
  INSTEAD OF INSERT ON public.price_history
  FOR EACH ROW EXECUTE FUNCTION public.insert_price_history();

-- Force schema reload
NOTIFY pgrst, 'reload schema';
