-- Force drop and recreate the sale_items view.
-- CREATE OR REPLACE VIEW didn't update the column set, so we need a full drop.

-- Drop the view (CASCADE drops the trigger too)
DROP VIEW IF EXISTS public.sale_items CASCADE;

-- Recreate with all columns from the underlying table
CREATE VIEW public.sale_items AS
SELECT * FROM stockly.sale_items;

-- Re-apply security_invoker
ALTER VIEW public.sale_items SET (security_invoker = true);

-- Re-grant permissions
GRANT SELECT, INSERT, UPDATE ON public.sale_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sale_items TO service_role;

-- Recreate the INSTEAD OF INSERT trigger
CREATE OR REPLACE FUNCTION public.insert_sale_items()
RETURNS TRIGGER AS $$
DECLARE
    v_sale_company_id UUID;
BEGIN
    NEW.id := COALESCE(NEW.id, gen_random_uuid());
    NEW.created_at := COALESCE(NEW.created_at, now());

    -- Security check: skip for service_role (sync runs as service_role)
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

CREATE TRIGGER sale_items_insert_trigger
  INSTEAD OF INSERT ON public.sale_items
  FOR EACH ROW EXECUTE FUNCTION public.insert_sale_items();

-- Force PostgREST schema reload
NOTIFY pgrst, 'reload schema';
