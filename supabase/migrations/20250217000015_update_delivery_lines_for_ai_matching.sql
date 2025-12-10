-- ============================================================================
-- Migration: Update delivery_lines for AI Invoice Matching
-- Description: Add fields to support unmatched items and AI matching workflow
-- ============================================================================

BEGIN;

-- Make product_variant_id nullable to support unmatched items
ALTER TABLE delivery_lines 
  ALTER COLUMN product_variant_id DROP NOT NULL;

-- Add fields for invoice extraction and matching
ALTER TABLE delivery_lines
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS supplier_code TEXT,
  ADD COLUMN IF NOT EXISTS matched_status TEXT DEFAULT 'unmatched' CHECK (matched_status IN (
    'auto_matched', 'manual_matched', 'unmatched', 'new_item'
  )),
  ADD COLUMN IF NOT EXISTS match_confidence DECIMAL(3,2),
  ADD COLUMN IF NOT EXISTS suggested_stock_item JSONB;

-- Update existing rows to have matched_status if they have product_variant_id
UPDATE delivery_lines
SET matched_status = CASE
  WHEN product_variant_id IS NOT NULL THEN 'auto_matched'
  ELSE 'unmatched'
END
WHERE matched_status IS NULL;

-- Make qty_base_units nullable (may not be calculated for unmatched items)
ALTER TABLE delivery_lines
  ALTER COLUMN qty_base_units DROP NOT NULL;

-- Add index for matching queries
CREATE INDEX IF NOT EXISTS idx_delivery_lines_matched_status 
  ON delivery_lines(delivery_id, matched_status);

COMMIT;

