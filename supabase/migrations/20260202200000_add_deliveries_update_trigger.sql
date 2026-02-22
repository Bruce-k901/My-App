-- ============================================================================
-- Migration: Add UPDATE trigger for deliveries view
-- Description: Enables UPDATE operations on the public.deliveries view
-- ============================================================================

-- Create UPDATE trigger function for deliveries
CREATE OR REPLACE FUNCTION public.update_deliveries()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE stockly.deliveries
  SET
    invoice_number = COALESCE(NEW.invoice_number, OLD.invoice_number),
    invoice_date = COALESCE(NEW.invoice_date, OLD.invoice_date),
    delivery_note_number = COALESCE(NEW.delivery_note_number, OLD.delivery_note_number),
    status = COALESCE(NEW.status, OLD.status),
    confirmed_by = COALESCE(NEW.confirmed_by, OLD.confirmed_by),
    confirmed_at = COALESCE(NEW.confirmed_at, OLD.confirmed_at),
    total = COALESCE(NEW.total, OLD.total),
    subtotal = COALESCE(NEW.subtotal, OLD.subtotal),
    vat_total = COALESCE(NEW.vat_total, OLD.vat_total),
    updated_at = NOW()
  WHERE id = OLD.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS deliveries_update_trigger ON public.deliveries;

-- Create the INSTEAD OF UPDATE trigger
CREATE TRIGGER deliveries_update_trigger
  INSTEAD OF UPDATE ON public.deliveries
  FOR EACH ROW EXECUTE FUNCTION public.update_deliveries();

-- Also add INSERT trigger for completeness
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

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS deliveries_insert_trigger ON public.deliveries;

-- Create the INSTEAD OF INSERT trigger
CREATE TRIGGER deliveries_insert_trigger
  INSTEAD OF INSERT ON public.deliveries
  FOR EACH ROW EXECUTE FUNCTION public.insert_deliveries();

-- Also add DELETE trigger
CREATE OR REPLACE FUNCTION public.delete_deliveries()
RETURNS TRIGGER AS $$
BEGIN
  -- First delete delivery lines
  DELETE FROM stockly.delivery_lines WHERE delivery_id = OLD.id;
  -- Then delete the delivery
  DELETE FROM stockly.deliveries WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS deliveries_delete_trigger ON public.deliveries;

-- Create the INSTEAD OF DELETE trigger
CREATE TRIGGER deliveries_delete_trigger
  INSTEAD OF DELETE ON public.deliveries
  FOR EACH ROW EXECUTE FUNCTION public.delete_deliveries();

-- Notify schema reload
NOTIFY pgrst, 'reload schema';
