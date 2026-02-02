-- ============================================================================
-- Migration: Recreate delivery_lines view and triggers
-- Description: Ensures delivery_lines view exists with all CRUD triggers
-- ============================================================================

-- Recreate the delivery_lines view
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
    created_at
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
