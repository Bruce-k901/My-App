-- ============================================================================
-- Migration: Fix price_history table schema
-- Description: Drop and recreate with correct columns
-- ============================================================================

-- Drop existing view if any
DROP VIEW IF EXISTS public.price_history;

-- Drop existing table and recreate with correct schema
DROP TABLE IF EXISTS stockly.price_history;

-- Create price_history table with correct schema
CREATE TABLE stockly.price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL,

  -- Price values
  old_unit_cost NUMERIC,
  new_unit_cost NUMERIC,
  old_pack_cost NUMERIC,
  new_pack_cost NUMERIC,

  -- Change metadata
  change_percent NUMERIC(10,2),
  change_source TEXT NOT NULL CHECK (change_source IN ('invoice', 'manual', 'import')),
  change_reason TEXT CHECK (change_reason IN ('user_approved', 'user_rejected', 'auto_update')),

  -- Reference to source document
  reference_type TEXT CHECK (reference_type IN ('delivery', 'manual_edit', 'import')),
  reference_id UUID,

  -- Audit fields
  changed_by UUID,
  changed_at TIMESTAMPTZ DEFAULT NOW(),

  notes TEXT
);

-- Create indexes for common queries
CREATE INDEX idx_price_history_ingredient ON stockly.price_history(ingredient_id);
CREATE INDEX idx_price_history_company ON stockly.price_history(company_id);
CREATE INDEX idx_price_history_changed_at ON stockly.price_history(changed_at DESC);
CREATE INDEX idx_price_history_reference ON stockly.price_history(reference_type, reference_id);

-- Add foreign key to ingredients_library if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'ingredients_library'
  ) THEN
    ALTER TABLE stockly.price_history
    ADD CONSTRAINT price_history_ingredient_fk
    FOREIGN KEY (ingredient_id) REFERENCES public.ingredients_library(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE stockly.price_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies (using profiles table which has company_id)
CREATE POLICY "Users can view price history for their company"
  ON stockly.price_history FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert price history for their company"
  ON stockly.price_history FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Create view in public schema
CREATE OR REPLACE VIEW public.price_history AS
SELECT * FROM stockly.price_history;

-- Grant permissions
GRANT SELECT, INSERT ON public.price_history TO authenticated;
ALTER VIEW public.price_history SET (security_invoker = true);

-- Add comment
COMMENT ON TABLE stockly.price_history IS 'Audit trail for ingredient price changes from deliveries and manual edits';

-- Notify schema reload
NOTIFY pgrst, 'reload schema';
