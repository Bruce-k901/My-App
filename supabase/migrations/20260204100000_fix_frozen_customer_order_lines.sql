-- Migration: Fix ship_state for existing order lines from frozen customers
-- When this migration runs, it will update all order lines to 'frozen'
-- for customers who have frozen_only=true or default_ship_state='frozen'

-- Update order lines for frozen-only customers
UPDATE planly_order_lines ol
SET ship_state = 'frozen'
FROM planly_orders o
JOIN planly_customers c ON o.customer_id = c.id
WHERE ol.order_id = o.id
  AND (c.frozen_only = true OR c.default_ship_state = 'frozen')
  AND ol.ship_state = 'baked';

-- Log the count of updated rows (for debugging in Supabase logs)
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO updated_count
  FROM planly_order_lines ol
  JOIN planly_orders o ON ol.order_id = o.id
  JOIN planly_customers c ON o.customer_id = c.id
  WHERE (c.frozen_only = true OR c.default_ship_state = 'frozen')
    AND ol.ship_state = 'frozen';

  RAISE NOTICE 'Total frozen order lines for frozen customers: %', updated_count;
END $$;
