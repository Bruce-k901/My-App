-- @salsa - SALSA Compliance: Production batch records and CCP tracking
-- ============================================================================
-- Migration: SALSA Phase 3 — Production Batch Records
-- Description: Creates production_batches, production_batch_inputs,
--              production_batch_outputs, and production_ccp_records tables
--              in stockly schema. Adds FK from stock_batches.production_batch_id.
--              Creates public views + INSTEAD OF triggers.
-- Phase: SALSA Phase 3
-- ============================================================================

-- ============================================================================
-- 1. Create stockly.production_batches table -- @salsa
-- ============================================================================
CREATE TABLE IF NOT EXISTS stockly.production_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  site_id UUID,
  batch_code TEXT NOT NULL,
  recipe_id UUID REFERENCES stockly.recipes(id) ON DELETE SET NULL,
  process_template_id UUID, -- references planly process template if used (no FK to avoid cross-schema dep)
  production_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
  planned_quantity DECIMAL(10,3),
  actual_quantity DECIMAL(10,3),
  unit TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  operator_id UUID,
  notes TEXT,
  allergens TEXT[],
  may_contain_allergens TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  CONSTRAINT uq_production_batches_company_code UNIQUE (company_id, batch_code)
);

-- ============================================================================
-- 2. Create stockly.production_batch_inputs table -- @salsa
-- ============================================================================
CREATE TABLE IF NOT EXISTS stockly.production_batch_inputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  production_batch_id UUID NOT NULL REFERENCES stockly.production_batches(id) ON DELETE CASCADE,
  stock_batch_id UUID NOT NULL REFERENCES stockly.stock_batches(id),
  stock_item_id UUID NOT NULL REFERENCES stockly.stock_items(id),
  planned_quantity DECIMAL(10,3),
  actual_quantity DECIMAL(10,3),
  unit TEXT,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  added_by UUID
);

-- ============================================================================
-- 3. Create stockly.production_batch_outputs table -- @salsa
-- ============================================================================
CREATE TABLE IF NOT EXISTS stockly.production_batch_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  production_batch_id UUID NOT NULL REFERENCES stockly.production_batches(id) ON DELETE CASCADE,
  stock_item_id UUID NOT NULL REFERENCES stockly.stock_items(id),
  batch_code TEXT NOT NULL,
  quantity DECIMAL(10,3),
  unit TEXT,
  use_by_date DATE,
  best_before_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 4. Create stockly.production_ccp_records table -- @salsa
-- ============================================================================
CREATE TABLE IF NOT EXISTS stockly.production_ccp_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  production_batch_id UUID NOT NULL REFERENCES stockly.production_batches(id) ON DELETE CASCADE,
  ccp_type TEXT NOT NULL
    CHECK (ccp_type IN ('cooking_temp', 'cooling_temp', 'cooling_time', 'metal_detection', 'ph_level', 'other')),
  target_value TEXT,
  actual_value TEXT,
  unit TEXT,
  is_within_spec BOOLEAN,
  corrective_action TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recorded_by UUID
);

-- ============================================================================
-- 5. Add FK constraint on stock_batches.production_batch_id -- @salsa
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_stock_batches_production_batch'
      AND table_schema = 'stockly'
      AND table_name = 'stock_batches'
  ) THEN
    ALTER TABLE stockly.stock_batches
      ADD CONSTRAINT fk_stock_batches_production_batch
      FOREIGN KEY (production_batch_id) REFERENCES stockly.production_batches(id) ON DELETE SET NULL;
    RAISE NOTICE 'Added FK constraint fk_stock_batches_production_batch';
  END IF;
END $$;

-- ============================================================================
-- 6. Public views for new tables -- @salsa
-- ============================================================================

-- production_batches view
DROP VIEW IF EXISTS public.production_batches CASCADE;
CREATE VIEW public.production_batches AS
SELECT * FROM stockly.production_batches;
ALTER VIEW public.production_batches SET (security_invoker = true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_batches TO authenticated;

-- production_batch_inputs view
DROP VIEW IF EXISTS public.production_batch_inputs CASCADE;
CREATE VIEW public.production_batch_inputs AS
SELECT * FROM stockly.production_batch_inputs;
ALTER VIEW public.production_batch_inputs SET (security_invoker = true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_batch_inputs TO authenticated;

-- production_batch_outputs view
DROP VIEW IF EXISTS public.production_batch_outputs CASCADE;
CREATE VIEW public.production_batch_outputs AS
SELECT * FROM stockly.production_batch_outputs;
ALTER VIEW public.production_batch_outputs SET (security_invoker = true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_batch_outputs TO authenticated;

-- production_ccp_records view
DROP VIEW IF EXISTS public.production_ccp_records CASCADE;
CREATE VIEW public.production_ccp_records AS
SELECT * FROM stockly.production_ccp_records;
ALTER VIEW public.production_ccp_records SET (security_invoker = true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_ccp_records TO authenticated;

-- ============================================================================
-- 7. INSTEAD OF triggers for production_batches -- @salsa
-- ============================================================================
CREATE OR REPLACE FUNCTION public.insert_production_batches()
RETURNS TRIGGER AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO stockly.production_batches (
    id, company_id, site_id, batch_code, recipe_id, process_template_id,
    production_date, status, planned_quantity, actual_quantity, unit,
    started_at, completed_at, operator_id, notes,
    allergens, may_contain_allergens,
    created_at, updated_at, created_by
  ) VALUES (
    COALESCE(NEW.id, gen_random_uuid()),
    NEW.company_id, NEW.site_id, NEW.batch_code, NEW.recipe_id, NEW.process_template_id,
    NEW.production_date, COALESCE(NEW.status, 'planned'), NEW.planned_quantity, NEW.actual_quantity, NEW.unit,
    NEW.started_at, NEW.completed_at, NEW.operator_id, NEW.notes,
    NEW.allergens, NEW.may_contain_allergens,
    COALESCE(NEW.created_at, NOW()), COALESCE(NEW.updated_at, NOW()), NEW.created_by
  )
  RETURNING id INTO new_id;
  NEW.id := new_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.update_production_batches()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE stockly.production_batches SET
    site_id = NEW.site_id,
    batch_code = COALESCE(NEW.batch_code, OLD.batch_code),
    recipe_id = NEW.recipe_id,
    process_template_id = NEW.process_template_id,
    production_date = COALESCE(NEW.production_date, OLD.production_date),
    status = COALESCE(NEW.status, OLD.status),
    planned_quantity = NEW.planned_quantity,
    actual_quantity = NEW.actual_quantity,
    unit = COALESCE(NEW.unit, OLD.unit),
    started_at = NEW.started_at,
    completed_at = NEW.completed_at,
    operator_id = NEW.operator_id,
    notes = NEW.notes,
    allergens = COALESCE(NEW.allergens, OLD.allergens),
    may_contain_allergens = COALESCE(NEW.may_contain_allergens, OLD.may_contain_allergens),
    updated_at = NOW()
  WHERE id = OLD.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.delete_production_batches()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM stockly.production_batches WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS production_batches_insert_trigger ON public.production_batches;
CREATE TRIGGER production_batches_insert_trigger
  INSTEAD OF INSERT ON public.production_batches
  FOR EACH ROW EXECUTE FUNCTION public.insert_production_batches();

DROP TRIGGER IF EXISTS production_batches_update_trigger ON public.production_batches;
CREATE TRIGGER production_batches_update_trigger
  INSTEAD OF UPDATE ON public.production_batches
  FOR EACH ROW EXECUTE FUNCTION public.update_production_batches();

DROP TRIGGER IF EXISTS production_batches_delete_trigger ON public.production_batches;
CREATE TRIGGER production_batches_delete_trigger
  INSTEAD OF DELETE ON public.production_batches
  FOR EACH ROW EXECUTE FUNCTION public.delete_production_batches();

-- ============================================================================
-- 8. INSTEAD OF triggers for production_batch_inputs -- @salsa
-- ============================================================================
CREATE OR REPLACE FUNCTION public.insert_production_batch_inputs()
RETURNS TRIGGER AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO stockly.production_batch_inputs (
    id, company_id, production_batch_id, stock_batch_id, stock_item_id,
    planned_quantity, actual_quantity, unit, added_at, added_by
  ) VALUES (
    COALESCE(NEW.id, gen_random_uuid()),
    NEW.company_id, NEW.production_batch_id, NEW.stock_batch_id, NEW.stock_item_id,
    NEW.planned_quantity, NEW.actual_quantity, NEW.unit,
    COALESCE(NEW.added_at, NOW()), NEW.added_by
  )
  RETURNING id INTO new_id;
  NEW.id := new_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.delete_production_batch_inputs()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM stockly.production_batch_inputs WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS production_batch_inputs_insert_trigger ON public.production_batch_inputs;
CREATE TRIGGER production_batch_inputs_insert_trigger
  INSTEAD OF INSERT ON public.production_batch_inputs
  FOR EACH ROW EXECUTE FUNCTION public.insert_production_batch_inputs();

DROP TRIGGER IF EXISTS production_batch_inputs_delete_trigger ON public.production_batch_inputs;
CREATE TRIGGER production_batch_inputs_delete_trigger
  INSTEAD OF DELETE ON public.production_batch_inputs
  FOR EACH ROW EXECUTE FUNCTION public.delete_production_batch_inputs();

-- ============================================================================
-- 9. INSTEAD OF triggers for production_batch_outputs -- @salsa
-- ============================================================================
CREATE OR REPLACE FUNCTION public.insert_production_batch_outputs()
RETURNS TRIGGER AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO stockly.production_batch_outputs (
    id, company_id, production_batch_id, stock_item_id,
    batch_code, quantity, unit, use_by_date, best_before_date, created_at
  ) VALUES (
    COALESCE(NEW.id, gen_random_uuid()),
    NEW.company_id, NEW.production_batch_id, NEW.stock_item_id,
    NEW.batch_code, NEW.quantity, NEW.unit, NEW.use_by_date, NEW.best_before_date,
    COALESCE(NEW.created_at, NOW())
  )
  RETURNING id INTO new_id;
  NEW.id := new_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.delete_production_batch_outputs()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM stockly.production_batch_outputs WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS production_batch_outputs_insert_trigger ON public.production_batch_outputs;
CREATE TRIGGER production_batch_outputs_insert_trigger
  INSTEAD OF INSERT ON public.production_batch_outputs
  FOR EACH ROW EXECUTE FUNCTION public.insert_production_batch_outputs();

DROP TRIGGER IF EXISTS production_batch_outputs_delete_trigger ON public.production_batch_outputs;
CREATE TRIGGER production_batch_outputs_delete_trigger
  INSTEAD OF DELETE ON public.production_batch_outputs
  FOR EACH ROW EXECUTE FUNCTION public.delete_production_batch_outputs();

-- ============================================================================
-- 10. INSTEAD OF triggers for production_ccp_records -- @salsa
-- ============================================================================
CREATE OR REPLACE FUNCTION public.insert_production_ccp_records()
RETURNS TRIGGER AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO stockly.production_ccp_records (
    id, company_id, production_batch_id, ccp_type,
    target_value, actual_value, unit, is_within_spec,
    corrective_action, recorded_at, recorded_by
  ) VALUES (
    COALESCE(NEW.id, gen_random_uuid()),
    NEW.company_id, NEW.production_batch_id, NEW.ccp_type,
    NEW.target_value, NEW.actual_value, NEW.unit, NEW.is_within_spec,
    NEW.corrective_action, COALESCE(NEW.recorded_at, NOW()), NEW.recorded_by
  )
  RETURNING id INTO new_id;
  NEW.id := new_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.delete_production_ccp_records()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM stockly.production_ccp_records WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS production_ccp_records_insert_trigger ON public.production_ccp_records;
CREATE TRIGGER production_ccp_records_insert_trigger
  INSTEAD OF INSERT ON public.production_ccp_records
  FOR EACH ROW EXECUTE FUNCTION public.insert_production_ccp_records();

DROP TRIGGER IF EXISTS production_ccp_records_delete_trigger ON public.production_ccp_records;
CREATE TRIGGER production_ccp_records_delete_trigger
  INSTEAD OF DELETE ON public.production_ccp_records
  FOR EACH ROW EXECUTE FUNCTION public.delete_production_ccp_records();

-- ============================================================================
-- 11. RLS on new stockly tables -- @salsa
-- ============================================================================
ALTER TABLE stockly.production_batches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS production_batches_company ON stockly.production_batches;
CREATE POLICY production_batches_company ON stockly.production_batches FOR ALL
  USING (stockly.stockly_company_access(company_id));

ALTER TABLE stockly.production_batch_inputs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS production_batch_inputs_company ON stockly.production_batch_inputs;
CREATE POLICY production_batch_inputs_company ON stockly.production_batch_inputs FOR ALL
  USING (stockly.stockly_company_access(company_id));

ALTER TABLE stockly.production_batch_outputs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS production_batch_outputs_company ON stockly.production_batch_outputs;
CREATE POLICY production_batch_outputs_company ON stockly.production_batch_outputs FOR ALL
  USING (stockly.stockly_company_access(company_id));

ALTER TABLE stockly.production_ccp_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS production_ccp_records_company ON stockly.production_ccp_records;
CREATE POLICY production_ccp_records_company ON stockly.production_ccp_records FOR ALL
  USING (stockly.stockly_company_access(company_id));

-- ============================================================================
-- 12. Indexes -- @salsa
-- ============================================================================

-- production_batches indexes
CREATE INDEX IF NOT EXISTS idx_production_batches_company ON stockly.production_batches(company_id);
CREATE INDEX IF NOT EXISTS idx_production_batches_site ON stockly.production_batches(site_id) WHERE site_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_production_batches_date ON stockly.production_batches(production_date);
CREATE INDEX IF NOT EXISTS idx_production_batches_recipe ON stockly.production_batches(recipe_id) WHERE recipe_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_production_batches_status ON stockly.production_batches(status);

-- production_batch_inputs indexes
CREATE INDEX IF NOT EXISTS idx_production_batch_inputs_company ON stockly.production_batch_inputs(company_id);
CREATE INDEX IF NOT EXISTS idx_production_batch_inputs_batch ON stockly.production_batch_inputs(production_batch_id);
CREATE INDEX IF NOT EXISTS idx_production_batch_inputs_stock_batch ON stockly.production_batch_inputs(stock_batch_id);

-- production_batch_outputs indexes
CREATE INDEX IF NOT EXISTS idx_production_batch_outputs_company ON stockly.production_batch_outputs(company_id);
CREATE INDEX IF NOT EXISTS idx_production_batch_outputs_batch ON stockly.production_batch_outputs(production_batch_id);

-- production_ccp_records indexes
CREATE INDEX IF NOT EXISTS idx_production_ccp_records_company ON stockly.production_ccp_records(company_id);
CREATE INDEX IF NOT EXISTS idx_production_ccp_records_batch ON stockly.production_ccp_records(production_batch_id);

-- ============================================================================
-- 13. Auto-update updated_at trigger on production_batches -- @salsa
-- ============================================================================
CREATE OR REPLACE FUNCTION stockly.update_production_batches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_production_batches_updated_at ON stockly.production_batches;
CREATE TRIGGER trg_production_batches_updated_at
  BEFORE UPDATE ON stockly.production_batches
  FOR EACH ROW
  EXECUTE FUNCTION stockly.update_production_batches_updated_at();

-- Force schema reload -- @salsa
NOTIFY pgrst, 'reload schema';
