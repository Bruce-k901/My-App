-- ============================================================================
-- Migration: 20250231000005_check_stock_items_tables.sql
-- Description: Diagnostic script to check what stock_items tables/views exist
-- Run this to see which tables/views exist and their schemas
-- ============================================================================

-- Check what stock_items objects exist
DO $$
DECLARE
    v_table_type TEXT;
    v_schema_name TEXT;
    v_object_name TEXT;
BEGIN
    RAISE NOTICE '=== Checking stock_items objects ===';
    
    -- Check for stock_items in public schema
    SELECT table_type INTO v_table_type
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'stock_items';
    
    IF v_table_type IS NOT NULL THEN
        RAISE NOTICE 'public.stock_items exists as: %', v_table_type;
    ELSE
        RAISE NOTICE 'public.stock_items does NOT exist';
    END IF;
    
    -- Check for stock_items in stockly schema
    SELECT table_type INTO v_table_type
    FROM information_schema.tables
    WHERE table_schema = 'stockly' AND table_name = 'stock_items';
    
    IF v_table_type IS NOT NULL THEN
        RAISE NOTICE 'stockly.stock_items exists as: %', v_table_type;
    ELSE
        RAISE NOTICE 'stockly.stock_items does NOT exist';
    END IF;
    
    -- List all columns in stockly.stock_items
    RAISE NOTICE '=== Columns in stockly.stock_items ===';
    FOR v_object_name IN
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'stockly' AND table_name = 'stock_items'
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE '  - %', v_object_name;
    END LOOP;
    
    -- List all columns in public.stock_items (if it exists as table/view)
    RAISE NOTICE '=== Columns in public.stock_items ===';
    FOR v_object_name IN
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'stock_items'
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE '  - %', v_object_name;
    END LOOP;
END $$;

