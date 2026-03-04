-- Fix: INSERT trigger was passing NEW.id directly, which is NULL when callers
-- don't provide an id. The column default (gen_random_uuid()) isn't used because
-- the trigger explicitly provides a value.
--
-- IMPORTANT: We must assign NEW.id BEFORE the INSERT so that RETURN NEW
-- gives the caller back the actual generated UUID. Without this, the
-- .select('id') after .insert() returns NULL and sale_items can never
-- be linked to their parent sale.

CREATE OR REPLACE FUNCTION public.insert_sales()
RETURNS TRIGGER AS $$
BEGIN
  -- Generate an id if the caller didn't provide one
  NEW.id := COALESCE(NEW.id, gen_random_uuid());
  NEW.created_at := COALESCE(NEW.created_at, now());
  NEW.updated_at := COALESCE(NEW.updated_at, now());

  INSERT INTO stockly.sales (
    id, company_id, site_id, pos_transaction_id, pos_provider, import_batch_id,
    sale_date, gross_revenue, discounts, net_revenue, vat_amount, total_amount,
    covers, payment_method, status, payment_details, discount_details,
    created_at, updated_at
  ) VALUES (
    NEW.id, NEW.company_id, NEW.site_id, NEW.pos_transaction_id, NEW.pos_provider, NEW.import_batch_id,
    NEW.sale_date, NEW.gross_revenue, NEW.discounts, NEW.net_revenue, NEW.vat_amount, NEW.total_amount,
    NEW.covers, NEW.payment_method, NEW.status, NEW.payment_details, NEW.discount_details,
    NEW.created_at, NEW.updated_at
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
