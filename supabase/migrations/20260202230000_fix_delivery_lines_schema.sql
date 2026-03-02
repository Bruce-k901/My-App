-- ============================================================================
-- Migration: Fix delivery_lines schema to support AI invoice processing
-- Description: Adds all missing columns to stockly.delivery_lines table
-- ============================================================================

-- Add all missing columns to stockly.delivery_lines
DO $$
BEGIN
  -- stock_item_id column (for direct stock item reference)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'stockly' AND table_name = 'delivery_lines' AND column_name = 'stock_item_id'
  ) THEN
    ALTER TABLE stockly.delivery_lines ADD COLUMN stock_item_id UUID;
    RAISE NOTICE 'Added stock_item_id column';
  END IF;

  -- line_number column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'stockly' AND table_name = 'delivery_lines' AND column_name = 'line_number'
  ) THEN
    ALTER TABLE stockly.delivery_lines ADD COLUMN line_number INTEGER;
    RAISE NOTICE 'Added line_number column';
  END IF;

  -- description column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'stockly' AND table_name = 'delivery_lines' AND column_name = 'description'
  ) THEN
    ALTER TABLE stockly.delivery_lines ADD COLUMN description TEXT;
    RAISE NOTICE 'Added description column';
  END IF;

  -- supplier_code column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'stockly' AND table_name = 'delivery_lines' AND column_name = 'supplier_code'
  ) THEN
    ALTER TABLE stockly.delivery_lines ADD COLUMN supplier_code TEXT;
    RAISE NOTICE 'Added supplier_code column';
  END IF;

  -- quantity_ordered column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'stockly' AND table_name = 'delivery_lines' AND column_name = 'quantity_ordered'
  ) THEN
    ALTER TABLE stockly.delivery_lines ADD COLUMN quantity_ordered DECIMAL(12,4);
    RAISE NOTICE 'Added quantity_ordered column';
  END IF;

  -- quantity_received column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'stockly' AND table_name = 'delivery_lines' AND column_name = 'quantity_received'
  ) THEN
    ALTER TABLE stockly.delivery_lines ADD COLUMN quantity_received DECIMAL(12,4);
    RAISE NOTICE 'Added quantity_received column';
  END IF;

  -- quantity_rejected column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'stockly' AND table_name = 'delivery_lines' AND column_name = 'quantity_rejected'
  ) THEN
    ALTER TABLE stockly.delivery_lines ADD COLUMN quantity_rejected DECIMAL(12,4) DEFAULT 0;
    RAISE NOTICE 'Added quantity_rejected column';
  END IF;

  -- unit column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'stockly' AND table_name = 'delivery_lines' AND column_name = 'unit'
  ) THEN
    ALTER TABLE stockly.delivery_lines ADD COLUMN unit TEXT;
    RAISE NOTICE 'Added unit column';
  END IF;

  -- match_status column (API uses this name)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'stockly' AND table_name = 'delivery_lines' AND column_name = 'match_status'
  ) THEN
    ALTER TABLE stockly.delivery_lines ADD COLUMN match_status TEXT DEFAULT 'unmatched';
    RAISE NOTICE 'Added match_status column';
  END IF;

  -- match_confidence column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'stockly' AND table_name = 'delivery_lines' AND column_name = 'match_confidence'
  ) THEN
    ALTER TABLE stockly.delivery_lines ADD COLUMN match_confidence DECIMAL(3,2);
    RAISE NOTICE 'Added match_confidence column';
  END IF;

  -- rejection_reason column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'stockly' AND table_name = 'delivery_lines' AND column_name = 'rejection_reason'
  ) THEN
    ALTER TABLE stockly.delivery_lines ADD COLUMN rejection_reason TEXT;
    RAISE NOTICE 'Added rejection_reason column';
  END IF;

  -- rejection_notes column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'stockly' AND table_name = 'delivery_lines' AND column_name = 'rejection_notes'
  ) THEN
    ALTER TABLE stockly.delivery_lines ADD COLUMN rejection_notes TEXT;
    RAISE NOTICE 'Added rejection_notes column';
  END IF;

  -- rejection_photo_url column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'stockly' AND table_name = 'delivery_lines' AND column_name = 'rejection_photo_url'
  ) THEN
    ALTER TABLE stockly.delivery_lines ADD COLUMN rejection_photo_url TEXT;
    RAISE NOTICE 'Added rejection_photo_url column';
  END IF;

  -- created_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'stockly' AND table_name = 'delivery_lines' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE stockly.delivery_lines ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    RAISE NOTICE 'Added created_at column';
  END IF;

  -- updated_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'stockly' AND table_name = 'delivery_lines' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE stockly.delivery_lines ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    RAISE NOTICE 'Added updated_at column';
  END IF;

  -- suggested_stock_item column (JSONB for unmatched items)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'stockly' AND table_name = 'delivery_lines' AND column_name = 'suggested_stock_item'
  ) THEN
    ALTER TABLE stockly.delivery_lines ADD COLUMN suggested_stock_item JSONB;
    RAISE NOTICE 'Added suggested_stock_item column';
  END IF;

  -- qty_base_units column (may not exist)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'stockly' AND table_name = 'delivery_lines' AND column_name = 'qty_base_units'
  ) THEN
    ALTER TABLE stockly.delivery_lines ADD COLUMN qty_base_units DECIMAL(12,4);
    RAISE NOTICE 'Added qty_base_units column';
  END IF;

  -- Make product_variant_id nullable (for unmatched items)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'stockly' AND table_name = 'delivery_lines'
    AND column_name = 'product_variant_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE stockly.delivery_lines ALTER COLUMN product_variant_id DROP NOT NULL;
    RAISE NOTICE 'Made product_variant_id nullable';
  END IF;

  -- Make qty_base_units nullable (may not be calculated for unmatched items)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'stockly' AND table_name = 'delivery_lines'
    AND column_name = 'qty_base_units' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE stockly.delivery_lines ALTER COLUMN qty_base_units DROP NOT NULL;
    RAISE NOTICE 'Made qty_base_units nullable';
  END IF;

END $$;

-- Recreate the view to include all new columns
DROP VIEW IF EXISTS public.delivery_lines;

CREATE VIEW public.delivery_lines AS
SELECT * FROM stockly.delivery_lines;

ALTER VIEW public.delivery_lines SET (security_invoker = true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_lines TO authenticated;

-- Create INSERT trigger function for delivery_lines
CREATE OR REPLACE FUNCTION public.insert_delivery_lines()
RETURNS TRIGGER AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO stockly.delivery_lines (
    id, delivery_id, product_variant_id, stock_item_id, line_number,
    description, supplier_code, quantity_ordered, quantity_received, quantity_rejected,
    unit, unit_price, line_total, vat_rate, vat_amount, line_total_inc_vat, qty_base_units,
    match_status, match_confidence, rejection_reason, rejection_notes, rejection_photo_url,
    suggested_stock_item, created_at
  ) VALUES (
    COALESCE(NEW.id, gen_random_uuid()),
    NEW.delivery_id,
    NEW.product_variant_id,
    NEW.stock_item_id,
    NEW.line_number,
    NEW.description,
    NEW.supplier_code,
    NEW.quantity_ordered,
    NEW.quantity_received,
    NEW.quantity_rejected,
    NEW.unit,
    NEW.unit_price,
    NEW.line_total,
    NEW.vat_rate,
    NEW.vat_amount,
    NEW.line_total_inc_vat,
    NEW.qty_base_units,
    COALESCE(NEW.match_status, 'unmatched'),
    NEW.match_confidence,
    NEW.rejection_reason,
    NEW.rejection_notes,
    NEW.rejection_photo_url,
    NEW.suggested_stock_item,
    NOW()
  )
  RETURNING id INTO new_id;

  NEW.id := new_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS delivery_lines_insert_trigger ON public.delivery_lines;
CREATE TRIGGER delivery_lines_insert_trigger
  INSTEAD OF INSERT ON public.delivery_lines
  FOR EACH ROW EXECUTE FUNCTION public.insert_delivery_lines();

-- Create UPDATE trigger function for delivery_lines
CREATE OR REPLACE FUNCTION public.update_delivery_lines()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE stockly.delivery_lines
  SET
    product_variant_id = COALESCE(NEW.product_variant_id, OLD.product_variant_id),
    stock_item_id = COALESCE(NEW.stock_item_id, OLD.stock_item_id),
    description = COALESCE(NEW.description, OLD.description),
    supplier_code = COALESCE(NEW.supplier_code, OLD.supplier_code),
    quantity_ordered = COALESCE(NEW.quantity_ordered, OLD.quantity_ordered),
    quantity_received = NEW.quantity_received,
    quantity_rejected = NEW.quantity_rejected,
    unit_price = COALESCE(NEW.unit_price, OLD.unit_price),
    line_total = COALESCE(NEW.line_total, OLD.line_total),
    vat_rate = COALESCE(NEW.vat_rate, OLD.vat_rate),
    vat_amount = COALESCE(NEW.vat_amount, OLD.vat_amount),
    line_total_inc_vat = COALESCE(NEW.line_total_inc_vat, OLD.line_total_inc_vat),
    match_status = COALESCE(NEW.match_status, OLD.match_status),
    match_confidence = COALESCE(NEW.match_confidence, OLD.match_confidence),
    rejection_reason = NEW.rejection_reason,
    rejection_notes = NEW.rejection_notes,
    rejection_photo_url = NEW.rejection_photo_url,
    updated_at = NOW()
  WHERE id = OLD.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS delivery_lines_update_trigger ON public.delivery_lines;
CREATE TRIGGER delivery_lines_update_trigger
  INSTEAD OF UPDATE ON public.delivery_lines
  FOR EACH ROW EXECUTE FUNCTION public.update_delivery_lines();

-- Create DELETE trigger function for delivery_lines
CREATE OR REPLACE FUNCTION public.delete_delivery_lines()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM stockly.delivery_lines WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS delivery_lines_delete_trigger ON public.delivery_lines;
CREATE TRIGGER delivery_lines_delete_trigger
  INSTEAD OF DELETE ON public.delivery_lines
  FOR EACH ROW EXECUTE FUNCTION public.delete_delivery_lines();

-- Force schema reload
NOTIFY pgrst, 'reload schema';
