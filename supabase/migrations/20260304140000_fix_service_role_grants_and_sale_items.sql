-- Fix 1: Grant service_role access to stockly schema tables.
-- The views use security_invoker=true, so the invoking role needs direct
-- table access. authenticated has it (from 05-stockly-recipes.sql), but
-- service_role was never granted — causing "permission denied" for admin
-- client operations like the Square sync's idempotency checks.

GRANT USAGE ON SCHEMA stockly TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA stockly TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA stockly GRANT ALL ON TABLES TO service_role;

-- Also grant on public views explicitly
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sale_items TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_imports TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_sales_summary TO service_role;

-- Fix 2: Recreate public.sale_items view so it picks up any missing columns
-- (PostgreSQL expands SELECT * at view creation time)
CREATE OR REPLACE VIEW public.sale_items AS
SELECT * FROM stockly.sale_items;

-- Re-apply security_invoker
ALTER VIEW public.sale_items SET (security_invoker = true);

-- Re-grant permissions on the refreshed view
GRANT SELECT, INSERT, UPDATE ON public.sale_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sale_items TO service_role;

-- Fix 3: Update the sale_items INSERT trigger to:
--   a) Generate UUID if caller doesn't provide one (same fix as sales trigger)
--   b) Skip the access check for service_role (sync runs as service_role)
CREATE OR REPLACE FUNCTION public.insert_sale_items()
RETURNS TRIGGER AS $$
DECLARE
    v_sale_company_id UUID;
BEGIN
    -- Generate an id if the caller didn't provide one
    NEW.id := COALESCE(NEW.id, gen_random_uuid());
    NEW.created_at := COALESCE(NEW.created_at, now());

    -- Security check: verify user has access (skip for service_role)
    IF current_setting('role', true) != 'service_role' THEN
      SELECT company_id INTO v_sale_company_id
      FROM stockly.sales WHERE id = NEW.sale_id;

      IF v_sale_company_id IS NOT NULL AND NOT stockly.stockly_company_access(v_sale_company_id) THEN
          RAISE EXCEPTION 'Access denied: You do not have permission to insert sale items for this company';
      END IF;
    END IF;

    INSERT INTO stockly.sale_items (
        id, sale_id, item_name, category_name, quantity, unit_price, line_total, created_at
    ) VALUES (
        NEW.id, NEW.sale_id, NEW.item_name, NEW.category_name, NEW.quantity, NEW.unit_price, NEW.line_total, NEW.created_at
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Force PostgREST schema reload
NOTIFY pgrst, 'reload schema';
