-- ============================================================================
-- Migration: Add conversion_factor column to product_variants
-- Description: Adds conversion_factor for Phase 1/2 stock calculations
-- ============================================================================

-- Add conversion_factor column for Phase 1/2 stock calculations
ALTER TABLE stockly.product_variants
ADD COLUMN IF NOT EXISTS conversion_factor NUMERIC DEFAULT 1;

COMMENT ON COLUMN stockly.product_variants.conversion_factor IS
'How many base units per pack (e.g., 25kg = 25000g). Used for stock level calculations.';

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_product_variants_conversion
ON stockly.product_variants(conversion_factor)
WHERE conversion_factor IS NOT NULL;

-- Add current_price column if it doesn't exist (not as computed - simpler and safer)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'stockly'
      AND table_name = 'product_variants'
      AND column_name = 'current_price'
  ) THEN
    ALTER TABLE stockly.product_variants
    ADD COLUMN current_price NUMERIC;

    COMMENT ON COLUMN stockly.product_variants.current_price IS
    'Current price per pack from most recent delivery or manual update';
  END IF;
END $$;

-- Refresh the view to include the new columns
DROP VIEW IF EXISTS public.product_variants;
CREATE VIEW public.product_variants AS
SELECT * FROM stockly.product_variants;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_variants TO authenticated;
ALTER VIEW public.product_variants SET (security_invoker = true);

-- Notify schema reload
NOTIFY pgrst, 'reload schema';
