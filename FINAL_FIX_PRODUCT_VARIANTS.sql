-- ============================================================================
-- Final fix for product_variants PostgREST access
-- This ensures everything is configured correctly and forces PostgREST reload
-- ============================================================================

BEGIN;

-- Step 1: Verify stockly.product_variants exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'stockly' 
    AND table_name = 'product_variants'
  ) THEN
    RAISE EXCEPTION 'stockly.product_variants table does not exist';
  END IF;
END $$;

-- Step 2: Drop existing view/table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.views 
    WHERE table_schema = 'public' 
    AND table_name = 'product_variants'
  ) THEN
    DROP VIEW IF EXISTS public.product_variants CASCADE;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'product_variants'
  ) THEN
    DROP TABLE IF EXISTS public.product_variants CASCADE;
  END IF;
END $$;

-- Step 3: Recreate view with security_invoker in CREATE statement
CREATE VIEW public.product_variants 
WITH (security_invoker = true)
AS
SELECT * FROM stockly.product_variants;

-- Step 4: Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_variants TO authenticated;

-- Step 5: Ensure RLS is enabled on underlying table
ALTER TABLE stockly.product_variants ENABLE ROW LEVEL SECURITY;

-- Step 6: Ensure RLS policy exists on underlying table
DO $$
BEGIN
  DROP POLICY IF EXISTS product_variants_parent ON stockly.product_variants;
  
  CREATE POLICY product_variants_parent ON stockly.product_variants FOR ALL USING (
    EXISTS (
      SELECT 1 FROM stockly.stock_items si
      WHERE si.id = stockly.product_variants.stock_item_id
        AND stockly.stockly_company_access(si.company_id)
    )
  );
END $$;

-- Step 7: Force PostgREST schema reload (multiple methods)
NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
  PERFORM pg_notify('pgrst', 'reload');
  -- Also try schema_cache_reload if that channel exists
  PERFORM pg_notify('schema_cache_reload', 'reload');
END $$;

COMMIT;

-- Step 8: Verify
SELECT 
  'View created' as status,
  EXISTS (
    SELECT 1 FROM information_schema.views 
    WHERE table_schema = 'public' 
    AND table_name = 'product_variants'
  ) as view_exists;

-- IMPORTANT: After running this script:
-- 1. Wait 15-30 seconds for PostgREST to reload
-- 2. If using local Supabase, you may need to restart: supabase stop && supabase start
-- 3. Hard refresh your browser (Ctrl+Shift+R)
-- 4. Check browser console - errors should be gone
