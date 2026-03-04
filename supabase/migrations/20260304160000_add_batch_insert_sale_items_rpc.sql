-- RPC function to batch-insert sale items directly into stockly.sale_items,
-- bypassing the public.sale_items view entirely. This avoids PostgREST schema
-- cache issues with the view.

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

GRANT EXECUTE ON FUNCTION public.batch_insert_sale_items(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.batch_insert_sale_items(JSONB) TO service_role;
