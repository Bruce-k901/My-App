-- RPC function to get top selling items for a date range
-- Used by daily digest to show top performers

CREATE OR REPLACE FUNCTION get_top_selling_items(
  p_company_id uuid,
  p_site_id uuid DEFAULT NULL,
  p_date_from text DEFAULT NULL,
  p_date_to text DEFAULT NULL,
  p_limit int DEFAULT 10
)
RETURNS TABLE (
  name text,
  quantity numeric,
  revenue numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If no date range provided, default to today
  IF p_date_from IS NULL THEN
    p_date_from := CURRENT_DATE::text;
  END IF;
  IF p_date_to IS NULL THEN
    p_date_to := CURRENT_DATE::text;
  END IF;

  RETURN QUERY
  SELECT
    si.item_name as name,
    SUM(si.quantity)::numeric as quantity,
    SUM(si.line_total)::numeric as revenue
  FROM sale_items si
  INNER JOIN sales s ON s.id = si.sale_id
  WHERE s.company_id = p_company_id
    AND s.status = 'completed'
    AND s.sale_date >= p_date_from::date
    AND s.sale_date <= p_date_to::date
    AND (p_site_id IS NULL OR s.site_id = p_site_id)
  GROUP BY si.item_name
  ORDER BY SUM(si.line_total) DESC
  LIMIT p_limit;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_top_selling_items TO authenticated;

COMMENT ON FUNCTION get_top_selling_items IS 'Gets top selling items by revenue for a given date range';
