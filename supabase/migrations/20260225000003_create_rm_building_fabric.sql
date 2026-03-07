-- ============================================================================
-- Migration: 20260225000000_create_rm_building_fabric.sql
-- Description: Repairs & Maintenance for Building Fabric
--   - building_assets: register of building components (roof, walls, plumbing, etc.)
--   - work_orders: unified maintenance work order system (supports both equipment and building fabric)
--   - work_order_comments: comment thread per work order
--   - Triggers: auto WO number, SLA calculation, timeline logging, updated_at
--   - Storage bucket: work-order-documents
-- ============================================================================

-- ============================================================================
-- 1. building_assets table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.building_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,

  -- Classification
  name TEXT NOT NULL,
  fabric_category TEXT NOT NULL CHECK (fabric_category IN ('structural', 'internal', 'building_services', 'external')),
  fabric_subcategory TEXT NOT NULL,
  location_description TEXT,

  -- Condition & Lifecycle
  condition_rating INTEGER CHECK (condition_rating BETWEEN 1 AND 5),
  condition_notes TEXT,
  install_year INTEGER,
  expected_life_years INTEGER,
  area_or_quantity TEXT,

  -- Inspection
  last_inspection_date DATE,
  next_inspection_date DATE,
  inspection_frequency_months INTEGER,

  -- Contractors
  maintenance_contractor_id UUID REFERENCES contractors(id) ON DELETE SET NULL,
  emergency_contractor_id UUID REFERENCES contractors(id) ON DELETE SET NULL,

  -- Photos
  photos JSONB DEFAULT '[]'::jsonb,

  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'decommissioned')),
  archived_at TIMESTAMPTZ,

  -- Metadata
  notes TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_building_assets_company ON building_assets(company_id);
CREATE INDEX IF NOT EXISTS idx_building_assets_site ON building_assets(site_id);
CREATE INDEX IF NOT EXISTS idx_building_assets_category ON building_assets(fabric_category);
CREATE INDEX IF NOT EXISTS idx_building_assets_subcategory ON building_assets(fabric_subcategory);
CREATE INDEX IF NOT EXISTS idx_building_assets_condition ON building_assets(condition_rating);
CREATE INDEX IF NOT EXISTS idx_building_assets_next_inspection ON building_assets(next_inspection_date);
CREATE INDEX IF NOT EXISTS idx_building_assets_company_status ON building_assets(company_id, status);

-- RLS
ALTER TABLE public.building_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_select_building_assets
  ON public.building_assets
  FOR SELECT
  USING (
    public.is_service_role()
    OR public.matches_current_tenant(company_id)
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
        AND p.company_id = building_assets.company_id
    )
  );

CREATE POLICY tenant_modify_building_assets
  ON public.building_assets
  FOR ALL
  USING (
    public.is_service_role()
    OR public.matches_current_tenant(company_id)
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
        AND p.company_id = building_assets.company_id
    )
  )
  WITH CHECK (
    public.is_service_role()
    OR public.matches_current_tenant(company_id)
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
        AND p.company_id = building_assets.company_id
    )
  );

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_building_assets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_building_assets_updated_at
  BEFORE UPDATE ON building_assets
  FOR EACH ROW
  EXECUTE FUNCTION update_building_assets_updated_at();

-- ============================================================================
-- 2. work_orders table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,

  -- Reference number (auto-generated via trigger)
  wo_number TEXT NOT NULL,

  -- Target (polymorphic)
  target_type TEXT NOT NULL CHECK (target_type IN ('equipment', 'building_fabric')),
  asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
  building_asset_id UUID REFERENCES building_assets(id) ON DELETE SET NULL,

  -- Classification
  wo_type TEXT NOT NULL CHECK (wo_type IN ('reactive', 'planned', 'emergency', 'inspection', 'improvement')),
  priority TEXT NOT NULL DEFAULT 'P3' CHECK (priority IN ('P1', 'P2', 'P3', 'P4')),

  -- Status lifecycle
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN (
    'requested', 'triaged', 'approved', 'assigned', 'scheduled',
    'in_progress', 'on_hold', 'completed', 'verified', 'closed', 'cancelled'
  )),

  -- Description
  title TEXT NOT NULL,
  description TEXT,

  -- Assignment
  reported_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_to_contractor_id UUID REFERENCES contractors(id) ON DELETE SET NULL,
  assigned_to_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Scheduling
  scheduled_date DATE,
  due_date DATE,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  closed_at TIMESTAMPTZ,

  -- Cost tracking
  estimated_cost DECIMAL(10,2),
  actual_cost DECIMAL(10,2),
  invoice_reference TEXT,

  -- Evidence
  before_photos JSONB DEFAULT '[]'::jsonb,
  after_photos JSONB DEFAULT '[]'::jsonb,
  documents JSONB DEFAULT '[]'::jsonb,

  -- Resolution
  resolution_notes TEXT,
  root_cause TEXT,

  -- Audit timeline
  timeline JSONB DEFAULT '[]'::jsonb,

  -- SLA
  sla_target_hours INTEGER,
  sla_breached BOOLEAN DEFAULT FALSE,

  -- Tags
  tags TEXT[],

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure target reference is valid
  CONSTRAINT chk_wo_target CHECK (
    (target_type = 'equipment' AND asset_id IS NOT NULL)
    OR (target_type = 'building_fabric' AND building_asset_id IS NOT NULL)
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_work_orders_company ON work_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_site ON work_orders(site_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_priority ON work_orders(priority);
CREATE INDEX IF NOT EXISTS idx_work_orders_type ON work_orders(wo_type);
CREATE INDEX IF NOT EXISTS idx_work_orders_target_type ON work_orders(target_type);
CREATE INDEX IF NOT EXISTS idx_work_orders_asset ON work_orders(asset_id) WHERE asset_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_work_orders_building_asset ON work_orders(building_asset_id) WHERE building_asset_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_work_orders_contractor ON work_orders(assigned_to_contractor_id) WHERE assigned_to_contractor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_work_orders_due_date ON work_orders(due_date);
CREATE INDEX IF NOT EXISTS idx_work_orders_sla_breached ON work_orders(sla_breached) WHERE sla_breached = TRUE;
CREATE INDEX IF NOT EXISTS idx_work_orders_company_status ON work_orders(company_id, status);
CREATE INDEX IF NOT EXISTS idx_work_orders_company_site_status ON work_orders(company_id, site_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_work_orders_wo_number ON work_orders(company_id, wo_number);

-- RLS
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_select_work_orders
  ON public.work_orders
  FOR SELECT
  USING (
    public.is_service_role()
    OR public.matches_current_tenant(company_id)
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
        AND p.company_id = work_orders.company_id
    )
  );

CREATE POLICY tenant_modify_work_orders
  ON public.work_orders
  FOR ALL
  USING (
    public.is_service_role()
    OR public.matches_current_tenant(company_id)
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
        AND p.company_id = work_orders.company_id
    )
  )
  WITH CHECK (
    public.is_service_role()
    OR public.matches_current_tenant(company_id)
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
        AND p.company_id = work_orders.company_id
    )
  );

-- ============================================================================
-- 3. work_order_comments table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.work_order_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  is_internal BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wo_comments_work_order ON work_order_comments(work_order_id);
CREATE INDEX IF NOT EXISTS idx_wo_comments_author ON work_order_comments(author_id);

-- RLS
ALTER TABLE public.work_order_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage work_order_comments"
  ON public.work_order_comments FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================================
-- 4. Triggers
-- ============================================================================

-- 4a. Auto-generate WO number (WO-YYYY-NNNNN per company per year)
CREATE OR REPLACE FUNCTION generate_wo_number()
RETURNS TRIGGER AS $$
DECLARE
  year_part TEXT;
  seq_num INTEGER;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');

  SELECT COALESCE(MAX(
    CAST(SPLIT_PART(wo_number, '-', 3) AS INTEGER)
  ), 0) + 1
  INTO seq_num
  FROM work_orders
  WHERE company_id = NEW.company_id
    AND wo_number LIKE 'WO-' || year_part || '-%';

  NEW.wo_number := 'WO-' || year_part || '-' || LPAD(seq_num::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_wo_number
  BEFORE INSERT ON work_orders
  FOR EACH ROW
  EXECUTE FUNCTION generate_wo_number();

-- 4b. Auto-set SLA target hours and due date from priority
CREATE OR REPLACE FUNCTION set_wo_sla_and_due_date()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.priority IS DISTINCT FROM NEW.priority) THEN
    CASE NEW.priority
      WHEN 'P1' THEN
        NEW.sla_target_hours := 2;
        NEW.due_date := (NOW() + INTERVAL '2 hours')::DATE;
      WHEN 'P2' THEN
        NEW.sla_target_hours := 48;
        NEW.due_date := (NOW() + INTERVAL '48 hours')::DATE;
      WHEN 'P3' THEN
        NEW.sla_target_hours := 168;
        NEW.due_date := (NOW() + INTERVAL '7 days')::DATE;
      WHEN 'P4' THEN
        NEW.sla_target_hours := 672;
        NEW.due_date := (NOW() + INTERVAL '28 days')::DATE;
    END CASE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_wo_sla
  BEFORE INSERT OR UPDATE OF priority ON work_orders
  FOR EACH ROW
  EXECUTE FUNCTION set_wo_sla_and_due_date();

-- 4c. Auto-append timeline on status change
CREATE OR REPLACE FUNCTION append_wo_timeline()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.timeline := COALESCE(NEW.timeline, '[]'::jsonb) || jsonb_build_object(
      'action', 'status_changed',
      'from', OLD.status,
      'to', NEW.status,
      'at', NOW()::TEXT
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_append_wo_timeline
  BEFORE UPDATE OF status ON work_orders
  FOR EACH ROW
  EXECUTE FUNCTION append_wo_timeline();

-- 4d. Auto-set sla_breached when completed/closed after SLA
CREATE OR REPLACE FUNCTION check_wo_sla_breach()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('completed', 'verified', 'closed')
    AND OLD.status NOT IN ('completed', 'verified', 'closed')
    AND NEW.sla_target_hours IS NOT NULL
    AND NOW() > NEW.created_at + (NEW.sla_target_hours || ' hours')::INTERVAL
  THEN
    NEW.sla_breached := TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_wo_sla_breach
  BEFORE UPDATE OF status ON work_orders
  FOR EACH ROW
  EXECUTE FUNCTION check_wo_sla_breach();

-- 4e. Auto-update timestamps
CREATE OR REPLACE FUNCTION update_work_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_work_orders_updated_at
  BEFORE UPDATE ON work_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_work_orders_updated_at();

-- 4f. Auto-set completed_at/closed_at timestamps
CREATE OR REPLACE FUNCTION set_wo_status_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.completed_at IS NULL THEN
    NEW.completed_at := NOW();
  END IF;
  IF NEW.status = 'closed' AND OLD.status != 'closed' AND NEW.closed_at IS NULL THEN
    NEW.closed_at := NOW();
  END IF;
  IF NEW.status = 'verified' AND OLD.status != 'verified' AND NEW.verified_at IS NULL THEN
    NEW.verified_at := NOW();
  END IF;
  IF NEW.status = 'in_progress' AND OLD.status != 'in_progress' AND NEW.started_at IS NULL THEN
    NEW.started_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_wo_status_timestamps
  BEFORE UPDATE OF status ON work_orders
  FOR EACH ROW
  EXECUTE FUNCTION set_wo_status_timestamps();

-- ============================================================================
-- 5. Storage bucket for work order documents
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'buckets') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'work-order-documents',
      'work-order-documents',
      true,
      10485760, -- 10MB
      ARRAY[
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'text/csv'
      ]
    )
    ON CONFLICT (id) DO UPDATE SET
      public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'objects') THEN
    DROP POLICY IF EXISTS wo_documents_select_authenticated ON storage.objects;
    DROP POLICY IF EXISTS wo_documents_insert_authenticated ON storage.objects;
    DROP POLICY IF EXISTS wo_documents_update_authenticated ON storage.objects;
    DROP POLICY IF EXISTS wo_documents_delete_authenticated ON storage.objects;

    CREATE POLICY wo_documents_select_authenticated
      ON storage.objects FOR SELECT
      USING (bucket_id = 'work-order-documents' AND auth.uid() IS NOT NULL);

    CREATE POLICY wo_documents_insert_authenticated
      ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'work-order-documents' AND auth.uid() IS NOT NULL);

    CREATE POLICY wo_documents_update_authenticated
      ON storage.objects FOR UPDATE
      USING (bucket_id = 'work-order-documents' AND auth.uid() IS NOT NULL)
      WITH CHECK (bucket_id = 'work-order-documents' AND auth.uid() IS NOT NULL);

    CREATE POLICY wo_documents_delete_authenticated
      ON storage.objects FOR DELETE
      USING (bucket_id = 'work-order-documents' AND auth.uid() IS NOT NULL);
  END IF;
END $$;
