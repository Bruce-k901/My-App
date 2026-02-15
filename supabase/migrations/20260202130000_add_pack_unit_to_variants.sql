-- ============================================================================
-- Migration: Add pack_unit_id column to product_variants
-- Description: Adds the missing pack_unit_id column that the RPC function expects
-- ============================================================================

-- Add pack_unit_id column to product_variants
ALTER TABLE stockly.product_variants
ADD COLUMN IF NOT EXISTS pack_unit_id UUID;

-- Add comment
COMMENT ON COLUMN stockly.product_variants.pack_unit_id IS 'Unit of measure for pack_size - references uom table';

-- Optional: Create index if you'll filter by unit
CREATE INDEX IF NOT EXISTS idx_product_variants_pack_unit
ON stockly.product_variants(pack_unit_id)
WHERE pack_unit_id IS NOT NULL;

-- Refresh the view to include the new column
DROP VIEW IF EXISTS public.product_variants;
CREATE VIEW public.product_variants AS
SELECT * FROM stockly.product_variants;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_variants TO authenticated;
ALTER VIEW public.product_variants SET (security_invoker = true);

-- Notify schema reload
NOTIFY pgrst, 'reload schema';
