-- RPC function to read sale items directly from stockly.sale_items,
-- bypassing the public.sale_items view which has a stale PostgREST schema cache.

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

GRANT EXECUTE ON FUNCTION public.get_sale_items_by_sale_ids(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sale_items_by_sale_ids(UUID[]) TO service_role;
