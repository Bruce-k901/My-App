-- ============================================================================
-- Migration: Ensure delivery columns exist and refresh schema
-- Description: Adds missing columns and forces complete schema refresh
-- ============================================================================

-- Add delivery_note_number column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'stockly' AND table_name = 'deliveries' AND column_name = 'delivery_note_number'
  ) THEN
    ALTER TABLE stockly.deliveries ADD COLUMN delivery_note_number TEXT;
    RAISE NOTICE 'Added delivery_note_number column to stockly.deliveries';
  ELSE
    RAISE NOTICE 'delivery_note_number column already exists';
  END IF;
END $$;

-- Add invoice_number column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'stockly' AND table_name = 'deliveries' AND column_name = 'invoice_number'
  ) THEN
    ALTER TABLE stockly.deliveries ADD COLUMN invoice_number TEXT;
    RAISE NOTICE 'Added invoice_number column to stockly.deliveries';
  ELSE
    RAISE NOTICE 'invoice_number column already exists';
  END IF;
END $$;

-- Add invoice_date column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'stockly' AND table_name = 'deliveries' AND column_name = 'invoice_date'
  ) THEN
    ALTER TABLE stockly.deliveries ADD COLUMN invoice_date DATE;
    RAISE NOTICE 'Added invoice_date column to stockly.deliveries';
  ELSE
    RAISE NOTICE 'invoice_date column already exists';
  END IF;
END $$;

-- Add updated_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'stockly' AND table_name = 'deliveries' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE stockly.deliveries ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    RAISE NOTICE 'Added updated_at column to stockly.deliveries';
  ELSE
    RAISE NOTICE 'updated_at column already exists';
  END IF;
END $$;

-- Recreate the view to pick up any new columns
DROP VIEW IF EXISTS public.deliveries CASCADE;

CREATE VIEW public.deliveries AS
SELECT * FROM stockly.deliveries;

ALTER VIEW public.deliveries SET (security_invoker = true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deliveries TO authenticated;

-- Recreate triggers
CREATE OR REPLACE FUNCTION public.update_deliveries()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE stockly.deliveries
  SET
    invoice_number = NEW.invoice_number,
    invoice_date = NEW.invoice_date,
    delivery_note_number = NEW.delivery_note_number,
    status = COALESCE(NEW.status, OLD.status),
    confirmed_by = NEW.confirmed_by,
    confirmed_at = NEW.confirmed_at,
    total = COALESCE(NEW.total, OLD.total),
    subtotal = COALESCE(NEW.subtotal, OLD.subtotal),
    vat_total = COALESCE(NEW.vat_total, OLD.vat_total),
    updated_at = NOW()
  WHERE id = OLD.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS deliveries_update_trigger ON public.deliveries;
CREATE TRIGGER deliveries_update_trigger
  INSTEAD OF UPDATE ON public.deliveries
  FOR EACH ROW EXECUTE FUNCTION public.update_deliveries();

CREATE OR REPLACE FUNCTION public.insert_deliveries()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO stockly.deliveries (
    id, company_id, site_id, supplier_id, purchase_order_id,
    delivery_date, delivery_note_number, invoice_number, invoice_date,
    status, total, subtotal, vat_total, created_at
  ) VALUES (
    COALESCE(NEW.id, gen_random_uuid()),
    NEW.company_id,
    NEW.site_id,
    NEW.supplier_id,
    NEW.purchase_order_id,
    COALESCE(NEW.delivery_date, CURRENT_DATE),
    NEW.delivery_note_number,
    NEW.invoice_number,
    NEW.invoice_date,
    COALESCE(NEW.status, 'pending'),
    NEW.total,
    NEW.subtotal,
    NEW.vat_total,
    NOW()
  )
  RETURNING * INTO NEW;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS deliveries_insert_trigger ON public.deliveries;
CREATE TRIGGER deliveries_insert_trigger
  INSTEAD OF INSERT ON public.deliveries
  FOR EACH ROW EXECUTE FUNCTION public.insert_deliveries();

CREATE OR REPLACE FUNCTION public.delete_deliveries()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM stockly.delivery_lines WHERE delivery_id = OLD.id;
  DELETE FROM stockly.deliveries WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS deliveries_delete_trigger ON public.deliveries;
CREATE TRIGGER deliveries_delete_trigger
  INSTEAD OF DELETE ON public.deliveries
  FOR EACH ROW EXECUTE FUNCTION public.delete_deliveries();

-- Force schema reload with multiple methods
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

-- Also try explicit cache clear (Supabase specific)
SELECT pg_notify('pgrst', 'reload schema');
