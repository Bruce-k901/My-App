-- ============================================================================
-- Migration: Ensure All Supplier Columns Exist
-- Description: Adds any missing columns to stockly.suppliers that the app expects
-- Then refreshes the view and PostgREST cache
-- Date: 2025-12-15
-- ============================================================================

-- Add any missing columns that the application expects
DO $$
BEGIN
  -- Check and add minimum_order_value if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'stockly'
      AND table_name = 'suppliers'
      AND column_name = 'minimum_order_value'
  ) THEN
    ALTER TABLE stockly.suppliers 
    ADD COLUMN minimum_order_value DECIMAL(10,2);
    RAISE NOTICE '✅ Added minimum_order_value column';
  ELSE
    RAISE NOTICE '✅ minimum_order_value column already exists';
  END IF;
  
  -- Check and add delivery_days if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'stockly'
      AND table_name = 'suppliers'
      AND column_name = 'delivery_days'
  ) THEN
    ALTER TABLE stockly.suppliers 
    ADD COLUMN delivery_days TEXT[];
    RAISE NOTICE '✅ Added delivery_days column';
  ELSE
    RAISE NOTICE '✅ delivery_days column already exists';
  END IF;
  
  -- Check and add ordering_method if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'stockly'
      AND table_name = 'suppliers'
      AND column_name = 'ordering_method'
  ) THEN
    ALTER TABLE stockly.suppliers 
    ADD COLUMN ordering_method TEXT CHECK (ordering_method IN ('app', 'whatsapp', 'email', 'phone', 'portal', 'rep'));
    RAISE NOTICE '✅ Added ordering_method column';
  ELSE
    RAISE NOTICE '✅ ordering_method column already exists';
  END IF;
  
  -- Check and add ordering_config if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'stockly'
      AND table_name = 'suppliers'
      AND column_name = 'ordering_config'
  ) THEN
    ALTER TABLE stockly.suppliers 
    ADD COLUMN ordering_config JSONB DEFAULT '{}';
    RAISE NOTICE '✅ Added ordering_config column';
  ELSE
    RAISE NOTICE '✅ ordering_config column already exists';
  END IF;
  
  -- Check and add payment_terms_days if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'stockly'
      AND table_name = 'suppliers'
      AND column_name = 'payment_terms_days'
  ) THEN
    ALTER TABLE stockly.suppliers 
    ADD COLUMN payment_terms_days INTEGER DEFAULT 30;
    RAISE NOTICE '✅ Added payment_terms_days column';
  ELSE
    RAISE NOTICE '✅ payment_terms_days column already exists';
  END IF;
  
  -- Check and add lead_time_days if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'stockly'
      AND table_name = 'suppliers'
      AND column_name = 'lead_time_days'
  ) THEN
    ALTER TABLE stockly.suppliers 
    ADD COLUMN lead_time_days INTEGER DEFAULT 1;
    RAISE NOTICE '✅ Added lead_time_days column';
  ELSE
    RAISE NOTICE '✅ lead_time_days column already exists';
  END IF;
  
  -- Check and add account_number if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'stockly'
      AND table_name = 'suppliers'
      AND column_name = 'account_number'
  ) THEN
    ALTER TABLE stockly.suppliers 
    ADD COLUMN account_number TEXT;
    RAISE NOTICE '✅ Added account_number column';
  ELSE
    RAISE NOTICE '✅ account_number column already exists';
  END IF;
END $$;

-- Show final column list
DO $$
DECLARE
  v_columns TEXT;
BEGIN
  SELECT string_agg(column_name || ' (' || data_type || ')', E'\n  ' ORDER BY ordinal_position)
  INTO v_columns
  FROM information_schema.columns
  WHERE table_schema = 'stockly'
    AND table_name = 'suppliers';
  
  RAISE NOTICE '📋 Final columns in stockly.suppliers:';
  RAISE NOTICE '  %', v_columns;
END $$;

-- Drop and recreate the view to ensure it includes all columns
DROP VIEW IF EXISTS public.suppliers CASCADE;

-- Recreate with SELECT * to include all columns
CREATE VIEW public.suppliers AS
SELECT * FROM stockly.suppliers;

-- Set security_invoker
ALTER VIEW public.suppliers SET (security_invoker = true);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;

-- Recreate triggers
DO $$
BEGIN
  DROP TRIGGER IF EXISTS suppliers_insert_trigger ON public.suppliers;
  DROP TRIGGER IF EXISTS suppliers_update_trigger ON public.suppliers;
  DROP TRIGGER IF EXISTS suppliers_delete_trigger ON public.suppliers;
  
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

-- Multiple methods to ensure cache refresh
NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
  PERFORM pg_notify('pgrst', 'reload');
  
  -- Force a query to trigger schema read
  PERFORM NULL FROM public.suppliers LIMIT 1;
END $$;

-- Verify view columns
DO $$
DECLARE
  v_view_columns TEXT;
BEGIN
  SELECT string_agg(column_name, ', ' ORDER BY ordinal_position)
  INTO v_view_columns
  FROM information_schema.columns
  WHERE table_schema = 'public' 
    AND table_name = 'suppliers';
  
  RAISE NOTICE '📋 Columns in public.suppliers view:';
  RAISE NOTICE '%', v_view_columns;
  
  -- Check for critical columns
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'suppliers'
      AND column_name = 'minimum_order_value'
  ) THEN
    RAISE NOTICE '✅ minimum_order_value is in the view';
  ELSE
    RAISE WARNING '❌ minimum_order_value is MISSING from the view';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'suppliers'
      AND column_name = 'delivery_days'
  ) THEN
    RAISE NOTICE '✅ delivery_days is in the view';
  ELSE
    RAISE WARNING '❌ delivery_days is MISSING from the view';
  END IF;
END $$;
