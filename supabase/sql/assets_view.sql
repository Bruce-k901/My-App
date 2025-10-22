-- Assets view is no longer needed
-- The assets table is now used directly instead of assets_redundant

-- Clean up the old view if it exists
DROP VIEW IF EXISTS public.assets;

-- Note: This file can be removed as the view is no longer necessary