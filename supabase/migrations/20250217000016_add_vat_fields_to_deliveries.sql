-- ============================================================================
-- Migration: Add VAT Fields to Deliveries
-- Description: Add line-level VAT handling for UK hospitality VAT rules
-- Note: This migration will be skipped if required tables don't exist yet
-- ============================================================================

DO $$
BEGIN
  -- Add VAT fields to delivery_lines (if table exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'delivery_lines') THEN
    ALTER TABLE public.delivery_lines
    ADD COLUMN IF NOT EXISTS vat_rate NUMERIC(5,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS vat_amount NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS line_total_inc_vat NUMERIC(12,2);

    -- Add comments
    COMMENT ON COLUMN public.delivery_lines.vat_rate IS 'VAT percentage: 0 for most food, 20 for alcohol/drinks/chemicals';
    COMMENT ON COLUMN public.delivery_lines.vat_amount IS 'Calculated VAT amount for this line';
    COMMENT ON COLUMN public.delivery_lines.line_total_inc_vat IS 'Line total including VAT';

    -- Update existing delivery_lines to calculate VAT amounts if missing
    UPDATE public.delivery_lines
    SET 
      vat_rate = COALESCE(vat_rate, 0),
      vat_amount = COALESCE(vat_amount, (line_total * COALESCE(vat_rate, 0) / 100)),
      line_total_inc_vat = COALESCE(line_total_inc_vat, line_total + (line_total * COALESCE(vat_rate, 0) / 100))
    WHERE vat_amount IS NULL OR line_total_inc_vat IS NULL;
  ELSE
    RAISE NOTICE '⚠️ delivery_lines table does not exist yet - skipping VAT fields addition';
  END IF;

  -- Add default VAT rate to stock_items (helps with manual entry)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stock_items') THEN
    ALTER TABLE public.stock_items
    ADD COLUMN IF NOT EXISTS default_vat_rate NUMERIC(5,2) DEFAULT 0;

    -- Add comment
    COMMENT ON COLUMN public.stock_items.default_vat_rate IS 'Default VAT rate for this item type: 0 for most food, 20 for alcohol/soft drinks/chemicals';
  ELSE
    RAISE NOTICE '⚠️ stock_items table does not exist yet - skipping default_vat_rate addition';
  END IF;
END $$;

