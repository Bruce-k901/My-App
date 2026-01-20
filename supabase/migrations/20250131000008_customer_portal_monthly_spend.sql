-- ============================================================================
-- Migration: Customer Portal - Monthly Spend Summary
-- Description: Views and functions for monthly spend analytics
-- ============================================================================

-- ============================================================================
-- VIEW: order_book_monthly_spend_summary
-- ============================================================================
-- Aggregates monthly spend data per customer
CREATE OR REPLACE VIEW order_book_monthly_spend_summary AS
SELECT 
  o.customer_id,
  DATE_TRUNC('month', o.delivery_date)::DATE AS month_date,
  COUNT(DISTINCT o.id) AS order_count,
  SUM(o.total) AS total_spend,
  AVG(o.total) AS avg_order_value,
  SUM(oi.quantity) AS total_units_ordered,
  COUNT(DISTINCT oi.product_id) AS unique_products
FROM order_book_orders o
JOIN order_book_order_items oi ON oi.order_id = o.id
WHERE o.status != 'cancelled'
GROUP BY o.customer_id, DATE_TRUNC('month', o.delivery_date);

-- ============================================================================
-- VIEW: order_book_monthly_product_breakdown
-- ============================================================================
-- Product-level breakdown for monthly reports
CREATE OR REPLACE VIEW order_book_monthly_product_breakdown AS
SELECT 
  o.customer_id,
  DATE_TRUNC('month', o.delivery_date)::DATE AS month_date,
  p.id AS product_id,
  p.name AS product_name,
  SUM(oi.quantity) AS total_quantity,
  SUM(oi.line_total) AS total_spend,
  AVG(oi.unit_price) AS avg_unit_price
FROM order_book_orders o
JOIN order_book_order_items oi ON oi.order_id = o.id
JOIN order_book_products p ON p.id = oi.product_id
WHERE o.status != 'cancelled'
GROUP BY o.customer_id, DATE_TRUNC('month', o.delivery_date), p.id, p.name;

-- ============================================================================
-- FUNCTION: get_monthly_summary()
-- ============================================================================
-- Returns comprehensive monthly summary with previous month comparison
CREATE OR REPLACE FUNCTION get_monthly_summary(
  p_customer_id UUID,
  p_month DATE
) RETURNS JSONB AS $$
DECLARE
  v_summary JSONB;
  v_previous_month DATE := (DATE_TRUNC('month', p_month) - INTERVAL '1 month')::DATE;
BEGIN
  SELECT jsonb_build_object(
    'current_month', (
      SELECT row_to_json(s)
      FROM order_book_monthly_spend_summary s
      WHERE s.customer_id = p_customer_id
        AND s.month_date = DATE_TRUNC('month', p_month)::DATE
    ),
    'previous_month', (
      SELECT row_to_json(s)
      FROM order_book_monthly_spend_summary s
      WHERE s.customer_id = p_customer_id
        AND s.month_date = v_previous_month
    ),
    'top_products', (
      SELECT jsonb_agg(row_to_json(p) ORDER BY p.total_spend DESC)
      FROM (
        SELECT *
        FROM order_book_monthly_product_breakdown
        WHERE customer_id = p_customer_id
          AND month_date = DATE_TRUNC('month', p_month)::DATE
        LIMIT 10
      ) p
    )
  ) INTO v_summary;
  
  RETURN v_summary;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: get_monthly_spend_by_week()
-- ============================================================================
-- Returns weekly breakdown for a given month
CREATE OR REPLACE FUNCTION get_monthly_spend_by_week(
  p_customer_id UUID,
  p_month DATE
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_month_start DATE := DATE_TRUNC('month', p_month)::DATE;
  v_month_end DATE := (DATE_TRUNC('month', p_month) + INTERVAL '1 month - 1 day')::DATE;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'week', week_num,
      'start_date', week_start,
      'end_date', week_end,
      'spend', COALESCE(week_spend, 0),
      'order_count', COALESCE(week_orders, 0)
    ) ORDER BY week_num
  ) INTO v_result
  FROM (
    SELECT 
      EXTRACT(WEEK FROM o.delivery_date) - EXTRACT(WEEK FROM v_month_start) + 1 AS week_num,
      DATE_TRUNC('week', o.delivery_date)::DATE AS week_start,
      (DATE_TRUNC('week', o.delivery_date) + INTERVAL '6 days')::DATE AS week_end,
      SUM(o.total) AS week_spend,
      COUNT(DISTINCT o.id) AS week_orders
    FROM order_book_orders o
    WHERE o.customer_id = p_customer_id
      AND o.delivery_date >= v_month_start
      AND o.delivery_date <= v_month_end
      AND o.status != 'cancelled'
    GROUP BY week_num, week_start, week_end
  ) weeks;
  
  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: get_monthly_trends()
-- ============================================================================
-- Returns last 6 months of spend data for trend analysis
CREATE OR REPLACE FUNCTION get_monthly_trends(
  p_customer_id UUID,
  p_current_month DATE
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_start_date DATE := (DATE_TRUNC('month', p_current_month) - INTERVAL '5 months')::DATE;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'month', month_date,
      'total_spend', COALESCE(total_spend, 0),
      'order_count', COALESCE(order_count, 0),
      'avg_order_value', COALESCE(avg_order_value, 0)
    ) ORDER BY month_date
  ) INTO v_result
  FROM (
    SELECT 
      month_date,
      total_spend,
      order_count,
      avg_order_value
    FROM order_book_monthly_spend_summary
    WHERE customer_id = p_customer_id
      AND month_date >= v_start_date
      AND month_date <= DATE_TRUNC('month', p_current_month)::DATE
  ) trends;
  
  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;

