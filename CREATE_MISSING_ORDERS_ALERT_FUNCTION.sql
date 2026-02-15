-- =====================================================
-- CREATE get_missing_orders_alert FUNCTION
-- =====================================================
-- Identifies regular customers who haven't placed their usual orders.
-- Looks back 3 weeks to establish ordering patterns, then flags
-- customers who are expected to order but haven't.
--
-- NOTE: The app currently uses the API-based approach
-- (standing orders table + JS logic) rather than this RPC.
-- This function is provided as an alternative for direct DB queries
-- or future cron-based alerting.

CREATE OR REPLACE FUNCTION get_missing_orders_alert(
  p_company_id UUID,
  p_site_id UUID DEFAULT NULL
)
RETURNS TABLE(
  customer_id UUID,
  customer_name TEXT,
  last_order_date DATE,
  expected_order_date DATE,
  order_frequency TEXT,
  days_overdue INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH regular_customers AS (
    SELECT
      po.customer_id,
      COUNT(*) as order_count,
      MAX(po.order_date) as last_order_date,
      AVG(
        EXTRACT(EPOCH FROM (po.order_date - LAG(po.order_date) OVER (PARTITION BY po.customer_id ORDER BY po.order_date))) / 86400
      ) as avg_days_between_orders
    FROM planly_orders po
    WHERE po.company_id = p_company_id
      AND (p_site_id IS NULL OR po.customer_id IN (
        SELECT id FROM planly_customers WHERE site_id = p_site_id
      ))
      AND po.order_date >= CURRENT_DATE - INTERVAL '21 days'
      AND po.status NOT IN ('cancelled', 'draft')
    GROUP BY po.customer_id
    HAVING COUNT(*) >= 2
  ),

  expected_orders AS (
    SELECT
      rc.customer_id,
      c.name,
      rc.last_order_date,
      rc.order_count,
      rc.avg_days_between_orders,
      rc.last_order_date + (COALESCE(rc.avg_days_between_orders, 7) || ' days')::INTERVAL as expected_date,
      EXISTS (
        SELECT 1 FROM planly_orders po
        WHERE po.customer_id = rc.customer_id
          AND po.delivery_date >= CURRENT_DATE + INTERVAL '3 days'
          AND po.delivery_date <= CURRENT_DATE + INTERVAL '10 days'
      ) as has_upcoming_order
    FROM regular_customers rc
    JOIN planly_customers c ON c.id = rc.customer_id
  )

  SELECT
    eo.customer_id,
    eo.name,
    eo.last_order_date,
    eo.expected_date::DATE,
    CASE
      WHEN eo.avg_days_between_orders <= 8 THEN 'Weekly'
      WHEN eo.avg_days_between_orders <= 15 THEN 'Bi-weekly'
      ELSE 'Monthly'
    END as frequency,
    (CURRENT_DATE - eo.expected_date::DATE)::INTEGER as overdue_days
  FROM expected_orders eo
  WHERE eo.has_upcoming_order = false
    AND eo.expected_date::DATE <= CURRENT_DATE + INTERVAL '4 days'
  ORDER BY eo.expected_date ASC;
END;
$$;
