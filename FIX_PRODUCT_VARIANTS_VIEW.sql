-- ============================================================================
-- Fix product_variants view access
-- This ensures the view has proper permissions and security_invoker
-- ============================================================================

BEGIN;

-- Drop existing view/table if it exists
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

-- Recreate the view with proper security
CREATE VIEW public.product_variants AS
SELECT * FROM stockly.product_variants;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_variants TO authenticated;

-- Set security_invoker = true (like stock_items view)
ALTER VIEW public.product_variants SET (security_invoker = true);

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
END $$;

COMMIT;

-- ============================================================================
-- Verify the view
-- ============================================================================
SELECT 
  'View created successfully' as status,
  EXISTS (
    SELECT 1 FROM information_schema.views 
    WHERE table_schema = 'public' 
    AND table_name = 'product_variants'
  ) as view_exists;
