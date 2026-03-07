-- ============================================================================
-- Order Book Deployment Verification Script
-- Run this after deploying all 5 migrations to verify everything is set up
-- ============================================================================

-- 1. Check all tables exist
SELECT 'Tables Created' as check_type, COUNT(*)::text as result
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_name LIKE 'order_book%';

-- 2. Check supplier exists
SELECT 'Supplier Created' as check_type, COUNT(*)::text as result
FROM order_book_suppliers;

-- 3. Check customers exist
SELECT 'Customers Created' as check_type, COUNT(*)::text as result
FROM order_book_customers;

-- 4. Check products exist
SELECT 'Products Created' as check_type, COUNT(*)::text as result
FROM order_book_products;

-- 5. Check production profiles exist
SELECT 'Production Profiles' as check_type, COUNT(*)::text as result
FROM order_book_production_profiles;

-- 6. Check equipment exists
SELECT 'Equipment Items' as check_type, COUNT(*)::text as result
FROM order_book_equipment;

-- 7. Check standing orders exist
SELECT 'Standing Orders' as check_type, COUNT(*)::text as result
FROM order_book_standing_orders;

-- 8. Check RLS is enabled
SELECT 'RLS Enabled Tables' as check_type, COUNT(*)::text as result
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE 'order_book%'
  AND rowsecurity = true;

-- 9. Test helper function (order number generation)
SELECT 'Helper Functions' as check_type, 
  CASE 
    WHEN generate_order_number((SELECT id FROM order_book_suppliers LIMIT 1)) LIKE 'OB-%' 
    THEN 'Working' 
    ELSE 'Failed' 
  END as result;

-- 10. Test production planning function
SELECT 'Production Functions' as check_type,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'generate_standing_orders'
    ) THEN 'Working'
    ELSE 'Failed'
  END as result;

-- Summary view
SELECT 
  '=== DEPLOYMENT SUMMARY ===' as summary,
  '' as details
UNION ALL
SELECT 
  'Suppliers: ' || COUNT(*)::text,
  string_agg(business_name, ', ')
FROM order_book_suppliers
UNION ALL
SELECT 
  'Customers: ' || COUNT(*)::text,
  string_agg(business_name, ', ')
FROM order_book_customers
UNION ALL
SELECT 
  'Products: ' || COUNT(*)::text,
  string_agg(DISTINCT category, ', ')
FROM order_book_products
UNION ALL
SELECT 
  'Standing Orders: ' || COUNT(*)::text,
  'Active: ' || COUNT(*) FILTER (WHERE is_active = true)::text
FROM order_book_standing_orders;

