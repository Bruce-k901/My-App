-- Track ingredient price changes for audit trail
BEGIN;

CREATE TABLE IF NOT EXISTS stockly.ingredient_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  ingredient_id UUID NOT NULL REFERENCES public.ingredients_library(id) ON DELETE CASCADE,
  
  -- Price data
  old_unit_cost NUMERIC(12,4),
  new_unit_cost NUMERIC(12,4) NOT NULL,
  old_pack_cost NUMERIC(12,4),
  new_pack_cost NUMERIC(12,4),
  old_pack_size NUMERIC(12,4),
  new_pack_size NUMERIC(12,4),
  
  -- Change context
  change_percent NUMERIC(5,2),
  source TEXT, -- 'manual', 'goods_receipt', 'supplier_update', etc
  source_ref TEXT, -- Reference to order, receipt, etc
  
  -- Who and when
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recorded_by UUID REFERENCES public.profiles(id),
  
  -- Metadata
  notes TEXT
);

-- Indexes
CREATE INDEX idx_ingredient_price_history_ingredient ON stockly.ingredient_price_history(ingredient_id, recorded_at DESC);
CREATE INDEX idx_ingredient_price_history_company ON stockly.ingredient_price_history(company_id);

-- RLS
ALTER TABLE stockly.ingredient_price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY ingredient_price_history_select_policy ON stockly.ingredient_price_history
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Grant permissions
GRANT SELECT ON stockly.ingredient_price_history TO authenticated;

-- Function to automatically log ingredient price changes
CREATE OR REPLACE FUNCTION log_ingredient_price_change()
RETURNS TRIGGER AS $$
DECLARE
  v_change_percent NUMERIC;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Check if price changed
    IF NEW.unit_cost IS DISTINCT FROM OLD.unit_cost OR
       NEW.pack_cost IS DISTINCT FROM OLD.pack_cost OR
       NEW.pack_size IS DISTINCT FROM OLD.pack_size THEN
      
      -- Calculate change percentage
      IF OLD.unit_cost IS NOT NULL AND OLD.unit_cost > 0 AND NEW.unit_cost IS NOT NULL THEN
        v_change_percent := ((NEW.unit_cost - OLD.unit_cost) / OLD.unit_cost) * 100;
      END IF;
      
      -- Log the price change
      -- Safely cast pack_size to NUMERIC (handles both TEXT and NUMERIC source types)
      INSERT INTO stockly.ingredient_price_history (
        company_id,
        ingredient_id,
        old_unit_cost,
        new_unit_cost,
        old_pack_cost,
        new_pack_cost,
        old_pack_size,
        new_pack_size,
        change_percent,
        source,
        recorded_by
      ) VALUES (
        NEW.company_id,
        NEW.id,
        OLD.unit_cost,
        NEW.unit_cost,
        OLD.pack_cost,
        NEW.pack_cost,
        -- Safely cast pack_size to NUMERIC (returns NULL if cannot be cast or is empty)
        CASE 
          WHEN OLD.pack_size IS NULL OR OLD.pack_size::TEXT = '' THEN NULL
          ELSE NULLIF(OLD.pack_size::TEXT, '')::NUMERIC
        END,
        CASE 
          WHEN NEW.pack_size IS NULL OR NEW.pack_size::TEXT = '' THEN NULL
          ELSE NULLIF(NEW.pack_size::TEXT, '')::NUMERIC
        END,
        v_change_percent,
        'manual', -- Can be enhanced to detect source
        auth.uid()
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply trigger
DROP TRIGGER IF EXISTS log_ingredient_price_changes_trigger ON public.ingredients_library;
CREATE TRIGGER log_ingredient_price_changes_trigger
  AFTER UPDATE ON public.ingredients_library
  FOR EACH ROW
  EXECUTE FUNCTION log_ingredient_price_change();

COMMIT;

