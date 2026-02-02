-- ============================================================================
-- Migration: Fix delivery_lines RLS access
-- Description: Grant SELECT on stockly tables needed for RLS policy checks
-- ============================================================================

-- The RLS policy on stockly.delivery_lines checks stockly.deliveries
-- Authenticated users need SELECT access for the RLS check to work
GRANT SELECT ON stockly.deliveries TO authenticated;
GRANT SELECT ON stockly.delivery_lines TO authenticated;

-- Also ensure the update trigger has proper permissions
-- The trigger function needs to be able to bypass RLS for updates
DROP FUNCTION IF EXISTS public.update_delivery_lines() CASCADE;

CREATE OR REPLACE FUNCTION public.update_delivery_lines()
RETURNS TRIGGER AS $$
BEGIN
  -- Use elevated privileges to update the stockly table
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

-- Recreate the trigger
DROP TRIGGER IF EXISTS delivery_lines_update_trigger ON public.delivery_lines;
CREATE TRIGGER delivery_lines_update_trigger
  INSTEAD OF UPDATE ON public.delivery_lines
  FOR EACH ROW EXECUTE FUNCTION public.update_delivery_lines();

-- Force schema reload
NOTIFY pgrst, 'reload schema';
