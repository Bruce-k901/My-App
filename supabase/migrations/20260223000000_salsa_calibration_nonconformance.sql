-- @salsa - SALSA Compliance: Calibration certificates and non-conformance register
-- ============================================================================
-- Migration: SALSA Phase 5 — Calibration + Non-Conformances
-- Description: Creates asset_calibrations and non_conformances tables in
--              stockly schema. Creates public views + INSTEAD OF triggers.
-- Phase: SALSA Phase 5
-- ============================================================================

-- ============================================================================
-- 1. Create stockly.asset_calibrations table -- @salsa
-- ============================================================================
CREATE TABLE IF NOT EXISTS stockly.asset_calibrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  site_id UUID,
  asset_id UUID NOT NULL REFERENCES public.assets(id),
  calibration_date DATE NOT NULL,
  next_calibration_due DATE,
  calibrated_by TEXT NOT NULL,
  certificate_reference TEXT,
  certificate_url TEXT,
  method TEXT,
  readings JSONB,
  result TEXT NOT NULL DEFAULT 'pass'
    CHECK (result IN ('pass', 'fail', 'adjusted')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID
);

-- ============================================================================
-- 2. Create stockly.non_conformances table -- @salsa
-- ============================================================================
CREATE TABLE IF NOT EXISTS stockly.non_conformances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  site_id UUID,
  nc_code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'other'
    CHECK (category IN ('hygiene', 'temperature', 'cleaning', 'documentation', 'allergen', 'pest_control', 'supplier', 'traceability', 'calibration', 'labelling', 'other')),
  severity TEXT NOT NULL DEFAULT 'minor'
    CHECK (severity IN ('minor', 'major', 'critical')),
  source TEXT NOT NULL DEFAULT 'staff_observation'
    CHECK (source IN ('internal_audit', 'external_audit', 'customer_complaint', 'staff_observation', 'monitoring', 'other')),
  source_reference TEXT,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'investigating', 'corrective_action', 'verification', 'closed')),
  root_cause TEXT,
  corrective_action TEXT,
  corrective_action_due DATE,
  corrective_action_completed_at TIMESTAMPTZ,
  corrective_action_verified_by UUID,
  corrective_action_evidence TEXT,
  preventive_action TEXT,
  raised_by UUID,
  raised_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  closed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_non_conformances_company_code UNIQUE (company_id, nc_code)
);

-- ============================================================================
-- 3. Public views for new tables -- @salsa
-- ============================================================================

-- asset_calibrations view
DROP VIEW IF EXISTS public.asset_calibrations CASCADE;
CREATE VIEW public.asset_calibrations AS
SELECT * FROM stockly.asset_calibrations;
ALTER VIEW public.asset_calibrations SET (security_invoker = true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.asset_calibrations TO authenticated;

-- non_conformances view
DROP VIEW IF EXISTS public.non_conformances CASCADE;
CREATE VIEW public.non_conformances AS
SELECT * FROM stockly.non_conformances;
ALTER VIEW public.non_conformances SET (security_invoker = true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.non_conformances TO authenticated;

-- ============================================================================
-- 4. INSTEAD OF triggers for asset_calibrations -- @salsa
-- ============================================================================
CREATE OR REPLACE FUNCTION public.insert_asset_calibrations()
RETURNS TRIGGER AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO stockly.asset_calibrations (
    id, company_id, site_id, asset_id, calibration_date,
    next_calibration_due, calibrated_by, certificate_reference,
    certificate_url, method, readings, result, notes,
    created_at, created_by
  ) VALUES (
    COALESCE(NEW.id, gen_random_uuid()),
    NEW.company_id, NEW.site_id, NEW.asset_id, NEW.calibration_date,
    NEW.next_calibration_due, NEW.calibrated_by, NEW.certificate_reference,
    NEW.certificate_url, NEW.method, NEW.readings,
    COALESCE(NEW.result, 'pass'), NEW.notes,
    COALESCE(NEW.created_at, NOW()), NEW.created_by
  )
  RETURNING id INTO new_id;
  NEW.id := new_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.update_asset_calibrations()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE stockly.asset_calibrations SET
    site_id = NEW.site_id,
    asset_id = COALESCE(NEW.asset_id, OLD.asset_id),
    calibration_date = COALESCE(NEW.calibration_date, OLD.calibration_date),
    next_calibration_due = NEW.next_calibration_due,
    calibrated_by = COALESCE(NEW.calibrated_by, OLD.calibrated_by),
    certificate_reference = NEW.certificate_reference,
    certificate_url = NEW.certificate_url,
    method = NEW.method,
    readings = NEW.readings,
    result = COALESCE(NEW.result, OLD.result),
    notes = NEW.notes
  WHERE id = OLD.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.delete_asset_calibrations()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM stockly.asset_calibrations WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS asset_calibrations_insert_trigger ON public.asset_calibrations;
CREATE TRIGGER asset_calibrations_insert_trigger
  INSTEAD OF INSERT ON public.asset_calibrations
  FOR EACH ROW EXECUTE FUNCTION public.insert_asset_calibrations();

DROP TRIGGER IF EXISTS asset_calibrations_update_trigger ON public.asset_calibrations;
CREATE TRIGGER asset_calibrations_update_trigger
  INSTEAD OF UPDATE ON public.asset_calibrations
  FOR EACH ROW EXECUTE FUNCTION public.update_asset_calibrations();

DROP TRIGGER IF EXISTS asset_calibrations_delete_trigger ON public.asset_calibrations;
CREATE TRIGGER asset_calibrations_delete_trigger
  INSTEAD OF DELETE ON public.asset_calibrations
  FOR EACH ROW EXECUTE FUNCTION public.delete_asset_calibrations();

-- ============================================================================
-- 5. INSTEAD OF triggers for non_conformances -- @salsa
-- ============================================================================
CREATE OR REPLACE FUNCTION public.insert_non_conformances()
RETURNS TRIGGER AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO stockly.non_conformances (
    id, company_id, site_id, nc_code, title, description,
    category, severity, source, source_reference, status,
    root_cause, corrective_action, corrective_action_due,
    corrective_action_completed_at, corrective_action_verified_by,
    corrective_action_evidence, preventive_action,
    raised_by, raised_at, closed_at, closed_by,
    created_at, updated_at
  ) VALUES (
    COALESCE(NEW.id, gen_random_uuid()),
    NEW.company_id, NEW.site_id, NEW.nc_code, NEW.title, NEW.description,
    COALESCE(NEW.category, 'other'), COALESCE(NEW.severity, 'minor'),
    COALESCE(NEW.source, 'staff_observation'), NEW.source_reference,
    COALESCE(NEW.status, 'open'),
    NEW.root_cause, NEW.corrective_action, NEW.corrective_action_due,
    NEW.corrective_action_completed_at, NEW.corrective_action_verified_by,
    NEW.corrective_action_evidence, NEW.preventive_action,
    NEW.raised_by, COALESCE(NEW.raised_at, NOW()),
    NEW.closed_at, NEW.closed_by,
    COALESCE(NEW.created_at, NOW()), COALESCE(NEW.updated_at, NOW())
  )
  RETURNING id INTO new_id;
  NEW.id := new_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.update_non_conformances()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE stockly.non_conformances SET
    site_id = NEW.site_id,
    nc_code = COALESCE(NEW.nc_code, OLD.nc_code),
    title = COALESCE(NEW.title, OLD.title),
    description = NEW.description,
    category = COALESCE(NEW.category, OLD.category),
    severity = COALESCE(NEW.severity, OLD.severity),
    source = COALESCE(NEW.source, OLD.source),
    source_reference = NEW.source_reference,
    status = COALESCE(NEW.status, OLD.status),
    root_cause = NEW.root_cause,
    corrective_action = NEW.corrective_action,
    corrective_action_due = NEW.corrective_action_due,
    corrective_action_completed_at = NEW.corrective_action_completed_at,
    corrective_action_verified_by = NEW.corrective_action_verified_by,
    corrective_action_evidence = NEW.corrective_action_evidence,
    preventive_action = NEW.preventive_action,
    closed_at = NEW.closed_at,
    closed_by = NEW.closed_by,
    updated_at = NOW()
  WHERE id = OLD.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.delete_non_conformances()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM stockly.non_conformances WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS non_conformances_insert_trigger ON public.non_conformances;
CREATE TRIGGER non_conformances_insert_trigger
  INSTEAD OF INSERT ON public.non_conformances
  FOR EACH ROW EXECUTE FUNCTION public.insert_non_conformances();

DROP TRIGGER IF EXISTS non_conformances_update_trigger ON public.non_conformances;
CREATE TRIGGER non_conformances_update_trigger
  INSTEAD OF UPDATE ON public.non_conformances
  FOR EACH ROW EXECUTE FUNCTION public.update_non_conformances();

DROP TRIGGER IF EXISTS non_conformances_delete_trigger ON public.non_conformances;
CREATE TRIGGER non_conformances_delete_trigger
  INSTEAD OF DELETE ON public.non_conformances
  FOR EACH ROW EXECUTE FUNCTION public.delete_non_conformances();

-- ============================================================================
-- 6. RLS on new stockly tables -- @salsa
-- ============================================================================
ALTER TABLE stockly.asset_calibrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS asset_calibrations_company ON stockly.asset_calibrations;
CREATE POLICY asset_calibrations_company ON stockly.asset_calibrations FOR ALL
  USING (stockly.stockly_company_access(company_id));

ALTER TABLE stockly.non_conformances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS non_conformances_company ON stockly.non_conformances;
CREATE POLICY non_conformances_company ON stockly.non_conformances FOR ALL
  USING (stockly.stockly_company_access(company_id));

-- ============================================================================
-- 7. Indexes -- @salsa
-- ============================================================================

-- asset_calibrations indexes
CREATE INDEX IF NOT EXISTS idx_asset_calibrations_company ON stockly.asset_calibrations(company_id);
CREATE INDEX IF NOT EXISTS idx_asset_calibrations_asset ON stockly.asset_calibrations(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_calibrations_date ON stockly.asset_calibrations(calibration_date);
CREATE INDEX IF NOT EXISTS idx_asset_calibrations_next_due ON stockly.asset_calibrations(next_calibration_due) WHERE next_calibration_due IS NOT NULL;

-- non_conformances indexes
CREATE INDEX IF NOT EXISTS idx_non_conformances_company ON stockly.non_conformances(company_id);
CREATE INDEX IF NOT EXISTS idx_non_conformances_status ON stockly.non_conformances(status);
CREATE INDEX IF NOT EXISTS idx_non_conformances_category ON stockly.non_conformances(category);
CREATE INDEX IF NOT EXISTS idx_non_conformances_severity ON stockly.non_conformances(severity);
CREATE INDEX IF NOT EXISTS idx_non_conformances_site ON stockly.non_conformances(site_id) WHERE site_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_non_conformances_corrective_due ON stockly.non_conformances(corrective_action_due) WHERE corrective_action_due IS NOT NULL;

-- ============================================================================
-- 8. Auto-update updated_at trigger on non_conformances -- @salsa
-- ============================================================================
CREATE OR REPLACE FUNCTION stockly.update_non_conformances_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_non_conformances_updated_at ON stockly.non_conformances;
CREATE TRIGGER trg_non_conformances_updated_at
  BEFORE UPDATE ON stockly.non_conformances
  FOR EACH ROW
  EXECUTE FUNCTION stockly.update_non_conformances_updated_at();

-- Force schema reload -- @salsa
NOTIFY pgrst, 'reload schema';
