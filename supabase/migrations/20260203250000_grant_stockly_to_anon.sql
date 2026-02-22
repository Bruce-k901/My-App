-- ============================================================================
-- Migration: Grant SELECT on stockly tables to all roles
-- Description: Allow RLS policy checks to work for both authenticated and anon
-- ============================================================================

-- Grant SELECT to both roles for RLS policy evaluation
GRANT SELECT ON stockly.deliveries TO anon;
GRANT SELECT ON stockly.delivery_lines TO anon;
GRANT SELECT ON stockly.product_variants TO anon;
GRANT SELECT ON stockly.stock_items TO anon;
GRANT SELECT ON stockly.suppliers TO anon;

-- Also ensure authenticated has the grants (redundant but safe)
GRANT SELECT ON stockly.deliveries TO authenticated;
GRANT SELECT ON stockly.delivery_lines TO authenticated;
GRANT SELECT ON stockly.product_variants TO authenticated;
GRANT SELECT ON stockly.stock_items TO authenticated;
GRANT SELECT ON stockly.suppliers TO authenticated;

-- Force schema reload
NOTIFY pgrst, 'reload schema';
