-- ============================================================================
-- Comprehensive check and fix for product_variants access
-- Run this to diagnose and fix the 400 errors
-- ============================================================================

-- Step 1: Check current state
SELECT '=== CURRENT STATE ===' as step;

SELECT 
  'stockly.product_variants (table)' as location,
  EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'stockly' 
    AND table_name = 'product_variants'
  ) as exists;

SELECT 
  'public.product_variants (table)' as location,
  EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'product_variants'
  ) as exists;

SELECT 
  'public.product_variants (view)' as location,
  EXISTS (
    SELECT 1 FROM information_schema.views 
    WHERE table_schema = 'public' 
    AND table_name = 'product_variants'
  ) as exists;

-- Step 2: Check if stockly.product_variants exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'stockly' 
    AND table_name = 'product_variants'
  ) THEN
    RAISE EXCEPTION 'stockly.product_variants table does not exist. Please run migration 01-stockly-foundation.sql first.';
  END IF;
END $$;

-- Step 3: Drop public view/table if it exists (check what it is first)
DO $$
BEGIN
  -- Drop view if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.views 
    WHERE table_schema = 'public' 
    AND table_name = 'product_variants'
  ) THEN
    DROP VIEW IF EXISTS public.product_variants CASCADE;
  END IF;
  
  -- Drop table if it exists (shouldn't, but handle it)
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'product_variants'
  ) THEN
    DROP TABLE IF EXISTS public.product_variants CASCADE;
  END IF;
END $$;

-- Step 4: Recreate view (using SELECT * since we know the table structure)
DROP VIEW IF EXISTS public.product_variants CASCADE;

CREATE VIEW public.product_variants AS
SELECT * FROM stockly.product_variants;

-- Step 5: Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_variants TO authenticated;

-- Step 6: Set security_invoker = true (critical for PostgREST)
ALTER VIEW public.product_variants SET (security_invoker = true);

-- Step 6b: Ensure RLS policy exists on the underlying table (not the view)
-- Views inherit RLS from the underlying table, so we need to ensure the policy exists on stockly.product_variants
DO $$
BEGIN
  -- Check if stockly.product_variants table exists and has RLS enabled
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'stockly' 
    AND table_name = 'product_variants'
  ) THEN
    -- Enable RLS on the underlying table if not already enabled
    ALTER TABLE stockly.product_variants ENABLE ROW LEVEL SECURITY;
    
    -- Create/update policy on the underlying table (views inherit from this)
    DROP POLICY IF EXISTS product_variants_parent ON stockly.product_variants;
    
    -- Policy checks access through stock_items
    CREATE POLICY product_variants_parent ON stockly.product_variants FOR ALL USING (
      EXISTS (
        SELECT 1 FROM stockly.stock_items si
        WHERE si.id = stockly.product_variants.stock_item_id
          AND stockly.stockly_company_access(si.company_id)
      )
    );
    
    RAISE NOTICE 'Created RLS policy on stockly.product_variants (view will inherit this)';
  END IF;
END $$;

-- Step 7: Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
END $$;

-- Step 8: Verify
SELECT '=== AFTER FIX ===' as step;

SELECT 
  'public.product_variants (view)' as location,
  EXISTS (
    SELECT 1 FROM information_schema.views 
    WHERE table_schema = 'public' 
    AND table_name = 'product_variants'
  ) as view_exists,
  EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'product_variants'
  ) as table_exists;

-- Step 9: Test query
SELECT 
  'Test query result' as test,
  COUNT(*) as variant_count
FROM public.product_variants
LIMIT 1;
