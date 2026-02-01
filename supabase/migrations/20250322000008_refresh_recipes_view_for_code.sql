-- ============================================================================
-- Migration: 20250322000008_refresh_recipes_view_for_code.sql
-- Description: Refreshes the public.recipes view to include the new 'code' column
-- ============================================================================

-- Recreate the public.recipes view to include the new 'code' column
-- The view uses SELECT * so it should automatically include all columns from stockly.recipes
DO $$
BEGIN
  -- Check if the view exists
  IF EXISTS (
    SELECT 1 FROM information_schema.views 
    WHERE table_schema = 'public' AND table_name = 'recipes'
  ) THEN
    -- Drop and recreate the view to include the new column
    DROP VIEW IF EXISTS public.recipes CASCADE;
    CREATE VIEW public.recipes AS
    SELECT * FROM stockly.recipes;
    
    RAISE NOTICE 'Refreshed public.recipes view to include code column';
  ELSE
    RAISE NOTICE 'public.recipes view does not exist, skipping';
  END IF;
END $$;

