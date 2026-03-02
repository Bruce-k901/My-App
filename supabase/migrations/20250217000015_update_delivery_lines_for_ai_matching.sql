-- ============================================================================
-- Migration: Update delivery_lines for AI Invoice Matching
-- Description: Add fields to support unmatched items and AI matching workflow
-- Note: This migration will be skipped if delivery_lines table doesn't exist yet
-- ============================================================================

DO $$
BEGIN
  -- Only proceed if delivery_lines table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'delivery_lines') THEN

    -- Make product_variant_id nullable to support unmatched items
    -- Check if column exists and is NOT NULL before altering
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'delivery_lines' 
      AND column_name = 'product_variant_id'
      AND is_nullable = 'NO'
    ) THEN
      ALTER TABLE public.delivery_lines 
      ALTER COLUMN product_variant_id DROP NOT NULL;
    END IF;

    -- Add fields for invoice extraction and matching
    ALTER TABLE public.delivery_lines
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS supplier_code TEXT,
    ADD COLUMN IF NOT EXISTS matched_status TEXT DEFAULT 'unmatched',
    ADD COLUMN IF NOT EXISTS match_confidence DECIMAL(3,2),
    ADD COLUMN IF NOT EXISTS suggested_stock_item JSONB;

    -- Add check constraint for matched_status if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_schema = 'public' 
      AND table_name = 'delivery_lines' 
      AND constraint_name = 'delivery_lines_matched_status_check'
    ) THEN
      ALTER TABLE public.delivery_lines
      ADD CONSTRAINT delivery_lines_matched_status_check
      CHECK (matched_status IN ('auto_matched', 'manual_matched', 'unmatched', 'new_item'));
    END IF;

    -- Update existing rows to have matched_status if they have product_variant_id
    UPDATE public.delivery_lines
    SET matched_status = CASE
      WHEN product_variant_id IS NOT NULL THEN 'auto_matched'
      ELSE 'unmatched'
    END
    WHERE matched_status IS NULL;

    -- Make qty_base_units nullable (may not be calculated for unmatched items)
    -- Check if column exists and is NOT NULL before altering
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'delivery_lines' 
      AND column_name = 'qty_base_units'
      AND is_nullable = 'NO'
    ) THEN
      ALTER TABLE public.delivery_lines
      ALTER COLUMN qty_base_units DROP NOT NULL;
    END IF;

    -- Add index for matching queries
    CREATE INDEX IF NOT EXISTS idx_delivery_lines_matched_status 
    ON public.delivery_lines(delivery_id, matched_status);

  ELSE
    RAISE NOTICE '⚠️ delivery_lines table does not exist yet - skipping AI matching updates';
  END IF;
END $$;

