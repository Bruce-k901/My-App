-- ============================================================================
-- Migration: Add is_approved and is_preferred columns to product_variants
-- Description: Adds missing approval/preference columns for product variants
-- ============================================================================

-- Add is_approved column
ALTER TABLE stockly.product_variants
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT TRUE;

-- Add is_preferred column
ALTER TABLE stockly.product_variants
ADD COLUMN IF NOT EXISTS is_preferred BOOLEAN DEFAULT FALSE;

-- Add comments
COMMENT ON COLUMN stockly.product_variants.is_approved IS 'Whether this variant is approved for ordering';
COMMENT ON COLUMN stockly.product_variants.is_preferred IS 'Whether this is the preferred variant for this stock item from this supplier';

-- Add index for filtering approved variants
CREATE INDEX IF NOT EXISTS idx_product_variants_approved
ON stockly.product_variants(is_approved)
WHERE is_approved = TRUE;

-- Add index for finding preferred variants
CREATE INDEX IF NOT EXISTS idx_product_variants_preferred
ON stockly.product_variants(stock_item_id, supplier_id, is_preferred)
WHERE is_preferred = TRUE;

-- Refresh the view to include the new columns
DROP VIEW IF EXISTS public.product_variants;
CREATE VIEW public.product_variants AS
SELECT * FROM stockly.product_variants;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_variants TO authenticated;
ALTER VIEW public.product_variants SET (security_invoker = true);

-- Notify schema reload
NOTIFY pgrst, 'reload schema';
