-- ============================================================================
-- Migration: Refresh Suppliers View Schema Cache
-- Description: Recreates the suppliers view and forces PostgREST to reload
-- its schema cache so it recognizes all columns including delivery_days
-- Date: 2025-12-15
-- ============================================================================

-- Drop and recreate the view to ensure all columns are included
DROP VIEW IF EXISTS public.suppliers CASCADE;

-- Recreate the view with all columns from stockly.suppliers
CREATE VIEW public.suppliers AS
SELECT * FROM stockly.suppliers;

-- Set security_invoker so RLS from underlying table applies
ALTER VIEW public.suppliers SET (security_invoker = true);

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;

-- Recreate the triggers if they were dropped
DO $$
BEGIN
  -- Drop existing triggers if they exist
  DROP TRIGGER IF EXISTS suppliers_insert_trigger ON public.suppliers;
  DROP TRIGGER IF EXISTS suppliers_update_trigger ON public.suppliers;
  DROP TRIGGER IF EXISTS suppliers_delete_trigger ON public.suppliers;
  
  -- Recreate triggers (functions should already exist from previous migration)
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'insert_suppliers') THEN
    CREATE TRIGGER suppliers_insert_trigger
      INSTEAD OF INSERT ON public.suppliers
      FOR EACH ROW EXECUTE FUNCTION public.insert_suppliers();
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_suppliers') THEN
    CREATE TRIGGER suppliers_update_trigger
      INSTEAD OF UPDATE ON public.suppliers
      FOR EACH ROW EXECUTE FUNCTION public.update_suppliers();
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'delete_suppliers') THEN
    CREATE TRIGGER suppliers_delete_trigger
      INSTEAD OF DELETE ON public.suppliers
      FOR EACH ROW EXECUTE FUNCTION public.delete_suppliers();
  END IF;
END $$;

-- ============================================================================
-- FORCE POSTGREST SCHEMA CACHE RELOAD
-- ============================================================================
-- This is critical - PostgREST caches the schema and won't see new columns
-- until we explicitly tell it to reload

-- Method 1: NOTIFY command
NOTIFY pgrst, 'reload schema';

-- Method 2: pg_notify function (more reliable)
DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
END $$;

-- Method 3: Alternative notification
DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload');
END $$;

-- Verify the view has all columns
DO $$
DECLARE
  v_columns TEXT;
BEGIN
  SELECT string_agg(column_name, ', ' ORDER BY ordinal_position)
  INTO v_columns
  FROM information_schema.columns
  WHERE table_schema = 'public' 
    AND table_name = 'suppliers';
  
  RAISE NOTICE 'public.suppliers view columns: %', v_columns;
  
  -- Check specifically for delivery_days
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'suppliers'
      AND column_name = 'delivery_days'
  ) THEN
    RAISE NOTICE '✅ delivery_days column is present in the view';
  ELSE
    RAISE WARNING '❌ delivery_days column is MISSING from the view';
  END IF;
END $$;
