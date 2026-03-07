-- @salsa - SALSA Compliance: Supplier approval, product specifications, allergen enhancement
-- ============================================================================
-- Migration: SALSA Phase 2 — Supplier Approval + Product Specs + Allergens
-- Description: Adds supplier approval fields, supplier document storage,
--              product specifications with version history, supplier approval
--              audit log, and allergen normalization.
-- Phase: SALSA Phase 2
-- ============================================================================

-- ============================================================================
-- 1. Add approval fields to stockly.suppliers (actual table) -- @salsa
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'stockly' AND table_name = 'suppliers' AND column_name = 'approval_status'
  ) THEN
    ALTER TABLE stockly.suppliers ADD COLUMN approval_status TEXT DEFAULT 'pending'
      CHECK (approval_status IN ('pending', 'approved', 'conditional', 'suspended', 'rejected'));
    RAISE NOTICE 'Added approval_status to stockly.suppliers';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'stockly' AND table_name = 'suppliers' AND column_name = 'risk_rating'
  ) THEN
    ALTER TABLE stockly.suppliers ADD COLUMN risk_rating TEXT DEFAULT 'medium'
      CHECK (risk_rating IN ('low', 'medium', 'high', 'critical'));
    RAISE NOTICE 'Added risk_rating to stockly.suppliers';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'stockly' AND table_name = 'suppliers' AND column_name = 'next_review_date'
  ) THEN
    ALTER TABLE stockly.suppliers ADD COLUMN next_review_date DATE;
    RAISE NOTICE 'Added next_review_date to stockly.suppliers';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'stockly' AND table_name = 'suppliers' AND column_name = 'approved_at'
  ) THEN
    ALTER TABLE stockly.suppliers ADD COLUMN approved_at TIMESTAMPTZ;
    RAISE NOTICE 'Added approved_at to stockly.suppliers';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'stockly' AND table_name = 'suppliers' AND column_name = 'approved_by'
  ) THEN
    ALTER TABLE stockly.suppliers ADD COLUMN approved_by UUID;
    RAISE NOTICE 'Added approved_by to stockly.suppliers';
  END IF;
END $$;

-- @salsa — Recreate public.suppliers view to include new columns
DO $$
BEGIN
  DROP VIEW IF EXISTS public.suppliers CASCADE;
  CREATE VIEW public.suppliers AS SELECT * FROM stockly.suppliers;
  ALTER VIEW public.suppliers SET (security_invoker = true);
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;

  -- Recreate INSTEAD OF triggers if the functions exist
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'insert_suppliers' AND pronamespace = 'public'::regnamespace) THEN
    CREATE TRIGGER suppliers_insert_trigger
      INSTEAD OF INSERT ON public.suppliers
      FOR EACH ROW EXECUTE FUNCTION public.insert_suppliers();
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_suppliers' AND pronamespace = 'public'::regnamespace) THEN
    CREATE TRIGGER suppliers_update_trigger
      INSTEAD OF UPDATE ON public.suppliers
      FOR EACH ROW EXECUTE FUNCTION public.update_suppliers();
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'delete_suppliers' AND pronamespace = 'public'::regnamespace) THEN
    CREATE TRIGGER suppliers_delete_trigger
      INSTEAD OF DELETE ON public.suppliers
      FOR EACH ROW EXECUTE FUNCTION public.delete_suppliers();
  END IF;

  RAISE NOTICE 'Recreated public.suppliers view with approval columns';
END $$;

-- ============================================================================
-- 2. Add allergens to stockly.stock_batches -- @salsa
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'stockly' AND table_name = 'stock_batches' AND column_name = 'allergens'
  ) THEN
    ALTER TABLE stockly.stock_batches ADD COLUMN allergens TEXT[];
    RAISE NOTICE 'Added allergens to stockly.stock_batches';
  END IF;
END $$;

-- ============================================================================
-- 3. Add may_contain_allergens to stockly.recipes -- @salsa
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'stockly' AND table_name = 'recipes' AND column_name = 'may_contain_allergens'
  ) THEN
    ALTER TABLE stockly.recipes ADD COLUMN may_contain_allergens TEXT[];
    RAISE NOTICE 'Added may_contain_allergens to stockly.recipes';
  END IF;
END $$;

-- ============================================================================
-- 4. Create stockly.supplier_documents table -- @salsa
-- ============================================================================
CREATE TABLE IF NOT EXISTS stockly.supplier_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  supplier_id UUID NOT NULL REFERENCES stockly.suppliers(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL
    CHECK (document_type IN ('certificate', 'insurance', 'spec_sheet', 'audit_report', 'contract', 'other')),
  name TEXT NOT NULL,
  description TEXT,
  file_path TEXT,
  version TEXT DEFAULT 'v1',
  expiry_date DATE,
  is_archived BOOLEAN DEFAULT FALSE,
  uploaded_by UUID,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 5. Create stockly.product_specifications table -- @salsa
-- ============================================================================
CREATE TABLE IF NOT EXISTS stockly.product_specifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  stock_item_id UUID NOT NULL REFERENCES stockly.stock_items(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES stockly.suppliers(id) ON DELETE SET NULL,
  version_number INTEGER NOT NULL DEFAULT 1,
  allergens TEXT[],
  may_contain_allergens TEXT[],
  storage_temp_min DECIMAL(5,2),
  storage_temp_max DECIMAL(5,2),
  storage_conditions TEXT
    CHECK (storage_conditions IS NULL OR storage_conditions IN ('ambient', 'chilled', 'frozen', 'dry', 'cool_dry')),
  shelf_life_days INTEGER,
  shelf_life_unit TEXT DEFAULT 'days'
    CHECK (shelf_life_unit IN ('days', 'weeks', 'months')),
  handling_instructions TEXT,
  country_of_origin TEXT,
  spec_document_id UUID REFERENCES stockly.supplier_documents(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('draft', 'active', 'superseded')),
  last_reviewed_at TIMESTAMPTZ,
  next_review_date DATE,
  reviewed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID
);

-- ============================================================================
-- 6. Create stockly.product_specification_history table -- @salsa
-- ============================================================================
CREATE TABLE IF NOT EXISTS stockly.product_specification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spec_id UUID NOT NULL,
  company_id UUID NOT NULL,
  stock_item_id UUID NOT NULL,
  version_number INTEGER NOT NULL,
  allergens TEXT[],
  may_contain_allergens TEXT[],
  storage_temp_min DECIMAL(5,2),
  storage_temp_max DECIMAL(5,2),
  storage_conditions TEXT,
  shelf_life_days INTEGER,
  shelf_life_unit TEXT,
  handling_instructions TEXT,
  country_of_origin TEXT,
  spec_document_id UUID,
  change_notes TEXT,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_by UUID
);

-- ============================================================================
-- 7. Create stockly.supplier_approval_log table -- @salsa
-- ============================================================================
CREATE TABLE IF NOT EXISTS stockly.supplier_approval_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  supplier_id UUID NOT NULL REFERENCES stockly.suppliers(id) ON DELETE CASCADE,
  action TEXT NOT NULL
    CHECK (action IN ('approved', 'conditional', 'suspended', 'rejected', 'review_scheduled', 'risk_updated', 'created')),
  old_status TEXT,
  new_status TEXT,
  old_risk_rating TEXT,
  new_risk_rating TEXT,
  notes TEXT,
  performed_by UUID,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 8. Public views for new tables -- @salsa
-- ============================================================================

-- supplier_documents view
DROP VIEW IF EXISTS public.supplier_documents CASCADE;
CREATE VIEW public.supplier_documents AS
SELECT * FROM stockly.supplier_documents;
ALTER VIEW public.supplier_documents SET (security_invoker = true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_documents TO authenticated;

-- product_specifications view
DROP VIEW IF EXISTS public.product_specifications CASCADE;
CREATE VIEW public.product_specifications AS
SELECT * FROM stockly.product_specifications;
ALTER VIEW public.product_specifications SET (security_invoker = true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_specifications TO authenticated;

-- product_specification_history view
DROP VIEW IF EXISTS public.product_specification_history CASCADE;
CREATE VIEW public.product_specification_history AS
SELECT * FROM stockly.product_specification_history;
ALTER VIEW public.product_specification_history SET (security_invoker = true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_specification_history TO authenticated;

-- supplier_approval_log view
DROP VIEW IF EXISTS public.supplier_approval_log CASCADE;
CREATE VIEW public.supplier_approval_log AS
SELECT * FROM stockly.supplier_approval_log;
ALTER VIEW public.supplier_approval_log SET (security_invoker = true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_approval_log TO authenticated;

-- ============================================================================
-- 9. INSTEAD OF triggers for supplier_documents -- @salsa
-- ============================================================================
CREATE OR REPLACE FUNCTION public.insert_supplier_documents()
RETURNS TRIGGER AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO stockly.supplier_documents (
    id, company_id, supplier_id, document_type, name, description,
    file_path, version, expiry_date, is_archived,
    uploaded_by, uploaded_at, created_at, updated_at
  ) VALUES (
    COALESCE(NEW.id, gen_random_uuid()),
    NEW.company_id, NEW.supplier_id, NEW.document_type, NEW.name, NEW.description,
    NEW.file_path, COALESCE(NEW.version, 'v1'), NEW.expiry_date, COALESCE(NEW.is_archived, FALSE),
    NEW.uploaded_by, COALESCE(NEW.uploaded_at, NOW()), COALESCE(NEW.created_at, NOW()), COALESCE(NEW.updated_at, NOW())
  )
  RETURNING id INTO new_id;
  NEW.id := new_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.update_supplier_documents()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE stockly.supplier_documents SET
    document_type = COALESCE(NEW.document_type, OLD.document_type),
    name = COALESCE(NEW.name, OLD.name),
    description = NEW.description,
    file_path = COALESCE(NEW.file_path, OLD.file_path),
    version = COALESCE(NEW.version, OLD.version),
    expiry_date = NEW.expiry_date,
    is_archived = COALESCE(NEW.is_archived, OLD.is_archived),
    updated_at = NOW()
  WHERE id = OLD.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.delete_supplier_documents()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM stockly.supplier_documents WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS supplier_documents_insert_trigger ON public.supplier_documents;
CREATE TRIGGER supplier_documents_insert_trigger
  INSTEAD OF INSERT ON public.supplier_documents
  FOR EACH ROW EXECUTE FUNCTION public.insert_supplier_documents();

DROP TRIGGER IF EXISTS supplier_documents_update_trigger ON public.supplier_documents;
CREATE TRIGGER supplier_documents_update_trigger
  INSTEAD OF UPDATE ON public.supplier_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_supplier_documents();

DROP TRIGGER IF EXISTS supplier_documents_delete_trigger ON public.supplier_documents;
CREATE TRIGGER supplier_documents_delete_trigger
  INSTEAD OF DELETE ON public.supplier_documents
  FOR EACH ROW EXECUTE FUNCTION public.delete_supplier_documents();

-- ============================================================================
-- 10. INSTEAD OF triggers for product_specifications -- @salsa
-- ============================================================================
CREATE OR REPLACE FUNCTION public.insert_product_specifications()
RETURNS TRIGGER AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO stockly.product_specifications (
    id, company_id, stock_item_id, supplier_id, version_number,
    allergens, may_contain_allergens,
    storage_temp_min, storage_temp_max, storage_conditions,
    shelf_life_days, shelf_life_unit, handling_instructions,
    country_of_origin, spec_document_id, status,
    last_reviewed_at, next_review_date, reviewed_by,
    created_at, updated_at, created_by
  ) VALUES (
    COALESCE(NEW.id, gen_random_uuid()),
    NEW.company_id, NEW.stock_item_id, NEW.supplier_id, COALESCE(NEW.version_number, 1),
    NEW.allergens, NEW.may_contain_allergens,
    NEW.storage_temp_min, NEW.storage_temp_max, NEW.storage_conditions,
    NEW.shelf_life_days, COALESCE(NEW.shelf_life_unit, 'days'), NEW.handling_instructions,
    NEW.country_of_origin, NEW.spec_document_id, COALESCE(NEW.status, 'active'),
    NEW.last_reviewed_at, NEW.next_review_date, NEW.reviewed_by,
    COALESCE(NEW.created_at, NOW()), COALESCE(NEW.updated_at, NOW()), NEW.created_by
  )
  RETURNING id INTO new_id;
  NEW.id := new_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.update_product_specifications()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE stockly.product_specifications SET
    supplier_id = NEW.supplier_id,
    version_number = COALESCE(NEW.version_number, OLD.version_number),
    allergens = NEW.allergens,
    may_contain_allergens = NEW.may_contain_allergens,
    storage_temp_min = NEW.storage_temp_min,
    storage_temp_max = NEW.storage_temp_max,
    storage_conditions = NEW.storage_conditions,
    shelf_life_days = NEW.shelf_life_days,
    shelf_life_unit = COALESCE(NEW.shelf_life_unit, OLD.shelf_life_unit),
    handling_instructions = NEW.handling_instructions,
    country_of_origin = NEW.country_of_origin,
    spec_document_id = NEW.spec_document_id,
    status = COALESCE(NEW.status, OLD.status),
    last_reviewed_at = NEW.last_reviewed_at,
    next_review_date = NEW.next_review_date,
    reviewed_by = NEW.reviewed_by,
    updated_at = NOW()
  WHERE id = OLD.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.delete_product_specifications()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM stockly.product_specifications WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS product_specifications_insert_trigger ON public.product_specifications;
CREATE TRIGGER product_specifications_insert_trigger
  INSTEAD OF INSERT ON public.product_specifications
  FOR EACH ROW EXECUTE FUNCTION public.insert_product_specifications();

DROP TRIGGER IF EXISTS product_specifications_update_trigger ON public.product_specifications;
CREATE TRIGGER product_specifications_update_trigger
  INSTEAD OF UPDATE ON public.product_specifications
  FOR EACH ROW EXECUTE FUNCTION public.update_product_specifications();

DROP TRIGGER IF EXISTS product_specifications_delete_trigger ON public.product_specifications;
CREATE TRIGGER product_specifications_delete_trigger
  INSTEAD OF DELETE ON public.product_specifications
  FOR EACH ROW EXECUTE FUNCTION public.delete_product_specifications();

-- ============================================================================
-- 11. INSTEAD OF triggers for product_specification_history -- @salsa
-- ============================================================================
CREATE OR REPLACE FUNCTION public.insert_product_specification_history()
RETURNS TRIGGER AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO stockly.product_specification_history (
    id, spec_id, company_id, stock_item_id, version_number,
    allergens, may_contain_allergens,
    storage_temp_min, storage_temp_max, storage_conditions,
    shelf_life_days, shelf_life_unit, handling_instructions,
    country_of_origin, spec_document_id,
    change_notes, archived_at, archived_by
  ) VALUES (
    COALESCE(NEW.id, gen_random_uuid()),
    NEW.spec_id, NEW.company_id, NEW.stock_item_id, NEW.version_number,
    NEW.allergens, NEW.may_contain_allergens,
    NEW.storage_temp_min, NEW.storage_temp_max, NEW.storage_conditions,
    NEW.shelf_life_days, NEW.shelf_life_unit, NEW.handling_instructions,
    NEW.country_of_origin, NEW.spec_document_id,
    NEW.change_notes, COALESCE(NEW.archived_at, NOW()), NEW.archived_by
  )
  RETURNING id INTO new_id;
  NEW.id := new_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.delete_product_specification_history()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM stockly.product_specification_history WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS product_specification_history_insert_trigger ON public.product_specification_history;
CREATE TRIGGER product_specification_history_insert_trigger
  INSTEAD OF INSERT ON public.product_specification_history
  FOR EACH ROW EXECUTE FUNCTION public.insert_product_specification_history();

DROP TRIGGER IF EXISTS product_specification_history_delete_trigger ON public.product_specification_history;
CREATE TRIGGER product_specification_history_delete_trigger
  INSTEAD OF DELETE ON public.product_specification_history
  FOR EACH ROW EXECUTE FUNCTION public.delete_product_specification_history();

-- ============================================================================
-- 12. INSTEAD OF triggers for supplier_approval_log -- @salsa
-- ============================================================================
CREATE OR REPLACE FUNCTION public.insert_supplier_approval_log()
RETURNS TRIGGER AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO stockly.supplier_approval_log (
    id, company_id, supplier_id, action,
    old_status, new_status, old_risk_rating, new_risk_rating,
    notes, performed_by, performed_at
  ) VALUES (
    COALESCE(NEW.id, gen_random_uuid()),
    NEW.company_id, NEW.supplier_id, NEW.action,
    NEW.old_status, NEW.new_status, NEW.old_risk_rating, NEW.new_risk_rating,
    NEW.notes, NEW.performed_by, COALESCE(NEW.performed_at, NOW())
  )
  RETURNING id INTO new_id;
  NEW.id := new_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.delete_supplier_approval_log()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM stockly.supplier_approval_log WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS supplier_approval_log_insert_trigger ON public.supplier_approval_log;
CREATE TRIGGER supplier_approval_log_insert_trigger
  INSTEAD OF INSERT ON public.supplier_approval_log
  FOR EACH ROW EXECUTE FUNCTION public.insert_supplier_approval_log();

DROP TRIGGER IF EXISTS supplier_approval_log_delete_trigger ON public.supplier_approval_log;
CREATE TRIGGER supplier_approval_log_delete_trigger
  INSTEAD OF DELETE ON public.supplier_approval_log
  FOR EACH ROW EXECUTE FUNCTION public.delete_supplier_approval_log();

-- ============================================================================
-- 13. Recreate stock_batches view to include allergens -- @salsa
-- ============================================================================
DROP VIEW IF EXISTS public.stock_batches CASCADE;
CREATE VIEW public.stock_batches AS
SELECT * FROM stockly.stock_batches;
ALTER VIEW public.stock_batches SET (security_invoker = true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_batches TO authenticated;

-- Recreate INSERT trigger with allergens column -- @salsa
CREATE OR REPLACE FUNCTION public.insert_stock_batches()
RETURNS TRIGGER AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO stockly.stock_batches (
    id, company_id, site_id, stock_item_id, delivery_line_id, production_batch_id,
    batch_code, supplier_batch_code, quantity_received, quantity_remaining, unit,
    use_by_date, best_before_date, temperature_on_receipt, condition_notes,
    allergens, status, created_at, updated_at, created_by
  ) VALUES (
    COALESCE(NEW.id, gen_random_uuid()),
    NEW.company_id, NEW.site_id, NEW.stock_item_id, NEW.delivery_line_id, NEW.production_batch_id,
    NEW.batch_code, NEW.supplier_batch_code, NEW.quantity_received, NEW.quantity_remaining, NEW.unit,
    NEW.use_by_date, NEW.best_before_date, NEW.temperature_on_receipt, NEW.condition_notes,
    NEW.allergens, COALESCE(NEW.status, 'active'), COALESCE(NEW.created_at, NOW()), COALESCE(NEW.updated_at, NOW()), NEW.created_by
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
    allergens = COALESCE(NEW.allergens, OLD.allergens),
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

-- Recreate batch_movements triggers (dropped by CASCADE)
DROP VIEW IF EXISTS public.batch_movements CASCADE;
CREATE VIEW public.batch_movements AS
SELECT * FROM stockly.batch_movements;
ALTER VIEW public.batch_movements SET (security_invoker = true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.batch_movements TO authenticated;

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
-- 14. RLS on new stockly tables -- @salsa
-- ============================================================================
ALTER TABLE stockly.supplier_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS supplier_documents_company ON stockly.supplier_documents;
CREATE POLICY supplier_documents_company ON stockly.supplier_documents FOR ALL
  USING (stockly.stockly_company_access(company_id));

ALTER TABLE stockly.product_specifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS product_specifications_company ON stockly.product_specifications;
CREATE POLICY product_specifications_company ON stockly.product_specifications FOR ALL
  USING (stockly.stockly_company_access(company_id));

ALTER TABLE stockly.product_specification_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS product_specification_history_company ON stockly.product_specification_history;
CREATE POLICY product_specification_history_company ON stockly.product_specification_history FOR ALL
  USING (stockly.stockly_company_access(company_id));

ALTER TABLE stockly.supplier_approval_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS supplier_approval_log_company ON stockly.supplier_approval_log;
CREATE POLICY supplier_approval_log_company ON stockly.supplier_approval_log FOR ALL
  USING (stockly.stockly_company_access(company_id));

-- ============================================================================
-- 15. Indexes -- @salsa
-- ============================================================================

-- supplier_documents indexes
CREATE INDEX IF NOT EXISTS idx_supplier_documents_company ON stockly.supplier_documents(company_id);
CREATE INDEX IF NOT EXISTS idx_supplier_documents_supplier ON stockly.supplier_documents(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_documents_type ON stockly.supplier_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_supplier_documents_expiry ON stockly.supplier_documents(expiry_date) WHERE expiry_date IS NOT NULL;

-- product_specifications indexes
CREATE INDEX IF NOT EXISTS idx_product_specifications_company ON stockly.product_specifications(company_id);
CREATE INDEX IF NOT EXISTS idx_product_specifications_stock_item ON stockly.product_specifications(stock_item_id);
CREATE INDEX IF NOT EXISTS idx_product_specifications_supplier ON stockly.product_specifications(supplier_id) WHERE supplier_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_product_specifications_status ON stockly.product_specifications(status);
CREATE INDEX IF NOT EXISTS idx_product_specifications_next_review ON stockly.product_specifications(next_review_date) WHERE next_review_date IS NOT NULL;

-- product_specification_history indexes
CREATE INDEX IF NOT EXISTS idx_product_spec_history_spec ON stockly.product_specification_history(spec_id);
CREATE INDEX IF NOT EXISTS idx_product_spec_history_company ON stockly.product_specification_history(company_id);

-- supplier_approval_log indexes
CREATE INDEX IF NOT EXISTS idx_supplier_approval_log_company ON stockly.supplier_approval_log(company_id);
CREATE INDEX IF NOT EXISTS idx_supplier_approval_log_supplier ON stockly.supplier_approval_log(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_approval_log_performed_at ON stockly.supplier_approval_log(performed_at);

-- supplier approval columns on public.suppliers
CREATE INDEX IF NOT EXISTS idx_suppliers_approval_status ON stockly.suppliers(approval_status);
CREATE INDEX IF NOT EXISTS idx_suppliers_next_review ON stockly.suppliers(next_review_date) WHERE next_review_date IS NOT NULL;

-- ============================================================================
-- 16. Auto-update updated_at triggers on new tables -- @salsa
-- ============================================================================
CREATE OR REPLACE FUNCTION stockly.update_supplier_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_supplier_documents_updated_at ON stockly.supplier_documents;
CREATE TRIGGER trg_supplier_documents_updated_at
  BEFORE UPDATE ON stockly.supplier_documents
  FOR EACH ROW
  EXECUTE FUNCTION stockly.update_supplier_documents_updated_at();

CREATE OR REPLACE FUNCTION stockly.update_product_specifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_product_specifications_updated_at ON stockly.product_specifications;
CREATE TRIGGER trg_product_specifications_updated_at
  BEFORE UPDATE ON stockly.product_specifications
  FOR EACH ROW
  EXECUTE FUNCTION stockly.update_product_specifications_updated_at();

-- ============================================================================
-- 17. Allergen normalization — convert full names to short keys -- @salsa
-- ============================================================================
DO $$
BEGIN
  -- Normalize ingredients_library allergens from full names to short keys
  UPDATE public.ingredients_library SET allergens = (
    SELECT ARRAY_AGG(DISTINCT
      CASE LOWER(TRIM(a))
        WHEN 'cereals containing gluten' THEN 'gluten'
        WHEN 'crustaceans' THEN 'crustaceans'
        WHEN 'eggs' THEN 'eggs'
        WHEN 'fish' THEN 'fish'
        WHEN 'peanuts' THEN 'peanuts'
        WHEN 'soybeans' THEN 'soybeans'
        WHEN 'soya' THEN 'soybeans'
        WHEN 'milk' THEN 'milk'
        WHEN 'nuts' THEN 'nuts'
        WHEN 'nuts (tree nuts)' THEN 'nuts'
        WHEN 'tree nuts' THEN 'nuts'
        WHEN 'celery' THEN 'celery'
        WHEN 'mustard' THEN 'mustard'
        WHEN 'sesame' THEN 'sesame'
        WHEN 'sulphites/sulphur dioxide' THEN 'sulphites'
        WHEN 'sulphites' THEN 'sulphites'
        WHEN 'lupin' THEN 'lupin'
        WHEN 'molluscs' THEN 'molluscs'
        ELSE LOWER(TRIM(a))
      END
    )
    FROM UNNEST(allergens) AS a
  )
  WHERE allergens IS NOT NULL AND array_length(allergens, 1) > 0;

  RAISE NOTICE 'Normalized ingredients_library allergens to short keys';

  -- Also normalize recipe allergens (propagated from ingredients)
  UPDATE stockly.recipes SET allergens = (
    SELECT ARRAY_AGG(DISTINCT
      CASE LOWER(TRIM(a))
        WHEN 'cereals containing gluten' THEN 'gluten'
        WHEN 'crustaceans' THEN 'crustaceans'
        WHEN 'eggs' THEN 'eggs'
        WHEN 'fish' THEN 'fish'
        WHEN 'peanuts' THEN 'peanuts'
        WHEN 'soybeans' THEN 'soybeans'
        WHEN 'soya' THEN 'soybeans'
        WHEN 'milk' THEN 'milk'
        WHEN 'nuts' THEN 'nuts'
        WHEN 'nuts (tree nuts)' THEN 'nuts'
        WHEN 'tree nuts' THEN 'nuts'
        WHEN 'celery' THEN 'celery'
        WHEN 'mustard' THEN 'mustard'
        WHEN 'sesame' THEN 'sesame'
        WHEN 'sulphites/sulphur dioxide' THEN 'sulphites'
        WHEN 'sulphites' THEN 'sulphites'
        WHEN 'lupin' THEN 'lupin'
        WHEN 'molluscs' THEN 'molluscs'
        ELSE LOWER(TRIM(a))
      END
    )
    FROM UNNEST(allergens) AS a
  )
  WHERE allergens IS NOT NULL AND array_length(allergens, 1) > 0;

  RAISE NOTICE 'Normalized recipe allergens to short keys';
END $$;

-- ============================================================================
-- 18. Storage bucket for supplier documents -- @salsa
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'supplier-docs',
  'supplier-docs',
  false,
  10485760, -- 10MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS for supplier-docs bucket -- @salsa
CREATE POLICY supplier_docs_select ON storage.objects FOR SELECT
  USING (bucket_id = 'supplier-docs' AND auth.role() = 'authenticated');

CREATE POLICY supplier_docs_insert ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'supplier-docs' AND auth.role() = 'authenticated');

CREATE POLICY supplier_docs_update ON storage.objects FOR UPDATE
  USING (bucket_id = 'supplier-docs' AND auth.role() = 'authenticated');

CREATE POLICY supplier_docs_delete ON storage.objects FOR DELETE
  USING (bucket_id = 'supplier-docs' AND auth.role() = 'authenticated');

-- Force schema reload -- @salsa
NOTIFY pgrst, 'reload schema';
