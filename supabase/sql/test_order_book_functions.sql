-- ============================================================================
-- Order Book Functionality Test Script
-- Run these queries to test the Order Book system is working correctly
-- ============================================================================

-- ============================================================================
-- TEST 1: Generate Standing Orders
-- ============================================================================
-- This should create orders from standing orders for the next 7 days
SELECT 'TEST 1: Generate Standing Orders' as test_name;

SELECT generate_standing_orders(7) as orders_generated;

-- View the generated orders
SELECT 
  o.order_number,
  c.business_name as customer,
  o.delivery_date,
  o.status,
  o.total::money as order_total,
  (SELECT COUNT(*) FROM order_book_order_items oi WHERE oi.order_id = o.id) as item_count
FROM order_book_orders o
JOIN order_book_customers c ON c.id = o.customer_id
WHERE o.delivery_date >= CURRENT_DATE
ORDER BY o.delivery_date, c.business_name;

-- ============================================================================
-- TEST 2: View Order Items
-- ============================================================================
SELECT 'TEST 2: View Order Items' as test_name;

SELECT 
  o.order_number,
  p.name as product,
  oi.quantity,
  oi.unit_price::money as unit_price,
  oi.line_total::money as line_total
FROM order_book_order_items oi
JOIN order_book_orders o ON o.id = oi.order_id
JOIN order_book_products p ON p.id = oi.product_id
WHERE o.delivery_date >= CURRENT_DATE
ORDER BY o.delivery_date, o.order_number, p.name
LIMIT 20;

-- ============================================================================
-- TEST 3: Calculate Production Plans
-- ============================================================================
SELECT 'TEST 3: Calculate Production Plans' as test_name;

-- Get a delivery date that has orders
WITH delivery_with_orders AS (
  SELECT DISTINCT delivery_date
  FROM order_book_orders
  WHERE delivery_date >= CURRENT_DATE
    AND status IN ('confirmed', 'locked')
  ORDER BY delivery_date
  LIMIT 1
)
SELECT 
  delivery_date,
  calculate_production_plan(
    (SELECT id FROM order_book_suppliers LIMIT 1),
    delivery_date
  ) as schedule_id
FROM delivery_with_orders;

-- View the production schedule
SELECT 
  delivery_date,
  total_orders,
  total_items,
  total_value::money as total_value,
  status,
  jsonb_array_length(timeline) as timeline_stages,
  jsonb_array_length(capacity_warnings) as capacity_warnings_count
FROM order_book_production_schedule
WHERE delivery_date >= CURRENT_DATE
ORDER BY delivery_date
LIMIT 5;

-- View timeline details (first delivery date)
SELECT 
  delivery_date,
  jsonb_pretty(timeline) as timeline_details
FROM order_book_production_schedule
WHERE delivery_date >= CURRENT_DATE
ORDER BY delivery_date
LIMIT 1;

-- ============================================================================
-- TEST 4: Calculate Ingredient Pulls
-- ============================================================================
SELECT 'TEST 4: Calculate Ingredient Pulls' as test_name;

-- Get a delivery date
WITH delivery_date AS (
  SELECT DISTINCT delivery_date
  FROM order_book_orders
  WHERE delivery_date >= CURRENT_DATE
  ORDER BY delivery_date
  LIMIT 1
)
SELECT 
  calculate_ingredient_pulls(
    (SELECT id FROM order_book_suppliers LIMIT 1),
    (SELECT delivery_date FROM delivery_date)
  ) as pull_list_id;

-- View ingredient pulls
SELECT 
  delivery_date,
  prep_date,
  jsonb_pretty(ingredients) as ingredient_list,
  is_complete
FROM order_book_ingredient_pulls
WHERE delivery_date >= CURRENT_DATE
ORDER BY delivery_date, prep_date
LIMIT 3;

-- ============================================================================
-- TEST 5: Test Helper Functions
-- ============================================================================
SELECT 'TEST 5: Test Helper Functions' as test_name;

-- Test order number generation
SELECT 
  'Order Number' as function_name,
  generate_order_number((SELECT id FROM order_book_suppliers LIMIT 1)) as result;

-- Test invoice number generation
SELECT 
  'Invoice Number' as function_name,
  generate_invoice_number((SELECT id FROM order_book_suppliers LIMIT 1)) as result;

-- Test distance calculation (London to nearby location)
SELECT 
  'Distance Calculation' as function_name,
  calculate_distance_km(51.5074, -0.1278, 51.5155, -0.1419) as distance_km;

-- Test delivery radius check
SELECT 
  'Delivery Radius Check' as function_name,
  is_within_delivery_radius(
    (SELECT id FROM order_book_suppliers LIMIT 1),
    51.5155,  -- Customer lat (High Grade Cafe)
    -0.1419   -- Customer lng
  ) as is_within_radius;

-- ============================================================================
-- TEST 6: View Production Summary
-- ============================================================================
SELECT 'TEST 6: Production Summary' as test_name;

SELECT * FROM get_production_summary(
  (SELECT id FROM order_book_suppliers LIMIT 1),
  CURRENT_DATE,
  CURRENT_DATE + 7
);

-- ============================================================================
-- TEST 7: Refresh All Production Plans
-- ============================================================================
SELECT 'TEST 7: Refresh Production Plans' as test_name;

SELECT refresh_production_plans() as plans_refreshed;

-- ============================================================================
-- TEST 8: Test Order Locking (Cutoff Time)
-- ============================================================================
SELECT 'TEST 8: Lock Orders Past Cutoff' as test_name;

-- This function locks orders that are past the cutoff time
-- Note: May return 0 if no orders are past cutoff
SELECT lock_orders_past_cutoff() as orders_locked;

-- Check locked orders
SELECT 
  order_number,
  delivery_date,
  locked_at,
  status
FROM order_book_orders
WHERE locked_at IS NOT NULL
ORDER BY locked_at DESC
LIMIT 10;

-- ============================================================================
-- TEST 9: View Standing Orders Details
-- ============================================================================
SELECT 'TEST 9: Standing Orders Details' as test_name;

SELECT 
  c.business_name as customer,
  so.delivery_days,
  so.start_date,
  so.end_date,
  so.is_active,
  so.is_paused,
  jsonb_pretty(so.items) as items_json
FROM order_book_standing_orders so
JOIN order_book_customers c ON c.id = so.customer_id
ORDER BY c.business_name;

-- ============================================================================
-- TEST 10: Full System Overview
-- ============================================================================
SELECT 'TEST 10: System Overview' as test_name;

SELECT 
  '=== ORDER BOOK SYSTEM STATUS ===' as status,
  '' as details
UNION ALL
SELECT 
  'Suppliers',
  COUNT(*)::text || ' active'
FROM order_book_suppliers
WHERE is_active = true
UNION ALL
SELECT 
  'Customers',
  COUNT(*)::text || ' active, ' || 
  COUNT(*) FILTER (WHERE status = 'active')::text || ' approved'
FROM order_book_customers
UNION ALL
SELECT 
  'Products',
  COUNT(*)::text || ' active products in ' || 
  COUNT(DISTINCT category)::text || ' categories'
FROM order_book_products
WHERE is_active = true
UNION ALL
SELECT 
  'Standing Orders',
  COUNT(*)::text || ' active'
FROM order_book_standing_orders
WHERE is_active = true
UNION ALL
SELECT 
  'Generated Orders',
  COUNT(*)::text || ' orders for next 7 days'
FROM order_book_orders
WHERE delivery_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 7
UNION ALL
SELECT 
  'Production Schedules',
  COUNT(*)::text || ' schedules calculated'
FROM order_book_production_schedule
WHERE delivery_date >= CURRENT_DATE
UNION ALL
SELECT 
  'Ingredient Pulls',
  COUNT(*)::text || ' pull lists generated'
FROM order_book_ingredient_pulls
WHERE delivery_date >= CURRENT_DATE;

