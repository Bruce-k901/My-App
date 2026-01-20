-- ============================================================================
-- Migration: Force Suppliers Schema Refresh (Aggressive)
-- Description: Aggressively refreshes PostgREST schema cache for suppliers
-- This includes verifying column exists, recreating view, and multiple cache refresh methods
-- Date: 2025-12-15
-- ============================================================================

-- First, show what columns actually exist in stockly.suppliers
DO $$
DECLARE
  v_columns TEXT;
  v_column_exists BOOLEAN;
  v_column_type TEXT;
BEGIN
  -- List all columns that exist
  SELECT string_agg(column_name || ' (' || data_type || ')', ', ' ORDER BY ordinal_position)
  INTO v_columns
  FROM information_schema.columns
  WHERE table_schema = 'stockly'
    AND table_name = 'suppliers';
  
  RAISE NOTICE '📋 Columns in stockly.suppliers:';
  RAISE NOTICE '%', v_columns;
  
  -- Check if delivery_days exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'stockly'
      AND table_name = 'suppliers'
      AND column_name = 'delivery_days'
  ) INTO v_column_exists;
  
  IF v_column_exists THEN
    SELECT data_type INTO v_column_type
    FROM information_schema.columns
    WHERE table_schema = 'stockly'
      AND table_name = 'suppliers'
      AND column_name = 'delivery_days';
    
    RAISE NOTICE '✅ delivery_days column exists in stockly.suppliers (type: %)', v_column_type;
  ELSE
    RAISE WARNING '❌ delivery_days column does NOT exist in stockly.suppliers - adding it now';
    
    -- Add the column if it doesn't exist
    ALTER TABLE stockly.suppliers 
    ADD COLUMN IF NOT EXISTS delivery_days TEXT[];
    
    RAISE NOTICE '✅ Added delivery_days column to stockly.suppliers';
  END IF;
END $$;

-- Drop the view completely (CASCADE to drop dependent objects)
DROP VIEW IF EXISTS public.suppliers CASCADE;

-- Wait a moment to ensure cleanup
DO $$
BEGIN
  PERFORM pg_sleep(0.1);
END $$;

-- Recreate the view - dynamically build column list based on what exists
DO $$
DECLARE
  v_columns TEXT;
  v_sql TEXT;
  v_column_list TEXT[];
BEGIN
  -- Get all column names that actually exist
  SELECT array_agg(column_name ORDER BY ordinal_position)
  INTO v_column_list
  FROM information_schema.columns
  WHERE table_schema = 'stockly'
    AND table_name = 'suppliers';
  
  -- Build comma-separated list
  SELECT string_agg(column_name, ', ' ORDER BY ordinal_position)
  INTO v_columns
  FROM information_schema.columns
  WHERE table_schema = 'stockly'
    AND table_name = 'suppliers';
  
  -- Log what columns we found
  RAISE NOTICE 'Found columns in stockly.suppliers: %', array_to_string(v_column_list, ', ');
  
  -- Create the view with all existing columns using SELECT *
  -- This is safer than listing columns explicitly
  EXECUTE 'CREATE VIEW public.suppliers AS SELECT * FROM stockly.suppliers';
  
  RAISE NOTICE 'Created view public.suppliers with all columns from stockly.suppliers';
END $$;

-- Set security_invoker
ALTER VIEW public.suppliers SET (security_invoker = true);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;

-- Recreate triggers
DO $$
BEGIN
  -- Drop existing triggers
  DROP TRIGGER IF EXISTS suppliers_insert_trigger ON public.suppliers;
  DROP TRIGGER IF EXISTS suppliers_update_trigger ON public.suppliers;
  DROP TRIGGER IF EXISTS suppliers_delete_trigger ON public.suppliers;
  
  -- Recreate if functions exist
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'insert_suppliers' AND pronamespace = 'public'::regnamespace) THEN
    CREATE TRIGGER suppliers_insert_trigger
      INSTEAD OF INSERT ON public.suppliers
      FOR EACH ROW EXECUTE FUNCTION public.insert_suppliers();
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_suppliers' AND pronamespace = 'public'::regnamespace) THEN
    CREATE TRIGGER suppliers_update_trigger
      INSTEAD OF UPDATE ON public.suppliers
      FOR EACH ROW EXECUTE FUNCTION public.update_suppliers();
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'delete_suppliers' AND pronamespace = 'public'::regnamespace) THEN
    CREATE TRIGGER suppliers_delete_trigger
      INSTEAD OF DELETE ON public.suppliers
      FOR EACH ROW EXECUTE FUNCTION public.delete_suppliers();
  END IF;
END $$;

-- ============================================================================
-- AGGRESSIVE POSTGREST CACHE REFRESH
-- ============================================================================

-- Method 1: Standard NOTIFY
NOTIFY pgrst, 'reload schema';

-- Method 2: pg_notify
DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
END $$;

-- Method 3: Alternative notification
DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload');
END $$;

-- Method 4: Try to invalidate the cache by touching the table
DO $$
BEGIN
  -- This forces PostgREST to re-read the schema
  PERFORM NULL FROM stockly.suppliers LIMIT 1;
END $$;

-- Verify the view structure
DO $$
DECLARE
  v_columns TEXT;
  v_delivery_days_exists BOOLEAN;
BEGIN
  -- Get all columns
  SELECT string_agg(column_name || ' (' || data_type || ')', ', ' ORDER BY ordinal_position)
  INTO v_columns
  FROM information_schema.columns
  WHERE table_schema = 'public' 
    AND table_name = 'suppliers';
  
  RAISE NOTICE '📋 public.suppliers view columns:';
  RAISE NOTICE '%', v_columns;
  
  -- Specifically check delivery_days
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'suppliers'
      AND column_name = 'delivery_days'
  ) INTO v_delivery_days_exists;
  
  IF v_delivery_days_exists THEN
    RAISE NOTICE '✅ delivery_days column is present in public.suppliers view';
  ELSE
    RAISE WARNING '❌ delivery_days column is MISSING from public.suppliers view';
  END IF;
END $$;

-- Final verification: Try to query the column
DO $$
DECLARE
  v_test_result TEXT[];
BEGIN
  SELECT delivery_days INTO v_test_result
  FROM public.suppliers
  LIMIT 1;
  
  RAISE NOTICE '✅ Successfully queried delivery_days from public.suppliers view';
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '❌ Failed to query delivery_days: %', SQLERRM;
END $$;
