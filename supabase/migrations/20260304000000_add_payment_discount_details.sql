-- Add granular payment and discount tracking to sales
-- payment_details: JSONB array of individual tenders (card, cash, gift card, wallet/loyalty, etc.)
-- discount_details: JSONB array of individual discounts with names (e.g. "Deliveroo 30%", "Loyalty Reward")

ALTER TABLE stockly.sales ADD COLUMN IF NOT EXISTS payment_details JSONB;
ALTER TABLE stockly.sales ADD COLUMN IF NOT EXISTS discount_details JSONB;

-- Recreate the public.sales view so it picks up the new columns
-- (PostgreSQL resolves SELECT * at view creation time, not query time)
CREATE OR REPLACE VIEW public.sales AS
SELECT * FROM stockly.sales;

-- Update the INSTEAD OF INSERT trigger to pass through new columns
CREATE OR REPLACE FUNCTION public.insert_sales()
RETURNS TRIGGER AS $$
BEGIN
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

-- Update the INSTEAD OF UPDATE trigger to pass through new columns
CREATE OR REPLACE FUNCTION public.update_sales()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE stockly.sales SET
    company_id = NEW.company_id,
    site_id = NEW.site_id,
    pos_transaction_id = NEW.pos_transaction_id,
    pos_provider = NEW.pos_provider,
    import_batch_id = NEW.import_batch_id,
    sale_date = NEW.sale_date,
    gross_revenue = NEW.gross_revenue,
    discounts = NEW.discounts,
    net_revenue = NEW.net_revenue,
    vat_amount = NEW.vat_amount,
    total_amount = NEW.total_amount,
    covers = NEW.covers,
    payment_method = NEW.payment_method,
    status = NEW.status,
    payment_details = NEW.payment_details,
    discount_details = NEW.discount_details,
    updated_at = NEW.updated_at
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
