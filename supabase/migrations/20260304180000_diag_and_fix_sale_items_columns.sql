-- Diagnostic + Fix: Ensure stockly.sale_items has all expected columns.
-- The original migration created the table inside a conditional DO block,
-- which may not have fully executed.

-- First, ensure the table exists
CREATE TABLE IF NOT EXISTS stockly.sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL,
  item_name TEXT NOT NULL DEFAULT 'Unknown Item',
  category_name TEXT,
  quantity NUMERIC(10, 2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  line_total NUMERIC(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- If the table exists but is missing columns, add them
ALTER TABLE stockly.sale_items ADD COLUMN IF NOT EXISTS item_name TEXT NOT NULL DEFAULT 'Unknown Item';
ALTER TABLE stockly.sale_items ADD COLUMN IF NOT EXISTS category_name TEXT;
ALTER TABLE stockly.sale_items ADD COLUMN IF NOT EXISTS quantity NUMERIC(10, 2) NOT NULL DEFAULT 1;
ALTER TABLE stockly.sale_items ADD COLUMN IF NOT EXISTS unit_price NUMERIC(10, 2) NOT NULL DEFAULT 0;
ALTER TABLE stockly.sale_items ADD COLUMN IF NOT EXISTS line_total NUMERIC(10, 2) NOT NULL DEFAULT 0;
ALTER TABLE stockly.sale_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Ensure FK exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'sale_items_sale_id_fkey'
    AND table_schema = 'stockly'
    AND table_name = 'sale_items'
  ) THEN
    ALTER TABLE stockly.sale_items
    ADD CONSTRAINT sale_items_sale_id_fkey
    FOREIGN KEY (sale_id) REFERENCES stockly.sales(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Ensure index exists
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON stockly.sale_items(sale_id);

-- Enable RLS
ALTER TABLE stockly.sale_items ENABLE ROW LEVEL SECURITY;

-- Ensure service_role has full access
GRANT ALL ON stockly.sale_items TO service_role;
GRANT SELECT, INSERT, UPDATE ON stockly.sale_items TO authenticated;

-- Recreate the view to pick up any new columns
DROP VIEW IF EXISTS public.sale_items CASCADE;

CREATE VIEW public.sale_items AS
SELECT * FROM stockly.sale_items;

ALTER VIEW public.sale_items SET (security_invoker = true);

GRANT SELECT, INSERT, UPDATE ON public.sale_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sale_items TO service_role;

-- Recreate INSTEAD OF INSERT trigger
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

-- Recreate the RPC functions to ensure they compile against the fixed table
CREATE OR REPLACE FUNCTION public.batch_insert_sale_items(items JSONB)
RETURNS INTEGER AS $$
DECLARE
  item JSONB;
  inserted_count INTEGER := 0;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(items)
  LOOP
    INSERT INTO stockly.sale_items (
      id, sale_id, item_name, category_name, quantity, unit_price, line_total, created_at
    ) VALUES (
      COALESCE((item->>'id')::UUID, gen_random_uuid()),
      (item->>'sale_id')::UUID,
      item->>'item_name',
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
    si.item_name,
    si.category_name,
    si.quantity,
    si.unit_price,
    si.line_total,
    si.created_at
  FROM stockly.sale_items si
  WHERE si.sale_id = ANY(sale_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.batch_insert_sale_items(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.batch_insert_sale_items(JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_sale_items_by_sale_ids(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sale_items_by_sale_ids(UUID[]) TO service_role;

-- Force PostgREST schema reload
NOTIFY pgrst, 'reload schema';
