-- ============================================================================
-- Fix product_variants view access
-- Ensures the view has proper permissions, security_invoker, and RLS policies
-- ============================================================================

BEGIN;

-- Check if stockly.product_variants exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'stockly' 
    AND table_name = 'product_variants'
  ) THEN
    RAISE NOTICE 'stockly.product_variants table does not exist. Skipping view creation.';
    RETURN;
  END IF;
END $$;

-- Drop public view/table if it exists (check what it is first)
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

-- Recreate the view (using SELECT * since we know the table structure)
DROP VIEW IF EXISTS public.product_variants CASCADE;

CREATE VIEW public.product_variants AS
SELECT * FROM stockly.product_variants;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_variants TO authenticated;

-- Set security_invoker = true (critical for PostgREST to work with views)
ALTER VIEW public.product_variants SET (security_invoker = true);

-- Ensure RLS policy exists on the underlying table (views inherit RLS from underlying table)
-- The policy must be on stockly.product_variants, not on the view
DO $$
BEGIN
  -- Check if stockly.product_variants table exists
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
  ELSE
    RAISE NOTICE 'stockly.product_variants does not exist. Skipping RLS policy creation.';
  END IF;
END $$;

-- Refresh PostgREST schema cache (multiple methods to ensure it works)
NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
  -- Also try alternative notification
  PERFORM pg_notify('pgrst', 'reload');
END $$;

COMMIT;
