-- Diagnostic: The stockly.sale_items table has "menu_item_name" (NOT NULL)
-- instead of "item_name". Some migration created the table with different
-- column names. Our previous migration added an "item_name" column, but the
-- original NOT NULL "menu_item_name" column still exists and blocks inserts.
--
-- Fix: Drop the redundant item_name column we added, and update the RPCs
-- to use the actual column names. We'll alias in the read RPC so the app
-- code doesn't need to change.

-- First drop the view that depends on item_name, then drop the redundant column.
DROP VIEW IF EXISTS public.sale_items CASCADE;
ALTER TABLE stockly.sale_items DROP COLUMN IF EXISTS item_name;

-- Update batch insert RPC to use actual column name
CREATE OR REPLACE FUNCTION public.batch_insert_sale_items(items JSONB)
RETURNS INTEGER AS $$
DECLARE
  item JSONB;
  inserted_count INTEGER := 0;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(items)
  LOOP
    INSERT INTO stockly.sale_items (
      id, sale_id, menu_item_name, category_name, quantity, unit_price, line_total, created_at
    ) VALUES (
      COALESCE((item->>'id')::UUID, gen_random_uuid()),
      (item->>'sale_id')::UUID,
      COALESCE(item->>'item_name', item->>'menu_item_name', 'Unknown Item'),
      item->>'category_name',
      COALESCE((item->>'quantity')::NUMERIC, 1),
      COALESCE((item->>'unit_price')::NUMERIC, 0),
      COALESCE((item->>'line_total')::NUMERIC, 0),
      COALESCE((item->>'created_at')::TIMESTAMPTZ, now())
    );
    inserted_count := inserted_count + 1;
  END LOOP;

  RETURN inserted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update read RPC to alias menu_item_name as item_name for the app
CREATE OR REPLACE FUNCTION public.get_sale_items_by_sale_ids(sale_ids UUID[])
RETURNS TABLE (
  id UUID,
  sale_id UUID,
  item_name TEXT,
  category_name TEXT,
  quantity NUMERIC,
  unit_price NUMERIC,
  line_total NUMERIC,
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
    si.created_at
  FROM stockly.sale_items si
  WHERE si.sale_id = ANY(sale_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the INSTEAD OF INSERT trigger on the view to map item_name -> menu_item_name
DROP VIEW IF EXISTS public.sale_items CASCADE;

CREATE VIEW public.sale_items AS
SELECT
  id,
  sale_id,
  menu_item_name AS item_name,
  category_name,
  quantity,
  unit_price,
  line_total,
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
        id, sale_id, menu_item_name, category_name, quantity, unit_price, line_total, created_at
    ) VALUES (
        NEW.id, NEW.sale_id, NEW.item_name, NEW.category_name, NEW.quantity, NEW.unit_price, NEW.line_total, NEW.created_at
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER sale_items_insert_trigger
  INSTEAD OF INSERT ON public.sale_items
  FOR EACH ROW EXECUTE FUNCTION public.insert_sale_items();

-- Grant RPC permissions
GRANT EXECUTE ON FUNCTION public.batch_insert_sale_items(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.batch_insert_sale_items(JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_sale_items_by_sale_ids(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sale_items_by_sale_ids(UUID[]) TO service_role;

NOTIFY pgrst, 'reload schema';
