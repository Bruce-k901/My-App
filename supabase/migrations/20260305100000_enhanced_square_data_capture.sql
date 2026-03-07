-- ============================================================================
-- Enhanced Square Data Capture
-- Adds: customer_id, order_source, fulfillment_type, tips, service_charges,
--       returns_data on sales; modifiers, variation_name, item_note,
--       catalog_object_id on sale_items; total_tips on daily_sales_summary.
-- Then recreates all affected views, triggers, and RPCs.
-- ============================================================================

-- ─── 1. New columns on stockly.sales ─────────────────────────────────────────

ALTER TABLE stockly.sales ADD COLUMN IF NOT EXISTS customer_id TEXT;
ALTER TABLE stockly.sales ADD COLUMN IF NOT EXISTS order_source TEXT;
ALTER TABLE stockly.sales ADD COLUMN IF NOT EXISTS fulfillment_type TEXT;
ALTER TABLE stockly.sales ADD COLUMN IF NOT EXISTS tips_amount NUMERIC(10,2) DEFAULT 0;
ALTER TABLE stockly.sales ADD COLUMN IF NOT EXISTS service_charges JSONB;
ALTER TABLE stockly.sales ADD COLUMN IF NOT EXISTS returns_data JSONB;

CREATE INDEX IF NOT EXISTS idx_sales_customer_id
  ON stockly.sales(company_id, customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sales_order_source
  ON stockly.sales(company_id, order_source) WHERE order_source IS NOT NULL;

-- ─── 2. New columns on stockly.sale_items ────────────────────────────────────

ALTER TABLE stockly.sale_items ADD COLUMN IF NOT EXISTS modifiers JSONB;
ALTER TABLE stockly.sale_items ADD COLUMN IF NOT EXISTS variation_name TEXT;
ALTER TABLE stockly.sale_items ADD COLUMN IF NOT EXISTS item_note TEXT;
ALTER TABLE stockly.sale_items ADD COLUMN IF NOT EXISTS catalog_object_id TEXT;

CREATE INDEX IF NOT EXISTS idx_sale_items_catalog_object
  ON stockly.sale_items(catalog_object_id) WHERE catalog_object_id IS NOT NULL;

-- ─── 3. New column on stockly.daily_sales_summary ────────────────────────────

ALTER TABLE stockly.daily_sales_summary ADD COLUMN IF NOT EXISTS total_tips NUMERIC(10,2) DEFAULT 0;

-- ─── 4. Recreate public.sales view ──────────────────────────────────────────
-- SELECT * is expanded at CREATE time, so we must DROP + CREATE to pick up new cols

DROP VIEW IF EXISTS public.sales CASCADE;

CREATE VIEW public.sales AS SELECT * FROM stockly.sales;
ALTER VIEW public.sales SET (security_invoker = true);

GRANT SELECT, INSERT, UPDATE ON public.sales TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales TO service_role;

-- Insert trigger — must list ALL columns explicitly
CREATE OR REPLACE FUNCTION public.insert_sales()
RETURNS TRIGGER AS $$
BEGIN
  NEW.id := COALESCE(NEW.id, gen_random_uuid());
  NEW.created_at := COALESCE(NEW.created_at, now());
  NEW.updated_at := COALESCE(NEW.updated_at, now());

  INSERT INTO stockly.sales (
    id, company_id, site_id, pos_transaction_id, pos_provider, import_batch_id,
    sale_date, gross_revenue, discounts, net_revenue, vat_amount, total_amount,
    covers, payment_method, status, payment_details, discount_details,
    customer_id, order_source, fulfillment_type, tips_amount, service_charges, returns_data,
    created_at, updated_at
  ) VALUES (
    NEW.id, NEW.company_id, NEW.site_id, NEW.pos_transaction_id, NEW.pos_provider, NEW.import_batch_id,
    NEW.sale_date, NEW.gross_revenue, NEW.discounts, NEW.net_revenue, NEW.vat_amount, NEW.total_amount,
    NEW.covers, NEW.payment_method, NEW.status, NEW.payment_details, NEW.discount_details,
    NEW.customer_id, NEW.order_source, NEW.fulfillment_type, NEW.tips_amount, NEW.service_charges, NEW.returns_data,
    NEW.created_at, NEW.updated_at
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER sales_insert_trigger
  INSTEAD OF INSERT ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.insert_sales();

-- Update trigger — must list ALL columns
CREATE OR REPLACE FUNCTION public.update_sales()
RETURNS TRIGGER AS $$
DECLARE
    v_existing_company_id UUID;
BEGIN
    SELECT company_id INTO v_existing_company_id
    FROM stockly.sales WHERE id = OLD.id;

    IF current_setting('role', true) != 'service_role' THEN
      IF NOT stockly.stockly_company_access(v_existing_company_id) THEN
          RAISE EXCEPTION 'Access denied';
      END IF;
      IF NEW.company_id IS DISTINCT FROM v_existing_company_id THEN
          RAISE EXCEPTION 'Security violation: Cannot change company_id';
      END IF;
    END IF;

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
        customer_id = NEW.customer_id,
        order_source = NEW.order_source,
        fulfillment_type = NEW.fulfillment_type,
        tips_amount = NEW.tips_amount,
        service_charges = NEW.service_charges,
        returns_data = NEW.returns_data,
        updated_at = NEW.updated_at
    WHERE id = OLD.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER sales_update_trigger
  INSTEAD OF UPDATE ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.update_sales();

-- ─── 5. Recreate public.sale_items view ──────────────────────────────────────

DROP VIEW IF EXISTS public.sale_items CASCADE;

CREATE VIEW public.sale_items AS
SELECT
  id, sale_id,
  menu_item_name AS item_name,
  category_name, quantity, unit_price, line_total,
  modifiers, variation_name, item_note, catalog_object_id,
  created_at
FROM stockly.sale_items;

ALTER VIEW public.sale_items SET (security_invoker = true);

GRANT SELECT, INSERT, UPDATE ON public.sale_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sale_items TO service_role;

CREATE OR REPLACE FUNCTION public.insert_sale_items()
RETURNS TRIGGER AS $$
DECLARE
    v_sale_company_id UUID;
BEGIN
    NEW.id := COALESCE(NEW.id, gen_random_uuid());
    NEW.created_at := COALESCE(NEW.created_at, now());

    IF current_setting('role', true) != 'service_role' THEN
      SELECT company_id INTO v_sale_company_id
      FROM stockly.sales WHERE id = NEW.sale_id;
      IF v_sale_company_id IS NOT NULL AND NOT stockly.stockly_company_access(v_sale_company_id) THEN
          RAISE EXCEPTION 'Access denied';
      END IF;
    END IF;

    INSERT INTO stockly.sale_items (
        id, sale_id, menu_item_name, category_name, quantity, unit_price, line_total,
        modifiers, variation_name, item_note, catalog_object_id, created_at
    ) VALUES (
        NEW.id, NEW.sale_id, NEW.item_name, NEW.category_name, NEW.quantity, NEW.unit_price, NEW.line_total,
        NEW.modifiers, NEW.variation_name, NEW.item_note, NEW.catalog_object_id, NEW.created_at
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER sale_items_insert_trigger
  INSTEAD OF INSERT ON public.sale_items
  FOR EACH ROW EXECUTE FUNCTION public.insert_sale_items();

-- ─── 6. Recreate public.daily_sales_summary view ────────────────────────────

DROP VIEW IF EXISTS public.daily_sales_summary CASCADE;

CREATE VIEW public.daily_sales_summary AS SELECT * FROM stockly.daily_sales_summary;
ALTER VIEW public.daily_sales_summary SET (security_invoker = true);

GRANT SELECT, INSERT, UPDATE ON public.daily_sales_summary TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_sales_summary TO service_role;

CREATE OR REPLACE FUNCTION public.insert_daily_sales_summary()
RETURNS TRIGGER AS $$
BEGIN
  NEW.id := COALESCE(NEW.id, gen_random_uuid());
  NEW.created_at := COALESCE(NEW.created_at, now());
  NEW.updated_at := COALESCE(NEW.updated_at, now());

  INSERT INTO stockly.daily_sales_summary (
    id, company_id, site_id, summary_date, gross_revenue, net_revenue,
    total_cost, gross_profit, gp_percentage, total_covers, transaction_count,
    total_tips, created_at, updated_at
  ) VALUES (
    NEW.id, NEW.company_id, NEW.site_id, NEW.summary_date, NEW.gross_revenue, NEW.net_revenue,
    NEW.total_cost, NEW.gross_profit, NEW.gp_percentage, NEW.total_covers, NEW.transaction_count,
    NEW.total_tips, NEW.created_at, NEW.updated_at
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.update_daily_sales_summary()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE stockly.daily_sales_summary SET
    company_id = NEW.company_id,
    site_id = NEW.site_id,
    summary_date = NEW.summary_date,
    gross_revenue = NEW.gross_revenue,
    net_revenue = NEW.net_revenue,
    total_cost = NEW.total_cost,
    gross_profit = NEW.gross_profit,
    gp_percentage = NEW.gp_percentage,
    total_covers = NEW.total_covers,
    transaction_count = NEW.transaction_count,
    total_tips = NEW.total_tips,
    updated_at = NEW.updated_at
  WHERE id = OLD.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER daily_sales_summary_insert_trigger
  INSTEAD OF INSERT ON public.daily_sales_summary
  FOR EACH ROW EXECUTE FUNCTION public.insert_daily_sales_summary();

CREATE TRIGGER daily_sales_summary_update_trigger
  INSTEAD OF UPDATE ON public.daily_sales_summary
  FOR EACH ROW EXECUTE FUNCTION public.update_daily_sales_summary();

-- ─── 7. Update RPCs ─────────────────────────────────────────────────────────

-- Must DROP functions whose return type is changing before recreating
DROP FUNCTION IF EXISTS public.batch_insert_sale_items(JSONB);
DROP FUNCTION IF EXISTS public.get_sale_items_by_sale_ids(UUID[]);

-- Batch insert RPC with new columns
CREATE OR REPLACE FUNCTION public.batch_insert_sale_items(items JSONB)
RETURNS INTEGER AS $$
DECLARE
  item JSONB;
  inserted_count INTEGER := 0;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(items)
  LOOP
    INSERT INTO stockly.sale_items (
      id, sale_id, menu_item_name, category_name, quantity, unit_price, line_total,
      modifiers, variation_name, item_note, catalog_object_id, created_at
    ) VALUES (
      COALESCE((item->>'id')::UUID, gen_random_uuid()),
      (item->>'sale_id')::UUID,
      COALESCE(item->>'item_name', item->>'menu_item_name', 'Unknown Item'),
      item->>'category_name',
      COALESCE((item->>'quantity')::NUMERIC, 1),
      COALESCE((item->>'unit_price')::NUMERIC, 0),
      COALESCE((item->>'line_total')::NUMERIC, 0),
      (item->'modifiers')::JSONB,
      item->>'variation_name',
      item->>'item_note',
      item->>'catalog_object_id',
      COALESCE((item->>'created_at')::TIMESTAMPTZ, now())
    );
    inserted_count := inserted_count + 1;
  END LOOP;
  RETURN inserted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Read RPC with new columns
CREATE OR REPLACE FUNCTION public.get_sale_items_by_sale_ids(sale_ids UUID[])
RETURNS TABLE (
  id UUID,
  sale_id UUID,
  item_name TEXT,
  category_name TEXT,
  quantity NUMERIC,
  unit_price NUMERIC,
  line_total NUMERIC,
  modifiers JSONB,
  variation_name TEXT,
  item_note TEXT,
  catalog_object_id TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    si.id,
    si.sale_id,
    si.menu_item_name AS item_name,
    si.category_name,
    si.quantity,
    si.unit_price,
    si.line_total,
    si.modifiers,
    si.variation_name,
    si.item_note,
    si.catalog_object_id,
    si.created_at
  FROM stockly.sale_items si
  WHERE si.sale_id = ANY(sale_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 8. Update recalculate_daily_summary to include tips ─────────────────────

CREATE OR REPLACE FUNCTION stockly.recalculate_daily_summary(
  p_company_id UUID,
  p_site_id UUID,
  p_date DATE
)
RETURNS VOID AS $$
DECLARE
  v_revenue NUMERIC(10, 2);
  v_gross_revenue NUMERIC(10, 2);
  v_covers INTEGER;
  v_transactions INTEGER;
  v_cost NUMERIC(10, 2);
  v_profit NUMERIC(10, 2);
  v_gp_percentage NUMERIC(5, 2);
  v_tips NUMERIC(10, 2);
BEGIN
  SELECT
    COALESCE(SUM(net_revenue), 0),
    COALESCE(SUM(gross_revenue), 0),
    COALESCE(SUM(covers), 0),
    COUNT(*),
    COALESCE(SUM(tips_amount), 0)
  INTO v_revenue, v_gross_revenue, v_covers, v_transactions, v_tips
  FROM stockly.sales
  WHERE company_id = p_company_id
    AND sale_date = p_date
    AND (p_site_id IS NULL OR site_id = p_site_id)
    AND status = 'completed';

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'deliveries') THEN
    SELECT COALESCE(SUM(d.total), 0)
    INTO v_cost
    FROM public.deliveries d
    WHERE d.company_id = p_company_id
      AND d.delivery_date = p_date
      AND (p_site_id IS NULL OR d.site_id = p_site_id)
      AND d.status = 'confirmed';
  ELSE
    v_cost := 0;
  END IF;

  v_profit := v_revenue - v_cost;
  v_gp_percentage := CASE WHEN v_revenue > 0 THEN (v_profit / v_revenue) * 100 ELSE 0 END;

  INSERT INTO stockly.daily_sales_summary (
    company_id, site_id, summary_date,
    gross_revenue, net_revenue, total_cost, gross_profit, gp_percentage,
    total_covers, transaction_count, total_tips
  ) VALUES (
    p_company_id, p_site_id, p_date,
    v_gross_revenue, v_revenue, v_cost, v_profit, v_gp_percentage,
    v_covers, v_transactions, v_tips
  )
  ON CONFLICT (company_id, site_id, summary_date)
  DO UPDATE SET
    gross_revenue = EXCLUDED.gross_revenue,
    net_revenue = EXCLUDED.net_revenue,
    total_cost = EXCLUDED.total_cost,
    gross_profit = EXCLUDED.gross_profit,
    gp_percentage = EXCLUDED.gp_percentage,
    total_covers = EXCLUDED.total_covers,
    transaction_count = EXCLUDED.transaction_count,
    total_tips = EXCLUDED.total_tips,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 9. Grants + reload ─────────────────────────────────────────────────────

GRANT EXECUTE ON FUNCTION public.batch_insert_sale_items(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.batch_insert_sale_items(JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_sale_items_by_sale_ids(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sale_items_by_sale_ids(UUID[]) TO service_role;

NOTIFY pgrst, 'reload schema';
