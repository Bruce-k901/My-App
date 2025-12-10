-- ============================================================================
-- Migration: Add VAT Fields to Deliveries
-- Description: Add line-level VAT handling for UK hospitality VAT rules
-- ============================================================================

BEGIN;

-- Add VAT fields to delivery_lines
ALTER TABLE delivery_lines
  ADD COLUMN IF NOT EXISTS vat_rate NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vat_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS line_total_inc_vat NUMERIC(12,2);

-- Add default VAT rate to stock_items (helps with manual entry)
ALTER TABLE stock_items
  ADD COLUMN IF NOT EXISTS default_vat_rate NUMERIC(5,2) DEFAULT 0;

-- Add comments
COMMENT ON COLUMN delivery_lines.vat_rate IS 'VAT percentage: 0 for most food, 20 for alcohol/drinks/chemicals';
COMMENT ON COLUMN delivery_lines.vat_amount IS 'Calculated VAT amount for this line';
COMMENT ON COLUMN delivery_lines.line_total_inc_vat IS 'Line total including VAT';
COMMENT ON COLUMN stock_items.default_vat_rate IS 'Default VAT rate for this item type: 0 for most food, 20 for alcohol/soft drinks/chemicals';

-- Update existing delivery_lines to calculate VAT amounts if missing
UPDATE delivery_lines
SET 
  vat_rate = COALESCE(vat_rate, 0),
  vat_amount = COALESCE(vat_amount, (line_total * COALESCE(vat_rate, 0) / 100)),
  line_total_inc_vat = COALESCE(line_total_inc_vat, line_total + (line_total * COALESCE(vat_rate, 0) / 100))
WHERE vat_amount IS NULL OR line_total_inc_vat IS NULL;

COMMIT;

