-- ============================================================================
-- Migration: Customer Portal - Waste Tracking
-- Description: Tables, views, and functions for waste/sales logging and insights
-- ============================================================================

-- ============================================================================
-- TABLE: order_book_waste_logs
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.order_book_waste_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES order_book_customers(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES order_book_orders(id) ON DELETE CASCADE,
  
  log_date DATE NOT NULL,
  logged_at TIMESTAMPTZ DEFAULT NOW(),
  logged_by UUID REFERENCES profiles(id),
  
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'reviewed')),
  
  -- Summary totals
  total_ordered INTEGER NOT NULL,
  total_sold INTEGER NOT NULL,
  total_unsold INTEGER GENERATED ALWAYS AS (total_ordered - total_sold) STORED,
  waste_percent DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE 
      WHEN total_ordered > 0 
      THEN ROUND(((total_ordered - total_sold)::DECIMAL / total_ordered * 100), 2)
      ELSE 0 
    END
  ) STORED,
  total_waste_cost DECIMAL(10,2),
  
  -- Notes
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(order_id) -- One log per order
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_waste_logs_customer ON order_book_waste_logs(customer_id);
CREATE INDEX IF NOT EXISTS idx_waste_logs_date ON order_book_waste_logs(log_date);
CREATE INDEX IF NOT EXISTS idx_waste_logs_status ON order_book_waste_logs(status);
CREATE INDEX IF NOT EXISTS idx_waste_logs_order ON order_book_waste_logs(order_id);

-- ============================================================================
-- TABLE: order_book_waste_log_items
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.order_book_waste_log_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  waste_log_id UUID NOT NULL REFERENCES order_book_waste_logs(id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL REFERENCES order_book_order_items(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES order_book_products(id) ON DELETE CASCADE,
  
  ordered_qty INTEGER NOT NULL,
  sold_qty INTEGER NOT NULL CHECK (sold_qty >= 0 AND sold_qty <= ordered_qty),
  unsold_qty INTEGER GENERATED ALWAYS AS (ordered_qty - sold_qty) STORED,
  waste_percent DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE 
      WHEN ordered_qty > 0 
      THEN ROUND(((ordered_qty - sold_qty)::DECIMAL / ordered_qty * 100), 2)
      ELSE 0 
    END
  ) STORED,
  
  unit_price DECIMAL(10,2) NOT NULL,
  waste_cost DECIMAL(10,2) GENERATED ALWAYS AS ((ordered_qty - sold_qty) * unit_price) STORED,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(waste_log_id, order_item_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_waste_log_items_product ON order_book_waste_log_items(product_id);
CREATE INDEX IF NOT EXISTS idx_waste_log_items_log ON order_book_waste_log_items(waste_log_id);

-- ============================================================================
-- VIEW: order_book_daily_waste_summary
-- ============================================================================
CREATE OR REPLACE VIEW order_book_daily_waste_summary AS
SELECT 
  wl.customer_id,
  wl.log_date,
  EXTRACT(DOW FROM wl.log_date) AS day_of_week,
  TO_CHAR(wl.log_date, 'Day') AS day_name,
  wl.total_ordered,
  wl.total_sold,
  wl.total_unsold,
  wl.waste_percent,
  wl.total_waste_cost
FROM order_book_waste_logs wl
WHERE wl.status = 'submitted';

-- ============================================================================
-- VIEW: order_book_product_waste_summary
-- ============================================================================
CREATE OR REPLACE VIEW order_book_product_waste_summary AS
SELECT 
  wl.customer_id,
  wli.product_id,
  p.name AS product_name,
  COUNT(DISTINCT wl.id) AS log_count,
  SUM(wli.ordered_qty) AS total_ordered,
  SUM(wli.sold_qty) AS total_sold,
  SUM(wli.unsold_qty) AS total_unsold,
  ROUND(AVG(wli.waste_percent), 2) AS avg_waste_percent,
  SUM(wli.waste_cost) AS total_waste_cost
FROM order_book_waste_logs wl
JOIN order_book_waste_log_items wli ON wli.waste_log_id = wl.id
JOIN order_book_products p ON p.id = wli.product_id
WHERE wl.status = 'submitted'
  AND wl.log_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY wl.customer_id, wli.product_id, p.name;

-- ============================================================================
-- FUNCTION: get_waste_insights()
-- ============================================================================
CREATE OR REPLACE FUNCTION get_waste_insights(
  p_customer_id UUID,
  p_days INTEGER DEFAULT 30
) RETURNS JSONB AS $$
DECLARE
  v_insights JSONB;
  v_start_date DATE := CURRENT_DATE - (p_days || ' days')::INTERVAL;
BEGIN
  SELECT jsonb_build_object(
    'overview', COALESCE((
      SELECT jsonb_build_object(
        'avg_waste_percent', COALESCE(ROUND(AVG(waste_percent), 2), 0),
        'total_waste_cost', COALESCE(SUM(total_waste_cost), 0),
        'days_logged', COALESCE(COUNT(*), 0),
        'best_day', (
          SELECT day_name 
          FROM order_book_daily_waste_summary
          WHERE customer_id = p_customer_id
            AND log_date >= v_start_date
          ORDER BY waste_percent ASC
          LIMIT 1
        ),
        'worst_day', (
          SELECT day_name
          FROM order_book_daily_waste_summary
          WHERE customer_id = p_customer_id
            AND log_date >= v_start_date
          ORDER BY waste_percent DESC
          LIMIT 1
        )
      )
      FROM order_book_daily_waste_summary
      WHERE customer_id = p_customer_id
        AND log_date >= v_start_date
    ), jsonb_build_object(
      'avg_waste_percent', 0,
      'total_waste_cost', 0,
      'days_logged', 0,
      'best_day', NULL,
      'worst_day', NULL
    )),
    'by_day', COALESCE((
      SELECT jsonb_object_agg(
        day_name,
        jsonb_build_object(
          'avg_waste_percent', ROUND(AVG(waste_percent), 2),
          'log_count', COUNT(*)
        )
      )
      FROM order_book_daily_waste_summary
      WHERE customer_id = p_customer_id
        AND log_date >= v_start_date
      GROUP BY day_of_week, day_name
      ORDER BY day_of_week
    ), '{}'::jsonb),
    'by_product', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'product_id', product_id,
          'product_name', product_name,
          'avg_waste_percent', avg_waste_percent,
          'total_waste_cost', total_waste_cost,
          'status', CASE
            WHEN avg_waste_percent < 10 THEN 'excellent'
            WHEN avg_waste_percent < 20 THEN 'good'
            WHEN avg_waste_percent < 30 THEN 'warning'
            ELSE 'critical'
          END
        ) ORDER BY avg_waste_percent DESC
      )
      FROM order_book_product_waste_summary
      WHERE customer_id = p_customer_id
    ), '[]'::jsonb)
  ) INTO v_insights;
  
  RETURN v_insights;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: get_pending_waste_logs()
-- ============================================================================
-- Returns orders that need waste logging (delivered in last 7 days without logs)
CREATE OR REPLACE FUNCTION get_pending_waste_logs(
  p_customer_id UUID
) RETURNS TABLE (
  order_id UUID,
  order_number TEXT,
  delivery_date DATE,
  total_ordered INTEGER,
  days_since_delivery INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id AS order_id,
    o.order_number,
    o.delivery_date,
    COALESCE(SUM(oi.quantity::INTEGER), 0) AS total_ordered,
    (CURRENT_DATE - o.delivery_date)::INTEGER AS days_since_delivery
  FROM order_book_orders o
  LEFT JOIN order_book_waste_logs wl ON wl.order_id = o.id
  LEFT JOIN order_book_order_items oi ON oi.order_id = o.id
  WHERE o.customer_id = p_customer_id
    AND o.status = 'delivered'
    AND o.delivery_date >= CURRENT_DATE - INTERVAL '7 days'
    AND wl.id IS NULL
  GROUP BY o.id, o.order_number, o.delivery_date
  ORDER BY o.delivery_date DESC;
END;
$$ LANGUAGE plpgsql;

