-- @salsa - SALSA Compliance: Batch tracking core tables and delivery line enhancements
-- ============================================================================
-- Migration: SALSA Batch Tracking Core
-- Description: Creates stock_batches and batch_movements tables in stockly schema
--              for SALSA compliance batch tracking. Adds batch-related columns to
--              delivery_lines and waste_log_lines. Creates public views + triggers.
-- Phase: SALSA Phase 1
-- ============================================================================

-- ============================================================================
-- 1. Create stockly.stock_batches table -- @salsa
-- ============================================================================
CREATE TABLE IF NOT EXISTS stockly.stock_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  site_id UUID,
  stock_item_id UUID NOT NULL REFERENCES stockly.stock_items(id) ON DELETE CASCADE,
  delivery_line_id UUID, -- references stockly.delivery_lines(id), no FK to avoid circular dep
  production_batch_id UUID, -- FK added in Phase 3 when production_batches table exists
  batch_code TEXT NOT NULL,
  supplier_batch_code TEXT,
  quantity_received DECIMAL(10,3) NOT NULL,
  quantity_remaining DECIMAL(10,3) NOT NULL,
  unit TEXT NOT NULL,
  use_by_date DATE,        -- @salsa safety-critical, mandatory discard when passed
  best_before_date DATE,   -- @salsa quality, softer warning
  temperature_on_receipt DECIMAL(5,2),
  condition_notes TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'depleted', 'expired', 'quarantined', 'recalled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  CONSTRAINT uq_stock_batches_company_code UNIQUE (company_id, batch_code)
);

-- ============================================================================
-- 2. Create stockly.batch_movements table -- @salsa
-- ============================================================================
CREATE TABLE IF NOT EXISTS stockly.batch_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  site_id UUID,
  batch_id UUID NOT NULL REFERENCES stockly.stock_batches(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL
    CHECK (movement_type IN ('received', 'consumed_production', 'consumed_waste', 'adjustment', 'transfer', 'recalled')),
  quantity DECIMAL(10,3) NOT NULL, -- positive for in, negative for out
  reference_type TEXT, -- delivery_line, production_order, waste_log, adjustment, recall
  reference_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID
);

-- ============================================================================
-- 3. Add batch-related columns to stockly.delivery_lines -- @salsa
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'stockly' AND table_name = 'delivery_lines' AND column_name = 'temperature_reading'
  ) THEN
    ALTER TABLE stockly.delivery_lines ADD COLUMN temperature_reading DECIMAL(5,2);
    RAISE NOTICE 'Added temperature_reading to stockly.delivery_lines';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'stockly' AND table_name = 'delivery_lines' AND column_name = 'supplier_batch_code'
  ) THEN
    ALTER TABLE stockly.delivery_lines ADD COLUMN supplier_batch_code TEXT;
    RAISE NOTICE 'Added supplier_batch_code to stockly.delivery_lines';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'stockly' AND table_name = 'delivery_lines' AND column_name = 'condition_assessment'
  ) THEN
    ALTER TABLE stockly.delivery_lines ADD COLUMN condition_assessment JSONB;
    RAISE NOTICE 'Added condition_assessment to stockly.delivery_lines';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'stockly' AND table_name = 'delivery_lines' AND column_name = 'batch_id'
  ) THEN
    ALTER TABLE stockly.delivery_lines ADD COLUMN batch_id UUID;
    RAISE NOTICE 'Added batch_id to stockly.delivery_lines';
  END IF;
END $$;

-- ============================================================================
-- 4. Add batch_id to stockly.waste_log_lines -- @salsa
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'stockly' AND table_name = 'waste_log_lines' AND column_name = 'batch_id'
  ) THEN
    ALTER TABLE stockly.waste_log_lines ADD COLUMN batch_id UUID;
    RAISE NOTICE 'Added batch_id to stockly.waste_log_lines';
  END IF;
END $$;

-- ============================================================================
-- 5. Public views for new tables -- @salsa
-- ============================================================================

-- stock_batches view
DROP VIEW IF EXISTS public.stock_batches CASCADE;
CREATE VIEW public.stock_batches AS
SELECT * FROM stockly.stock_batches;
ALTER VIEW public.stock_batches SET (security_invoker = true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_batches TO authenticated;

-- batch_movements view
DROP VIEW IF EXISTS public.batch_movements CASCADE;
CREATE VIEW public.batch_movements AS
SELECT * FROM stockly.batch_movements;
ALTER VIEW public.batch_movements SET (security_invoker = true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.batch_movements TO authenticated;

-- ============================================================================
-- 6. INSTEAD OF triggers for stock_batches view -- @salsa
-- ============================================================================
CREATE OR REPLACE FUNCTION public.insert_stock_batches()
RETURNS TRIGGER AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO stockly.stock_batches (
    id, company_id, site_id, stock_item_id, delivery_line_id, production_batch_id,
    batch_code, supplier_batch_code, quantity_received, quantity_remaining, unit,
    use_by_date, best_before_date, temperature_on_receipt, condition_notes,
    status, created_at, updated_at, created_by
  ) VALUES (
    COALESCE(NEW.id, gen_random_uuid()),
    NEW.company_id, NEW.site_id, NEW.stock_item_id, NEW.delivery_line_id, NEW.production_batch_id,
    NEW.batch_code, NEW.supplier_batch_code, NEW.quantity_received, NEW.quantity_remaining, NEW.unit,
    NEW.use_by_date, NEW.best_before_date, NEW.temperature_on_receipt, NEW.condition_notes,
    COALESCE(NEW.status, 'active'), COALESCE(NEW.created_at, NOW()), COALESCE(NEW.updated_at, NOW()), NEW.created_by
  )
  RETURNING id INTO new_id;
  NEW.id := new_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.update_stock_batches()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE stockly.stock_batches SET
    site_id = NEW.site_id,
    delivery_line_id = COALESCE(NEW.delivery_line_id, OLD.delivery_line_id),
    production_batch_id = COALESCE(NEW.production_batch_id, OLD.production_batch_id),
    supplier_batch_code = COALESCE(NEW.supplier_batch_code, OLD.supplier_batch_code),
    quantity_remaining = NEW.quantity_remaining,
    use_by_date = NEW.use_by_date,
    best_before_date = NEW.best_before_date,
    temperature_on_receipt = COALESCE(NEW.temperature_on_receipt, OLD.temperature_on_receipt),
    condition_notes = COALESCE(NEW.condition_notes, OLD.condition_notes),
    status = COALESCE(NEW.status, OLD.status),
    updated_at = NOW()
  WHERE id = OLD.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.delete_stock_batches()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM stockly.stock_batches WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS stock_batches_insert_trigger ON public.stock_batches;
CREATE TRIGGER stock_batches_insert_trigger
  INSTEAD OF INSERT ON public.stock_batches
  FOR EACH ROW EXECUTE FUNCTION public.insert_stock_batches();

DROP TRIGGER IF EXISTS stock_batches_update_trigger ON public.stock_batches;
CREATE TRIGGER stock_batches_update_trigger
  INSTEAD OF UPDATE ON public.stock_batches
  FOR EACH ROW EXECUTE FUNCTION public.update_stock_batches();

DROP TRIGGER IF EXISTS stock_batches_delete_trigger ON public.stock_batches;
CREATE TRIGGER stock_batches_delete_trigger
  INSTEAD OF DELETE ON public.stock_batches
  FOR EACH ROW EXECUTE FUNCTION public.delete_stock_batches();

-- ============================================================================
-- 7. INSTEAD OF triggers for batch_movements view -- @salsa
-- ============================================================================
CREATE OR REPLACE FUNCTION public.insert_batch_movements()
RETURNS TRIGGER AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO stockly.batch_movements (
    id, company_id, site_id, batch_id, movement_type,
    quantity, reference_type, reference_id, notes, created_at, created_by
  ) VALUES (
    COALESCE(NEW.id, gen_random_uuid()),
    NEW.company_id, NEW.site_id, NEW.batch_id, NEW.movement_type,
    NEW.quantity, NEW.reference_type, NEW.reference_id, NEW.notes,
    COALESCE(NEW.created_at, NOW()), NEW.created_by
  )
  RETURNING id INTO new_id;
  NEW.id := new_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.delete_batch_movements()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM stockly.batch_movements WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS batch_movements_insert_trigger ON public.batch_movements;
CREATE TRIGGER batch_movements_insert_trigger
  INSTEAD OF INSERT ON public.batch_movements
  FOR EACH ROW EXECUTE FUNCTION public.insert_batch_movements();

DROP TRIGGER IF EXISTS batch_movements_delete_trigger ON public.batch_movements;
CREATE TRIGGER batch_movements_delete_trigger
  INSTEAD OF DELETE ON public.batch_movements
  FOR EACH ROW EXECUTE FUNCTION public.delete_batch_movements();

-- ============================================================================
-- 8. Recreate delivery_lines view to include new columns -- @salsa
-- ============================================================================
DROP VIEW IF EXISTS public.delivery_lines CASCADE;
CREATE VIEW public.delivery_lines AS
SELECT * FROM stockly.delivery_lines;
ALTER VIEW public.delivery_lines SET (security_invoker = true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_lines TO authenticated;

-- Recreate INSERT trigger with batch columns -- @salsa
CREATE OR REPLACE FUNCTION public.insert_delivery_lines()
RETURNS TRIGGER AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO stockly.delivery_lines (
    id, delivery_id, product_variant_id, stock_item_id, line_number,
    description, supplier_code, quantity_ordered, quantity_received, quantity_rejected,
    unit, unit_price, line_total, vat_rate, vat_amount, line_total_inc_vat, qty_base_units,
    match_status, match_confidence, rejection_reason, rejection_notes, rejection_photo_url,
    suggested_stock_item, created_at,
    temperature_reading, supplier_batch_code, condition_assessment, batch_id
  ) VALUES (
    COALESCE(NEW.id, gen_random_uuid()),
    NEW.delivery_id,
    NEW.product_variant_id,
    NEW.stock_item_id,
    NEW.line_number,
    NEW.description,
    NEW.supplier_code,
    NEW.quantity_ordered,
    NEW.quantity_received,
    NEW.quantity_rejected,
    NEW.unit,
    NEW.unit_price,
    NEW.line_total,
    NEW.vat_rate,
    NEW.vat_amount,
    NEW.line_total_inc_vat,
    NEW.qty_base_units,
    COALESCE(NEW.match_status, 'unmatched'),
    NEW.match_confidence,
    NEW.rejection_reason,
    NEW.rejection_notes,
    NEW.rejection_photo_url,
    NEW.suggested_stock_item,
    NOW(),
    NEW.temperature_reading,
    NEW.supplier_batch_code,
    NEW.condition_assessment,
    NEW.batch_id
  )
  RETURNING id INTO new_id;

  NEW.id := new_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS delivery_lines_insert_trigger ON public.delivery_lines;
CREATE TRIGGER delivery_lines_insert_trigger
  INSTEAD OF INSERT ON public.delivery_lines
  FOR EACH ROW EXECUTE FUNCTION public.insert_delivery_lines();

-- Recreate UPDATE trigger with batch columns -- @salsa
CREATE OR REPLACE FUNCTION public.update_delivery_lines()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE stockly.delivery_lines
  SET
    product_variant_id = COALESCE(NEW.product_variant_id, OLD.product_variant_id),
    stock_item_id = COALESCE(NEW.stock_item_id, OLD.stock_item_id),
    description = COALESCE(NEW.description, OLD.description),
    supplier_code = COALESCE(NEW.supplier_code, OLD.supplier_code),
    quantity_ordered = COALESCE(NEW.quantity_ordered, OLD.quantity_ordered),
    quantity_received = NEW.quantity_received,
    quantity_rejected = NEW.quantity_rejected,
    unit_price = COALESCE(NEW.unit_price, OLD.unit_price),
    line_total = COALESCE(NEW.line_total, OLD.line_total),
    vat_rate = COALESCE(NEW.vat_rate, OLD.vat_rate),
    vat_amount = COALESCE(NEW.vat_amount, OLD.vat_amount),
    line_total_inc_vat = COALESCE(NEW.line_total_inc_vat, OLD.line_total_inc_vat),
    match_status = COALESCE(NEW.match_status, OLD.match_status),
    match_confidence = COALESCE(NEW.match_confidence, OLD.match_confidence),
    rejection_reason = NEW.rejection_reason,
    rejection_notes = NEW.rejection_notes,
    rejection_photo_url = NEW.rejection_photo_url,
    temperature_reading = NEW.temperature_reading,
    supplier_batch_code = NEW.supplier_batch_code,
    condition_assessment = NEW.condition_assessment,
    batch_id = NEW.batch_id,
    updated_at = NOW()
  WHERE id = OLD.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS delivery_lines_update_trigger ON public.delivery_lines;
CREATE TRIGGER delivery_lines_update_trigger
  INSTEAD OF UPDATE ON public.delivery_lines
  FOR EACH ROW EXECUTE FUNCTION public.update_delivery_lines();

-- Recreate DELETE trigger -- @salsa
CREATE OR REPLACE FUNCTION public.delete_delivery_lines()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM stockly.delivery_lines WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS delivery_lines_delete_trigger ON public.delivery_lines;
CREATE TRIGGER delivery_lines_delete_trigger
  INSTEAD OF DELETE ON public.delivery_lines
  FOR EACH ROW EXECUTE FUNCTION public.delete_delivery_lines();

-- ============================================================================
-- 9. Recreate waste_log_lines view to include batch_id -- @salsa
-- ============================================================================
DROP VIEW IF EXISTS public.waste_log_lines CASCADE;
CREATE VIEW public.waste_log_lines AS
SELECT * FROM stockly.waste_log_lines;
ALTER VIEW public.waste_log_lines SET (security_invoker = true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.waste_log_lines TO authenticated;

-- ============================================================================
-- 10. Indexes on stockly tables -- @salsa
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_stock_batches_company ON stockly.stock_batches(company_id);
CREATE INDEX IF NOT EXISTS idx_stock_batches_site ON stockly.stock_batches(site_id) WHERE site_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stock_batches_stock_item ON stockly.stock_batches(stock_item_id);
CREATE INDEX IF NOT EXISTS idx_stock_batches_status ON stockly.stock_batches(status);
CREATE INDEX IF NOT EXISTS idx_stock_batches_use_by ON stockly.stock_batches(use_by_date) WHERE use_by_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stock_batches_best_before ON stockly.stock_batches(best_before_date) WHERE best_before_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stock_batches_delivery_line ON stockly.stock_batches(delivery_line_id) WHERE delivery_line_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stock_batches_created_at ON stockly.stock_batches(created_at);

CREATE INDEX IF NOT EXISTS idx_batch_movements_company ON stockly.batch_movements(company_id);
CREATE INDEX IF NOT EXISTS idx_batch_movements_batch ON stockly.batch_movements(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_movements_type ON stockly.batch_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_batch_movements_reference ON stockly.batch_movements(reference_type, reference_id) WHERE reference_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_delivery_lines_batch ON stockly.delivery_lines(batch_id) WHERE batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_waste_log_lines_batch ON stockly.waste_log_lines(batch_id) WHERE batch_id IS NOT NULL;

-- ============================================================================
-- 11. RLS on stockly tables -- @salsa
-- ============================================================================
ALTER TABLE stockly.stock_batches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS stock_batches_company ON stockly.stock_batches;
CREATE POLICY stock_batches_company ON stockly.stock_batches FOR ALL
  USING (stockly.stockly_company_access(company_id));

ALTER TABLE stockly.batch_movements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS batch_movements_company ON stockly.batch_movements;
CREATE POLICY batch_movements_company ON stockly.batch_movements FOR ALL
  USING (stockly.stockly_company_access(company_id));

-- ============================================================================
-- 12. Auto-update updated_at trigger -- @salsa
-- ============================================================================
CREATE OR REPLACE FUNCTION stockly.update_stock_batches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_stock_batches_updated_at ON stockly.stock_batches;
CREATE TRIGGER trg_stock_batches_updated_at
  BEFORE UPDATE ON stockly.stock_batches
  FOR EACH ROW
  EXECUTE FUNCTION stockly.update_stock_batches_updated_at();

-- ============================================================================
-- 13. Auto-deplete batch when quantity_remaining hits 0 -- @salsa
-- ============================================================================
CREATE OR REPLACE FUNCTION stockly.auto_deplete_stock_batch()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quantity_remaining <= 0 AND OLD.quantity_remaining > 0 THEN
    NEW.status = 'depleted';
    NEW.quantity_remaining = 0; -- prevent negative
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_deplete_batch ON stockly.stock_batches;
CREATE TRIGGER trg_auto_deplete_batch
  BEFORE UPDATE ON stockly.stock_batches
  FOR EACH ROW
  WHEN (NEW.quantity_remaining IS DISTINCT FROM OLD.quantity_remaining)
  EXECUTE FUNCTION stockly.auto_deplete_stock_batch();

-- Force schema reload -- @salsa
NOTIFY pgrst, 'reload schema';
