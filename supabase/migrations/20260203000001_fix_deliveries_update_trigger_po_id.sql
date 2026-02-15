-- ============================================================================
-- Migration: Fix deliveries UPDATE trigger to include purchase_order_id
-- Description: The existing trigger was missing purchase_order_id, causing
--              PO linking to silently fail
-- ============================================================================

-- Recreate UPDATE trigger function to include purchase_order_id
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
    -- ADDED: purchase_order_id for PO linking
    purchase_order_id = NEW.purchase_order_id,
    updated_at = NOW()
  WHERE id = OLD.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- The trigger doesn't need to be recreated since it references the function
-- But let's ensure it exists
DROP TRIGGER IF EXISTS deliveries_update_trigger ON public.deliveries;
CREATE TRIGGER deliveries_update_trigger
  INSTEAD OF UPDATE ON public.deliveries
  FOR EACH ROW EXECUTE FUNCTION public.update_deliveries();

-- Notify schema reload
NOTIFY pgrst, 'reload schema';
