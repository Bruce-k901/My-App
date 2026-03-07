-- ============================================================================
-- Verification Script: Stockly Migrations
-- Description: Run this after applying Stockly migrations to verify everything
--              was created correctly
-- ============================================================================

-- Check all Stockly tables exist
SELECT 
    'Tables Check' as check_type,
    COUNT(*) as found_count,
    CASE 
        WHEN COUNT(*) = 25 THEN '✅ All tables created'
        ELSE '❌ Missing tables - Expected 25'
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'company_modules', 'storage_areas', 'suppliers', 
    'stock_categories', 'stock_items', 'product_variants',
    'price_history', 'stock_levels', 'stock_movements',
    'deliveries', 'delivery_lines', 'purchase_orders',
    'purchase_order_lines', 'waste_logs', 'waste_log_lines',
    'stock_counts', 'stock_count_sections', 'stock_count_lines',
    'transfers', 'transfer_lines', 'recipes', 'recipe_ingredients',
    'pos_sales', 'pos_sale_lines', 'ai_processing_queue', 'uom'
);

-- Check RLS is enabled on key tables
SELECT 
    'RLS Check' as check_type,
    tablename,
    CASE 
        WHEN rowsecurity THEN '✅ Enabled'
        ELSE '❌ Disabled'
    END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
    'company_modules', 'storage_areas', 'suppliers', 
    'stock_categories', 'stock_items', 'product_variants',
    'stock_levels', 'deliveries', 'purchase_orders'
)
ORDER BY tablename;

-- Check UOM seed data
SELECT 
    'UOM Seed Data' as check_type,
    COUNT(*) as uom_count,
    CASE 
        WHEN COUNT(*) >= 30 THEN '✅ Seed data loaded'
        ELSE '❌ Missing seed data'
    END as status
FROM uom;

-- Check sites table extensions
SELECT 
    'Sites Extension' as check_type,
    column_name,
    data_type,
    CASE 
        WHEN column_name IN ('location_type', 'pos_provider', 'pos_config', 'pos_location_id', 'internal_markup_percent') 
        THEN '✅ Column exists'
        ELSE 'Column'
    END as status
FROM information_schema.columns 
WHERE table_name = 'sites' 
AND column_name IN ('location_type', 'pos_provider', 'pos_config', 'pos_location_id', 'internal_markup_percent')
ORDER BY column_name;

-- Check company_modules seed
SELECT 
    'Company Modules Seed' as check_type,
    COUNT(*) as companies_with_checkly,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Companies seeded'
        ELSE '❌ No companies found'
    END as status
FROM company_modules 
WHERE module = 'checkly';

-- Check functions exist
SELECT 
    'Functions Check' as check_type,
    routine_name,
    routine_type,
    CASE 
        WHEN routine_name IN ('stockly_company_access', 'generate_whatsapp_order', 'url_encode', 'check_recipe_circular_ref')
        THEN '✅ Function exists'
        ELSE 'Function'
    END as status
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('stockly_company_access', 'generate_whatsapp_order', 'url_encode', 'check_recipe_circular_ref')
ORDER BY routine_name;

-- Check triggers
SELECT 
    'Triggers Check' as check_type,
    trigger_name,
    event_object_table,
    CASE 
        WHEN trigger_name = 'trg_recipe_circular_check' THEN '✅ Trigger exists'
        ELSE 'Trigger'
    END as status
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name = 'trg_recipe_circular_check';

-- Summary
SELECT 
    '=== SUMMARY ===' as summary,
    'Run all checks above to verify Stockly migrations' as instructions;










