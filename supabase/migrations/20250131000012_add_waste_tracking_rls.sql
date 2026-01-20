-- ============================================================================
-- Migration: Add RLS Policies for Waste Tracking
-- Description: Security policies to ensure customers can only access their own waste logs
-- ============================================================================

-- Enable RLS on waste tracking tables
ALTER TABLE order_book_waste_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_book_waste_log_items ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- POLICIES: order_book_waste_logs
-- ============================================================================

-- Customers can view their own waste logs
DROP POLICY IF EXISTS "Customers can view their waste logs" ON order_book_waste_logs;
CREATE POLICY "Customers can view their waste logs"
ON order_book_waste_logs
FOR SELECT
USING (
  customer_id IN (
    SELECT id FROM order_book_customers
    WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

-- Customers can create waste logs for their orders
DROP POLICY IF EXISTS "Customers can create waste logs" ON order_book_waste_logs;
CREATE POLICY "Customers can create waste logs"
ON order_book_waste_logs
FOR INSERT
WITH CHECK (
  customer_id IN (
    SELECT id FROM order_book_customers
    WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
  AND order_id IN (
    SELECT id FROM order_book_orders
    WHERE customer_id IN (
      SELECT id FROM order_book_customers
      WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  )
);

-- Customers can only update draft waste logs (not submitted ones)
DROP POLICY IF EXISTS "Customers can update draft waste logs" ON order_book_waste_logs;
CREATE POLICY "Customers can update draft waste logs"
ON order_book_waste_logs
FOR UPDATE
USING (
  status = 'draft'
  AND customer_id IN (
    SELECT id FROM order_book_customers
    WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
)
WITH CHECK (
  status = 'draft'
  AND customer_id IN (
    SELECT id FROM order_book_customers
    WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

-- Customers cannot delete waste logs (keep historical data)
-- No DELETE policy = no one can delete (except admins via service role)

-- ============================================================================
-- POLICIES: order_book_waste_log_items
-- ============================================================================

-- Customers can view waste log items for their waste logs
DROP POLICY IF EXISTS "Customers can view their waste log items" ON order_book_waste_log_items;
CREATE POLICY "Customers can view their waste log items"
ON order_book_waste_log_items
FOR SELECT
USING (
  waste_log_id IN (
    SELECT id FROM order_book_waste_logs
    WHERE customer_id IN (
      SELECT id FROM order_book_customers
      WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  )
);

-- Customers can create waste log items for their waste logs
DROP POLICY IF EXISTS "Customers can create waste log items" ON order_book_waste_log_items;
CREATE POLICY "Customers can create waste log items"
ON order_book_waste_log_items
FOR INSERT
WITH CHECK (
  waste_log_id IN (
    SELECT id FROM order_book_waste_logs
    WHERE customer_id IN (
      SELECT id FROM order_book_customers
      WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
    AND status = 'draft'
  )
);

-- Customers can update waste log items for draft waste logs
DROP POLICY IF EXISTS "Customers can update waste log items" ON order_book_waste_log_items;
CREATE POLICY "Customers can update waste log items"
ON order_book_waste_log_items
FOR UPDATE
USING (
  waste_log_id IN (
    SELECT id FROM order_book_waste_logs
    WHERE customer_id IN (
      SELECT id FROM order_book_customers
      WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
    AND status = 'draft'
  )
)
WITH CHECK (
  waste_log_id IN (
    SELECT id FROM order_book_waste_logs
    WHERE customer_id IN (
      SELECT id FROM order_book_customers
      WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
    AND status = 'draft'
  )
);

-- Customers can delete waste log items for draft waste logs
DROP POLICY IF EXISTS "Customers can delete waste log items" ON order_book_waste_log_items;
CREATE POLICY "Customers can delete waste log items"
ON order_book_waste_log_items
FOR DELETE
USING (
  waste_log_id IN (
    SELECT id FROM order_book_waste_logs
    WHERE customer_id IN (
      SELECT id FROM order_book_customers
      WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
    AND status = 'draft'
  )
);

