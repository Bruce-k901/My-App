-- ============================================================================
-- Migration: Add price_dispute to rejection_reason allowed values
-- ============================================================================

-- Drop the existing constraint
ALTER TABLE stockly.delivery_lines
DROP CONSTRAINT IF EXISTS delivery_lines_rejection_reason_check;

-- Add the updated constraint with price_dispute included
ALTER TABLE stockly.delivery_lines
ADD CONSTRAINT delivery_lines_rejection_reason_check CHECK (
  rejection_reason IS NULL
  OR rejection_reason = ANY (ARRAY[
    'damaged',
    'short_delivery',
    'wrong_item',
    'quality_issue',
    'temperature_breach',
    'expired',
    'wrong_spec',
    'not_ordered',
    'price_dispute',
    'other'
  ]::text[])
);

-- Notify schema reload
NOTIFY pgrst, 'reload schema';
