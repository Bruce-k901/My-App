-- ============================================================================
-- Quick Fix: Add base_unit_id if missing, then create view and triggers
-- Run this if base_unit_id column doesn't exist
-- ============================================================================

-- First, check what columns exist
SELECT column_name 
FROM information_schema.columns 
WHERE table_schema = 'stockly' 
  AND table_name = 'stock_items' 
ORDER BY ordinal_position;

-- If base_unit_id doesn't exist, add it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'stockly' 
    AND table_name = 'stock_items' 
    AND column_name = 'base_unit_id'
  ) THEN
    -- Add base_unit_id column
    ALTER TABLE stockly.stock_items
    ADD COLUMN base_unit_id UUID REFERENCES public.uom(id);
    
    -- Set a default value for existing rows (pick first UOM)
    UPDATE stockly.stock_items
    SET base_unit_id = (SELECT id FROM public.uom LIMIT 1)
    WHERE base_unit_id IS NULL;
    
    -- Make it NOT NULL after setting defaults
    ALTER TABLE stockly.stock_items
    ALTER COLUMN base_unit_id SET NOT NULL;
    
    RAISE NOTICE 'Added base_unit_id column to stockly.stock_items';
  ELSE
    RAISE NOTICE 'base_unit_id column already exists';
  END IF;
END $$;

-- Now recreate the view
DROP VIEW IF EXISTS public.stock_items CASCADE;

CREATE VIEW public.stock_items AS
SELECT * FROM stockly.stock_items;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_items TO authenticated;
ALTER VIEW public.stock_items SET (security_invoker = true);

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
