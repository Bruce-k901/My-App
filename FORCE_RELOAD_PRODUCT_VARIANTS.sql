-- ============================================================================
-- Force PostgREST to reload product_variants view
-- Run this if you're still seeing 400 errors after fixing the view
-- ============================================================================

BEGIN;

-- Step 1: Drop and recreate the view (forces PostgREST to see it)
DROP VIEW IF EXISTS public.product_variants CASCADE;

-- Step 2: Recreate with SELECT * (works since test query succeeded)
-- Using SELECT * is fine here since we know the underlying table structure
CREATE VIEW public.product_variants AS
SELECT * FROM stockly.product_variants;

-- Step 3: Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_variants TO authenticated;

-- Step 4: Set security_invoker = true (critical!)
ALTER VIEW public.product_variants SET (security_invoker = true);

-- Step 5: Force PostgREST schema reload (multiple methods)
NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
  -- Also try the alternative notification
  PERFORM pg_notify('pgrst', 'reload');
END $$;

COMMIT;

-- Step 6: Wait a moment and verify
SELECT 
  'View recreated' as status,
  EXISTS (
    SELECT 1 FROM information_schema.views 
    WHERE table_schema = 'public' 
    AND table_name = 'product_variants'
  ) as view_exists;

-- Step 7: Test query
SELECT 
  'Test query' as test,
  COUNT(*) as count
FROM public.product_variants;

-- IMPORTANT: After running this, you may need to:
-- 1. Wait 5-10 seconds for PostgREST to reload
-- 2. Restart your Supabase project (if using local dev)
-- 3. Or wait for the next PostgREST schema reload cycle
