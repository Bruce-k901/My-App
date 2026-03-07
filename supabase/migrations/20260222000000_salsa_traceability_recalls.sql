-- @salsa - SALSA Compliance: Traceability reports and recall/withdrawal workflow
-- ============================================================================
-- Migration: SALSA Phase 4 — Traceability + Recalls
-- Description: Creates recalls, recall_affected_batches, recall_notifications,
--              and batch_dispatch_records tables in stockly schema.
--              Creates public views + INSTEAD OF triggers.
-- Phase: SALSA Phase 4
-- ============================================================================

-- ============================================================================
-- 1. Create stockly.recalls table -- @salsa
-- ============================================================================
CREATE TABLE IF NOT EXISTS stockly.recalls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  site_id UUID,
  recall_code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  recall_type TEXT NOT NULL DEFAULT 'recall'
    CHECK (recall_type IN ('recall', 'withdrawal')),
  severity TEXT NOT NULL DEFAULT 'class_2'
    CHECK (severity IN ('class_1', 'class_2', 'class_3')),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'investigating', 'notified', 'resolved', 'closed')),
  reason TEXT,
  root_cause TEXT,
  corrective_actions TEXT,
  initiated_at TIMESTAMPTZ DEFAULT NOW(),
  initiated_by UUID,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  fsa_notified BOOLEAN DEFAULT FALSE,
  fsa_notified_at TIMESTAMPTZ,
  fsa_reference TEXT,
  salsa_notified BOOLEAN DEFAULT FALSE,
  salsa_notified_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  CONSTRAINT uq_recalls_company_code UNIQUE (company_id, recall_code)
);

-- ============================================================================
-- 2. Create stockly.recall_affected_batches table -- @salsa
-- ============================================================================
CREATE TABLE IF NOT EXISTS stockly.recall_affected_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  recall_id UUID NOT NULL REFERENCES stockly.recalls(id) ON DELETE CASCADE,
  stock_batch_id UUID NOT NULL REFERENCES stockly.stock_batches(id),
  batch_type TEXT NOT NULL DEFAULT 'finished_product'
    CHECK (batch_type IN ('raw_material', 'finished_product')),
  quantity_affected DECIMAL(10,3),
  quantity_recovered DECIMAL(10,3),
  action_taken TEXT NOT NULL DEFAULT 'pending'
    CHECK (action_taken IN ('quarantined', 'destroyed', 'returned', 'released', 'pending')),
  notes TEXT,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 3. Create stockly.recall_notifications table -- @salsa
-- ============================================================================
CREATE TABLE IF NOT EXISTS stockly.recall_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  recall_id UUID NOT NULL REFERENCES stockly.recalls(id) ON DELETE CASCADE,
  customer_id UUID,
  customer_name TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  notification_method TEXT
    CHECK (notification_method IN ('phone', 'email', 'in_person', 'letter', 'other')),
  notified_at TIMESTAMPTZ,
  notified_by UUID,
  response_received BOOLEAN DEFAULT FALSE,
  response_notes TEXT,
  stock_returned BOOLEAN DEFAULT FALSE,
  stock_return_quantity DECIMAL(10,3),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 4. Create stockly.batch_dispatch_records table -- @salsa
-- ============================================================================
CREATE TABLE IF NOT EXISTS stockly.batch_dispatch_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  site_id UUID,
  stock_batch_id UUID NOT NULL REFERENCES stockly.stock_batches(id),
  order_id UUID,
  customer_id UUID,
  customer_name TEXT NOT NULL,
  dispatch_date DATE NOT NULL,
  quantity DECIMAL(10,3) NOT NULL,
  unit TEXT,
  delivery_note_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID
);

-- ============================================================================
-- 5. Public views for new tables -- @salsa
-- ============================================================================

-- recalls view
DROP VIEW IF EXISTS public.recalls CASCADE;
CREATE VIEW public.recalls AS
SELECT * FROM stockly.recalls;
ALTER VIEW public.recalls SET (security_invoker = true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recalls TO authenticated;

-- recall_affected_batches view
DROP VIEW IF EXISTS public.recall_affected_batches CASCADE;
CREATE VIEW public.recall_affected_batches AS
SELECT * FROM stockly.recall_affected_batches;
ALTER VIEW public.recall_affected_batches SET (security_invoker = true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recall_affected_batches TO authenticated;

-- recall_notifications view
DROP VIEW IF EXISTS public.recall_notifications CASCADE;
CREATE VIEW public.recall_notifications AS
SELECT * FROM stockly.recall_notifications;
ALTER VIEW public.recall_notifications SET (security_invoker = true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recall_notifications TO authenticated;

-- batch_dispatch_records view
DROP VIEW IF EXISTS public.batch_dispatch_records CASCADE;
CREATE VIEW public.batch_dispatch_records AS
SELECT * FROM stockly.batch_dispatch_records;
ALTER VIEW public.batch_dispatch_records SET (security_invoker = true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.batch_dispatch_records TO authenticated;

-- ============================================================================
-- 6. INSTEAD OF triggers for recalls -- @salsa
-- ============================================================================
CREATE OR REPLACE FUNCTION public.insert_recalls()
RETURNS TRIGGER AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO stockly.recalls (
    id, company_id, site_id, recall_code, title, description,
    recall_type, severity, status, reason, root_cause, corrective_actions,
    initiated_at, initiated_by, resolved_at, closed_at,
    fsa_notified, fsa_notified_at, fsa_reference,
    salsa_notified, salsa_notified_at, notes,
    created_at, updated_at, created_by
  ) VALUES (
    COALESCE(NEW.id, gen_random_uuid()),
    NEW.company_id, NEW.site_id, NEW.recall_code, NEW.title, NEW.description,
    COALESCE(NEW.recall_type, 'recall'), COALESCE(NEW.severity, 'class_2'),
    COALESCE(NEW.status, 'draft'), NEW.reason, NEW.root_cause, NEW.corrective_actions,
    COALESCE(NEW.initiated_at, NOW()), NEW.initiated_by, NEW.resolved_at, NEW.closed_at,
    COALESCE(NEW.fsa_notified, FALSE), NEW.fsa_notified_at, NEW.fsa_reference,
    COALESCE(NEW.salsa_notified, FALSE), NEW.salsa_notified_at, NEW.notes,
    COALESCE(NEW.created_at, NOW()), COALESCE(NEW.updated_at, NOW()), NEW.created_by
  )
  RETURNING id INTO new_id;
  NEW.id := new_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.update_recalls()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE stockly.recalls SET
    site_id = NEW.site_id,
    recall_code = COALESCE(NEW.recall_code, OLD.recall_code),
    title = COALESCE(NEW.title, OLD.title),
    description = NEW.description,
    recall_type = COALESCE(NEW.recall_type, OLD.recall_type),
    severity = COALESCE(NEW.severity, OLD.severity),
    status = COALESCE(NEW.status, OLD.status),
    reason = NEW.reason,
    root_cause = NEW.root_cause,
    corrective_actions = NEW.corrective_actions,
    initiated_at = COALESCE(NEW.initiated_at, OLD.initiated_at),
    initiated_by = NEW.initiated_by,
    resolved_at = NEW.resolved_at,
    closed_at = NEW.closed_at,
    fsa_notified = COALESCE(NEW.fsa_notified, OLD.fsa_notified),
    fsa_notified_at = NEW.fsa_notified_at,
    fsa_reference = NEW.fsa_reference,
    salsa_notified = COALESCE(NEW.salsa_notified, OLD.salsa_notified),
    salsa_notified_at = NEW.salsa_notified_at,
    notes = NEW.notes,
    updated_at = NOW()
  WHERE id = OLD.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.delete_recalls()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM stockly.recalls WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS recalls_insert_trigger ON public.recalls;
CREATE TRIGGER recalls_insert_trigger
  INSTEAD OF INSERT ON public.recalls
  FOR EACH ROW EXECUTE FUNCTION public.insert_recalls();

DROP TRIGGER IF EXISTS recalls_update_trigger ON public.recalls;
CREATE TRIGGER recalls_update_trigger
  INSTEAD OF UPDATE ON public.recalls
  FOR EACH ROW EXECUTE FUNCTION public.update_recalls();

DROP TRIGGER IF EXISTS recalls_delete_trigger ON public.recalls;
CREATE TRIGGER recalls_delete_trigger
  INSTEAD OF DELETE ON public.recalls
  FOR EACH ROW EXECUTE FUNCTION public.delete_recalls();

-- ============================================================================
-- 7. INSTEAD OF triggers for recall_affected_batches -- @salsa
-- ============================================================================
CREATE OR REPLACE FUNCTION public.insert_recall_affected_batches()
RETURNS TRIGGER AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO stockly.recall_affected_batches (
    id, company_id, recall_id, stock_batch_id, batch_type,
    quantity_affected, quantity_recovered, action_taken, notes, added_at
  ) VALUES (
    COALESCE(NEW.id, gen_random_uuid()),
    NEW.company_id, NEW.recall_id, NEW.stock_batch_id,
    COALESCE(NEW.batch_type, 'finished_product'),
    NEW.quantity_affected, NEW.quantity_recovered,
    COALESCE(NEW.action_taken, 'pending'), NEW.notes,
    COALESCE(NEW.added_at, NOW())
  )
  RETURNING id INTO new_id;
  NEW.id := new_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.update_recall_affected_batches()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE stockly.recall_affected_batches SET
    quantity_affected = NEW.quantity_affected,
    quantity_recovered = NEW.quantity_recovered,
    action_taken = COALESCE(NEW.action_taken, OLD.action_taken),
    notes = NEW.notes
  WHERE id = OLD.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.delete_recall_affected_batches()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM stockly.recall_affected_batches WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS recall_affected_batches_insert_trigger ON public.recall_affected_batches;
CREATE TRIGGER recall_affected_batches_insert_trigger
  INSTEAD OF INSERT ON public.recall_affected_batches
  FOR EACH ROW EXECUTE FUNCTION public.insert_recall_affected_batches();

DROP TRIGGER IF EXISTS recall_affected_batches_update_trigger ON public.recall_affected_batches;
CREATE TRIGGER recall_affected_batches_update_trigger
  INSTEAD OF UPDATE ON public.recall_affected_batches
  FOR EACH ROW EXECUTE FUNCTION public.update_recall_affected_batches();

DROP TRIGGER IF EXISTS recall_affected_batches_delete_trigger ON public.recall_affected_batches;
CREATE TRIGGER recall_affected_batches_delete_trigger
  INSTEAD OF DELETE ON public.recall_affected_batches
  FOR EACH ROW EXECUTE FUNCTION public.delete_recall_affected_batches();

-- ============================================================================
-- 8. INSTEAD OF triggers for recall_notifications -- @salsa
-- ============================================================================
CREATE OR REPLACE FUNCTION public.insert_recall_notifications()
RETURNS TRIGGER AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO stockly.recall_notifications (
    id, company_id, recall_id, customer_id, customer_name,
    contact_email, contact_phone, notification_method,
    notified_at, notified_by, response_received, response_notes,
    stock_returned, stock_return_quantity, created_at
  ) VALUES (
    COALESCE(NEW.id, gen_random_uuid()),
    NEW.company_id, NEW.recall_id, NEW.customer_id, NEW.customer_name,
    NEW.contact_email, NEW.contact_phone, NEW.notification_method,
    NEW.notified_at, NEW.notified_by,
    COALESCE(NEW.response_received, FALSE), NEW.response_notes,
    COALESCE(NEW.stock_returned, FALSE), NEW.stock_return_quantity,
    COALESCE(NEW.created_at, NOW())
  )
  RETURNING id INTO new_id;
  NEW.id := new_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.update_recall_notifications()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE stockly.recall_notifications SET
    customer_name = COALESCE(NEW.customer_name, OLD.customer_name),
    contact_email = NEW.contact_email,
    contact_phone = NEW.contact_phone,
    notification_method = NEW.notification_method,
    notified_at = NEW.notified_at,
    notified_by = NEW.notified_by,
    response_received = COALESCE(NEW.response_received, OLD.response_received),
    response_notes = NEW.response_notes,
    stock_returned = COALESCE(NEW.stock_returned, OLD.stock_returned),
    stock_return_quantity = NEW.stock_return_quantity
  WHERE id = OLD.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.delete_recall_notifications()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM stockly.recall_notifications WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS recall_notifications_insert_trigger ON public.recall_notifications;
CREATE TRIGGER recall_notifications_insert_trigger
  INSTEAD OF INSERT ON public.recall_notifications
  FOR EACH ROW EXECUTE FUNCTION public.insert_recall_notifications();

DROP TRIGGER IF EXISTS recall_notifications_update_trigger ON public.recall_notifications;
CREATE TRIGGER recall_notifications_update_trigger
  INSTEAD OF UPDATE ON public.recall_notifications
  FOR EACH ROW EXECUTE FUNCTION public.update_recall_notifications();

DROP TRIGGER IF EXISTS recall_notifications_delete_trigger ON public.recall_notifications;
CREATE TRIGGER recall_notifications_delete_trigger
  INSTEAD OF DELETE ON public.recall_notifications
  FOR EACH ROW EXECUTE FUNCTION public.delete_recall_notifications();

-- ============================================================================
-- 9. INSTEAD OF triggers for batch_dispatch_records -- @salsa
-- ============================================================================
CREATE OR REPLACE FUNCTION public.insert_batch_dispatch_records()
RETURNS TRIGGER AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO stockly.batch_dispatch_records (
    id, company_id, site_id, stock_batch_id, order_id, customer_id,
    customer_name, dispatch_date, quantity, unit,
    delivery_note_reference, created_at, created_by
  ) VALUES (
    COALESCE(NEW.id, gen_random_uuid()),
    NEW.company_id, NEW.site_id, NEW.stock_batch_id, NEW.order_id, NEW.customer_id,
    NEW.customer_name, NEW.dispatch_date, NEW.quantity, NEW.unit,
    NEW.delivery_note_reference, COALESCE(NEW.created_at, NOW()), NEW.created_by
  )
  RETURNING id INTO new_id;
  NEW.id := new_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.delete_batch_dispatch_records()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM stockly.batch_dispatch_records WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS batch_dispatch_records_insert_trigger ON public.batch_dispatch_records;
CREATE TRIGGER batch_dispatch_records_insert_trigger
  INSTEAD OF INSERT ON public.batch_dispatch_records
  FOR EACH ROW EXECUTE FUNCTION public.insert_batch_dispatch_records();

DROP TRIGGER IF EXISTS batch_dispatch_records_delete_trigger ON public.batch_dispatch_records;
CREATE TRIGGER batch_dispatch_records_delete_trigger
  INSTEAD OF DELETE ON public.batch_dispatch_records
  FOR EACH ROW EXECUTE FUNCTION public.delete_batch_dispatch_records();

-- ============================================================================
-- 10. RLS on new stockly tables -- @salsa
-- ============================================================================
ALTER TABLE stockly.recalls ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS recalls_company ON stockly.recalls;
CREATE POLICY recalls_company ON stockly.recalls FOR ALL
  USING (stockly.stockly_company_access(company_id));

ALTER TABLE stockly.recall_affected_batches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS recall_affected_batches_company ON stockly.recall_affected_batches;
CREATE POLICY recall_affected_batches_company ON stockly.recall_affected_batches FOR ALL
  USING (stockly.stockly_company_access(company_id));

ALTER TABLE stockly.recall_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS recall_notifications_company ON stockly.recall_notifications;
CREATE POLICY recall_notifications_company ON stockly.recall_notifications FOR ALL
  USING (stockly.stockly_company_access(company_id));

ALTER TABLE stockly.batch_dispatch_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS batch_dispatch_records_company ON stockly.batch_dispatch_records;
CREATE POLICY batch_dispatch_records_company ON stockly.batch_dispatch_records FOR ALL
  USING (stockly.stockly_company_access(company_id));

-- ============================================================================
-- 11. Indexes -- @salsa
-- ============================================================================

-- recalls indexes
CREATE INDEX IF NOT EXISTS idx_recalls_company ON stockly.recalls(company_id);
CREATE INDEX IF NOT EXISTS idx_recalls_site ON stockly.recalls(site_id) WHERE site_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_recalls_status ON stockly.recalls(status);
CREATE INDEX IF NOT EXISTS idx_recalls_initiated_at ON stockly.recalls(initiated_at);

-- recall_affected_batches indexes
CREATE INDEX IF NOT EXISTS idx_recall_affected_batches_company ON stockly.recall_affected_batches(company_id);
CREATE INDEX IF NOT EXISTS idx_recall_affected_batches_recall ON stockly.recall_affected_batches(recall_id);
CREATE INDEX IF NOT EXISTS idx_recall_affected_batches_batch ON stockly.recall_affected_batches(stock_batch_id);

-- recall_notifications indexes
CREATE INDEX IF NOT EXISTS idx_recall_notifications_company ON stockly.recall_notifications(company_id);
CREATE INDEX IF NOT EXISTS idx_recall_notifications_recall ON stockly.recall_notifications(recall_id);
CREATE INDEX IF NOT EXISTS idx_recall_notifications_customer ON stockly.recall_notifications(customer_id) WHERE customer_id IS NOT NULL;

-- batch_dispatch_records indexes
CREATE INDEX IF NOT EXISTS idx_batch_dispatch_records_company ON stockly.batch_dispatch_records(company_id);
CREATE INDEX IF NOT EXISTS idx_batch_dispatch_records_batch ON stockly.batch_dispatch_records(stock_batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_dispatch_records_customer ON stockly.batch_dispatch_records(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_batch_dispatch_records_date ON stockly.batch_dispatch_records(dispatch_date);
CREATE INDEX IF NOT EXISTS idx_batch_dispatch_records_order ON stockly.batch_dispatch_records(order_id) WHERE order_id IS NOT NULL;

-- ============================================================================
-- 12. Auto-update updated_at trigger on recalls -- @salsa
-- ============================================================================
CREATE OR REPLACE FUNCTION stockly.update_recalls_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_recalls_updated_at ON stockly.recalls;
CREATE TRIGGER trg_recalls_updated_at
  BEFORE UPDATE ON stockly.recalls
  FOR EACH ROW
  EXECUTE FUNCTION stockly.update_recalls_updated_at();

-- Force schema reload -- @salsa
NOTIFY pgrst, 'reload schema';
