-- ============================================================================
-- Remove NOT NULL constraint from base_unit_id (if it exists)
-- This allows stock_items to be created without base_unit_id
-- ============================================================================

BEGIN;

-- Check if base_unit_id exists and has a NOT NULL constraint
DO $$
BEGIN
  -- Check if the column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'stockly' 
    AND table_name = 'stock_items' 
    AND column_name = 'base_unit_id'
  ) THEN
    -- Drop NOT NULL constraint if it exists
    ALTER TABLE stockly.stock_items
    ALTER COLUMN base_unit_id DROP NOT NULL;
    
    RAISE NOTICE 'Removed NOT NULL constraint from stockly.stock_items.base_unit_id';
  ELSE
    RAISE NOTICE 'base_unit_id column does not exist in stockly.stock_items';
  END IF;
END $$;

-- Recreate the view to reflect changes
DROP VIEW IF EXISTS public.stock_items CASCADE;

CREATE VIEW public.stock_items AS
SELECT * FROM stockly.stock_items;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_items TO authenticated;
ALTER VIEW public.stock_items SET (security_invoker = true);

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
END $$;

COMMIT;
