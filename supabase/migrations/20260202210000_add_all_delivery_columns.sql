-- ============================================================================
-- Migration: Add all missing delivery columns and fix INSERT trigger
-- Description: Comprehensive fix for all columns used by the invoice upload API
-- ============================================================================

-- Add all columns that the INSERT trigger needs
DO $$
BEGIN
  -- ai_processed column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'stockly' AND table_name = 'deliveries' AND column_name = 'ai_processed'
  ) THEN
    ALTER TABLE stockly.deliveries ADD COLUMN ai_processed BOOLEAN DEFAULT FALSE;
    RAISE NOTICE 'Added ai_processed column';
  END IF;

  -- ai_confidence column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'stockly' AND table_name = 'deliveries' AND column_name = 'ai_confidence'
  ) THEN
    ALTER TABLE stockly.deliveries ADD COLUMN ai_confidence DECIMAL(3,2);
    RAISE NOTICE 'Added ai_confidence column';
  END IF;

  -- ai_raw_response column (JSONB for storing full extraction)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'stockly' AND table_name = 'deliveries' AND column_name = 'ai_raw_response'
  ) THEN
    ALTER TABLE stockly.deliveries ADD COLUMN ai_raw_response JSONB;
    RAISE NOTICE 'Added ai_raw_response column';
  END IF;

  -- ai_extraction column (JSONB for storing extraction data)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'stockly' AND table_name = 'deliveries' AND column_name = 'ai_extraction'
  ) THEN
    ALTER TABLE stockly.deliveries ADD COLUMN ai_extraction JSONB;
    RAISE NOTICE 'Added ai_extraction column';
  END IF;

  -- invoice_file_path column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'stockly' AND table_name = 'deliveries' AND column_name = 'invoice_file_path'
  ) THEN
    ALTER TABLE stockly.deliveries ADD COLUMN invoice_file_path TEXT;
    RAISE NOTICE 'Added invoice_file_path column';
  END IF;

  -- requires_review column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'stockly' AND table_name = 'deliveries' AND column_name = 'requires_review'
  ) THEN
    ALTER TABLE stockly.deliveries ADD COLUMN requires_review BOOLEAN DEFAULT FALSE;
    RAISE NOTICE 'Added requires_review column';
  END IF;

  -- document_urls column (for multiple document references)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'stockly' AND table_name = 'deliveries' AND column_name = 'document_urls'
  ) THEN
    ALTER TABLE stockly.deliveries ADD COLUMN document_urls TEXT[];
    RAISE NOTICE 'Added document_urls column';
  END IF;

  -- tax column (separate from vat_total for compatibility)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'stockly' AND table_name = 'deliveries' AND column_name = 'tax'
  ) THEN
    ALTER TABLE stockly.deliveries ADD COLUMN tax DECIMAL(10,2);
    RAISE NOTICE 'Added tax column';
  END IF;

  -- received_by column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'stockly' AND table_name = 'deliveries' AND column_name = 'received_by'
  ) THEN
    ALTER TABLE stockly.deliveries ADD COLUMN received_by UUID;
    RAISE NOTICE 'Added received_by column';
  END IF;

  -- confirmed_by column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'stockly' AND table_name = 'deliveries' AND column_name = 'confirmed_by'
  ) THEN
    ALTER TABLE stockly.deliveries ADD COLUMN confirmed_by UUID;
    RAISE NOTICE 'Added confirmed_by column';
  END IF;

  -- confirmed_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'stockly' AND table_name = 'deliveries' AND column_name = 'confirmed_at'
  ) THEN
    ALTER TABLE stockly.deliveries ADD COLUMN confirmed_at TIMESTAMPTZ;
    RAISE NOTICE 'Added confirmed_at column';
  END IF;

  -- delivery_note_number column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'stockly' AND table_name = 'deliveries' AND column_name = 'delivery_note_number'
  ) THEN
    ALTER TABLE stockly.deliveries ADD COLUMN delivery_note_number TEXT;
    RAISE NOTICE 'Added delivery_note_number column';
  END IF;

  -- invoice_number column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'stockly' AND table_name = 'deliveries' AND column_name = 'invoice_number'
  ) THEN
    ALTER TABLE stockly.deliveries ADD COLUMN invoice_number TEXT;
    RAISE NOTICE 'Added invoice_number column';
  END IF;

  -- invoice_date column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'stockly' AND table_name = 'deliveries' AND column_name = 'invoice_date'
  ) THEN
    ALTER TABLE stockly.deliveries ADD COLUMN invoice_date DATE;
    RAISE NOTICE 'Added invoice_date column';
  END IF;

  -- updated_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'stockly' AND table_name = 'deliveries' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE stockly.deliveries ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    RAISE NOTICE 'Added updated_at column';
  END IF;

  -- purchase_order_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'stockly' AND table_name = 'deliveries' AND column_name = 'purchase_order_id'
  ) THEN
    ALTER TABLE stockly.deliveries ADD COLUMN purchase_order_id UUID;
    RAISE NOTICE 'Added purchase_order_id column';
  END IF;
END $$;

-- Recreate the view to include all columns
DROP VIEW IF EXISTS public.deliveries CASCADE;

CREATE VIEW public.deliveries AS
SELECT * FROM stockly.deliveries;

ALTER VIEW public.deliveries SET (security_invoker = true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deliveries TO authenticated;

-- Recreate INSERT trigger with all columns
CREATE OR REPLACE FUNCTION public.insert_deliveries()
RETURNS TRIGGER AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO stockly.deliveries (
    id, company_id, site_id, supplier_id, purchase_order_id,
    delivery_date, delivery_note_number, invoice_number, invoice_date,
    subtotal, vat_total, total, tax,
    ai_processed, ai_confidence, ai_raw_response, ai_extraction,
    requires_review, invoice_file_path, document_urls,
    status, received_by, confirmed_by, confirmed_at,
    created_at, updated_at
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
    NEW.subtotal,
    NEW.vat_total,
    NEW.total,
    NEW.tax,
    COALESCE(NEW.ai_processed, FALSE),
    NEW.ai_confidence,
    NEW.ai_raw_response,
    NEW.ai_extraction,
    COALESCE(NEW.requires_review, FALSE),
    NEW.invoice_file_path,
    NEW.document_urls,
    COALESCE(NEW.status, 'draft'),
    NEW.received_by,
    NEW.confirmed_by,
    NEW.confirmed_at,
    COALESCE(NEW.created_at, NOW()),
    NOW()
  )
  RETURNING id INTO new_id;

  -- Return the new record
  NEW.id := new_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS deliveries_insert_trigger ON public.deliveries;
CREATE TRIGGER deliveries_insert_trigger
  INSTEAD OF INSERT ON public.deliveries
  FOR EACH ROW EXECUTE FUNCTION public.insert_deliveries();

-- Recreate UPDATE trigger with all columns
CREATE OR REPLACE FUNCTION public.update_deliveries()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE stockly.deliveries
  SET
    invoice_number = NEW.invoice_number,
    invoice_date = NEW.invoice_date,
    delivery_note_number = NEW.delivery_note_number,
    subtotal = COALESCE(NEW.subtotal, OLD.subtotal),
    vat_total = COALESCE(NEW.vat_total, OLD.vat_total),
    total = COALESCE(NEW.total, OLD.total),
    status = COALESCE(NEW.status, OLD.status),
    confirmed_by = NEW.confirmed_by,
    confirmed_at = NEW.confirmed_at,
    ai_processed = COALESCE(NEW.ai_processed, OLD.ai_processed),
    ai_confidence = COALESCE(NEW.ai_confidence, OLD.ai_confidence),
    ai_raw_response = COALESCE(NEW.ai_raw_response, OLD.ai_raw_response),
    requires_review = COALESCE(NEW.requires_review, OLD.requires_review),
    invoice_file_path = COALESCE(NEW.invoice_file_path, OLD.invoice_file_path),
    updated_at = NOW()
  WHERE id = OLD.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS deliveries_update_trigger ON public.deliveries;
CREATE TRIGGER deliveries_update_trigger
  INSTEAD OF UPDATE ON public.deliveries
  FOR EACH ROW EXECUTE FUNCTION public.update_deliveries();

-- Recreate DELETE trigger
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

-- Force schema reload
NOTIFY pgrst, 'reload schema';
