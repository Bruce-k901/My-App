-- ============================================================================
-- Migration: Comprehensive Pest Control Management System
-- Description: Creates tables for pest control contracts, visits, devices,
--              and sightings. Supports SALSA accreditation and EHO compliance.
-- ============================================================================

-- ============================================================================
-- Table 1: pest_control_contracts
-- Pest-control-specific contract details linked to contractors table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.pest_control_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE, -- NULL = company-wide
  contractor_id UUID NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,

  -- Contract details
  contract_reference TEXT,
  contract_start_date DATE NOT NULL,
  contract_end_date DATE,
  contract_value_annual DECIMAL(10,2),

  -- Service level
  routine_visits_per_year INTEGER DEFAULT 12,
  emergency_response_hours INTEGER DEFAULT 24,

  -- Coverage
  coverage_includes TEXT[] DEFAULT ARRAY['mice','rats','flies','cockroaches'],
  exclusions TEXT[],

  -- Insurance & certification
  public_liability_amount DECIMAL(12,2),
  insurance_expiry_date DATE,
  bpca_certified BOOLEAN DEFAULT FALSE,
  basis_registered BOOLEAN DEFAULT FALSE,
  certifications JSONB DEFAULT '[]'::JSONB,

  -- Documentation
  contract_document_url TEXT,
  insurance_certificate_url TEXT,
  risk_assessment_url TEXT,

  -- Alerts
  renewal_reminder_days INTEGER DEFAULT 60,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  auto_renew BOOLEAN DEFAULT FALSE,

  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pest_contracts_company ON public.pest_control_contracts(company_id);
CREATE INDEX IF NOT EXISTS idx_pest_contracts_site ON public.pest_control_contracts(site_id);
CREATE INDEX IF NOT EXISTS idx_pest_contracts_contractor ON public.pest_control_contracts(contractor_id);
CREATE INDEX IF NOT EXISTS idx_pest_contracts_active ON public.pest_control_contracts(company_id, is_active) WHERE is_active = TRUE;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.pest_control_contracts_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pest_control_contracts_updated ON public.pest_control_contracts;
CREATE TRIGGER trg_pest_control_contracts_updated
  BEFORE UPDATE ON public.pest_control_contracts
  FOR EACH ROW EXECUTE FUNCTION public.pest_control_contracts_set_updated_at();

-- RLS
ALTER TABLE public.pest_control_contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pest_contracts_select ON public.pest_control_contracts;
CREATE POLICY pest_contracts_select ON public.pest_control_contracts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.company_id = pest_control_contracts.company_id
    )
  );

DROP POLICY IF EXISTS pest_contracts_insert ON public.pest_control_contracts;
CREATE POLICY pest_contracts_insert ON public.pest_control_contracts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = pest_control_contracts.company_id
        AND LOWER(p.app_role::TEXT) IN ('owner', 'admin', 'manager')
    )
  );

DROP POLICY IF EXISTS pest_contracts_update ON public.pest_control_contracts;
CREATE POLICY pest_contracts_update ON public.pest_control_contracts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = pest_control_contracts.company_id
        AND LOWER(p.app_role::TEXT) IN ('owner', 'admin', 'manager')
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = pest_control_contracts.company_id
        AND LOWER(p.app_role::TEXT) IN ('owner', 'admin', 'manager')
    )
  );

DROP POLICY IF EXISTS pest_contracts_delete ON public.pest_control_contracts;
CREATE POLICY pest_contracts_delete ON public.pest_control_contracts
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = pest_control_contracts.company_id
        AND LOWER(p.app_role::TEXT) IN ('owner', 'admin', 'manager')
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pest_control_contracts TO authenticated;


-- ============================================================================
-- Table 2: pest_control_visits
-- Tracks every contractor visit with findings, treatments, and costs
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.pest_control_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  contractor_id UUID REFERENCES public.contractors(id) ON DELETE SET NULL,

  -- Visit details
  visit_date DATE NOT NULL,
  visit_type TEXT NOT NULL DEFAULT 'routine' CHECK (visit_type IN ('routine', 'reactive', 'emergency', 'follow_up')),
  technician_name TEXT,
  visit_duration_minutes INTEGER,

  -- Findings
  evidence_found BOOLEAN DEFAULT FALSE,
  evidence_type TEXT[],
  affected_areas TEXT[],
  pest_types TEXT[],

  -- Actions taken
  treatments_applied TEXT[],
  chemicals_used JSONB DEFAULT '[]'::JSONB,
  devices_serviced INTEGER,
  devices_replaced INTEGER,
  baits_replenished INTEGER,

  -- Recommendations
  proofing_required BOOLEAN DEFAULT FALSE,
  proofing_details TEXT,
  hygiene_issues_noted TEXT,
  follow_up_required BOOLEAN DEFAULT FALSE,
  follow_up_date DATE,

  -- Cost tracking
  visit_cost DECIMAL(10,2),
  materials_cost DECIMAL(10,2),
  total_cost DECIMAL(10,2),
  invoice_reference TEXT,

  -- Documentation
  service_report_file TEXT,
  ai_extracted BOOLEAN DEFAULT FALSE,

  -- Sign-off
  site_manager_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  signed_off_at TIMESTAMPTZ,

  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pest_visits_company ON public.pest_control_visits(company_id);
CREATE INDEX IF NOT EXISTS idx_pest_visits_site ON public.pest_control_visits(site_id);
CREATE INDEX IF NOT EXISTS idx_pest_visits_date ON public.pest_control_visits(visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_pest_visits_contractor ON public.pest_control_visits(contractor_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.pest_control_visits_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pest_control_visits_updated ON public.pest_control_visits;
CREATE TRIGGER trg_pest_control_visits_updated
  BEFORE UPDATE ON public.pest_control_visits
  FOR EACH ROW EXECUTE FUNCTION public.pest_control_visits_set_updated_at();

-- RLS
ALTER TABLE public.pest_control_visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pest_visits_select ON public.pest_control_visits;
CREATE POLICY pest_visits_select ON public.pest_control_visits
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.company_id = pest_control_visits.company_id
    )
  );

DROP POLICY IF EXISTS pest_visits_insert ON public.pest_control_visits;
CREATE POLICY pest_visits_insert ON public.pest_control_visits
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = pest_control_visits.company_id
        AND LOWER(p.app_role::TEXT) IN ('owner', 'admin', 'manager')
    )
  );

DROP POLICY IF EXISTS pest_visits_update ON public.pest_control_visits;
CREATE POLICY pest_visits_update ON public.pest_control_visits
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = pest_control_visits.company_id
        AND LOWER(p.app_role::TEXT) IN ('owner', 'admin', 'manager')
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = pest_control_visits.company_id
        AND LOWER(p.app_role::TEXT) IN ('owner', 'admin', 'manager')
    )
  );

DROP POLICY IF EXISTS pest_visits_delete ON public.pest_control_visits;
CREATE POLICY pest_visits_delete ON public.pest_control_visits
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = pest_control_visits.company_id
        AND LOWER(p.app_role::TEXT) IN ('owner', 'admin', 'manager')
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pest_control_visits TO authenticated;


-- ============================================================================
-- Table 3: pest_control_devices
-- SALSA-compliant device/bait station register
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.pest_control_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,

  -- Device identification
  device_number TEXT NOT NULL,
  device_type TEXT NOT NULL CHECK (device_type IN ('mouse_trap', 'rat_trap', 'bait_station', 'insectocutor', 'fly_screen', 'bird_deterrent', 'pheromone_trap')),
  device_name TEXT,

  -- Location (critical for SALSA)
  location_area TEXT NOT NULL,
  location_description TEXT,
  floor_level TEXT DEFAULT 'ground' CHECK (floor_level IN ('basement', 'ground', 'first', 'second', 'external')),

  -- Device details
  manufacturer TEXT,
  model TEXT,
  bait_type TEXT,
  installation_date DATE,
  last_service_date DATE,

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'removed', 'needs_replacement')),
  is_active BOOLEAN DEFAULT TRUE,

  -- IPM tracking
  inspection_frequency_days INTEGER DEFAULT 7,
  last_activity_date DATE,
  activity_count_ytd INTEGER DEFAULT 0,

  -- Documentation
  photo_url TEXT,

  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  UNIQUE(company_id, site_id, device_number)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pest_devices_company ON public.pest_control_devices(company_id);
CREATE INDEX IF NOT EXISTS idx_pest_devices_site ON public.pest_control_devices(site_id);
CREATE INDEX IF NOT EXISTS idx_pest_devices_active ON public.pest_control_devices(site_id, is_active) WHERE is_active = TRUE;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.pest_control_devices_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pest_control_devices_updated ON public.pest_control_devices;
CREATE TRIGGER trg_pest_control_devices_updated
  BEFORE UPDATE ON public.pest_control_devices
  FOR EACH ROW EXECUTE FUNCTION public.pest_control_devices_set_updated_at();

-- RLS
ALTER TABLE public.pest_control_devices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pest_devices_select ON public.pest_control_devices;
CREATE POLICY pest_devices_select ON public.pest_control_devices
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.company_id = pest_control_devices.company_id
    )
  );

DROP POLICY IF EXISTS pest_devices_insert ON public.pest_control_devices;
CREATE POLICY pest_devices_insert ON public.pest_control_devices
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = pest_control_devices.company_id
        AND LOWER(p.app_role::TEXT) IN ('owner', 'admin', 'manager')
    )
  );

DROP POLICY IF EXISTS pest_devices_update ON public.pest_control_devices;
CREATE POLICY pest_devices_update ON public.pest_control_devices
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = pest_control_devices.company_id
        AND LOWER(p.app_role::TEXT) IN ('owner', 'admin', 'manager')
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = pest_control_devices.company_id
        AND LOWER(p.app_role::TEXT) IN ('owner', 'admin', 'manager')
    )
  );

DROP POLICY IF EXISTS pest_devices_delete ON public.pest_control_devices;
CREATE POLICY pest_devices_delete ON public.pest_control_devices
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = pest_control_devices.company_id
        AND LOWER(p.app_role::TEXT) IN ('owner', 'admin', 'manager')
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pest_control_devices TO authenticated;


-- ============================================================================
-- Table 4: pest_sightings
-- Log any pest sightings for trend analysis
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.pest_sightings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,

  -- Sighting details
  sighting_date DATE NOT NULL,
  sighting_time TIME,
  pest_type TEXT NOT NULL,
  evidence_type TEXT NOT NULL CHECK (evidence_type IN ('live_sighting', 'dead_specimen', 'droppings', 'gnaw_marks', 'nesting_material', 'tracks', 'smell')),

  -- Location
  location_area TEXT NOT NULL,
  location_details TEXT,
  device_id UUID REFERENCES public.pest_control_devices(id) ON DELETE SET NULL,

  -- Severity
  severity TEXT NOT NULL DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  quantity_estimate TEXT,

  -- Response
  immediate_action_taken TEXT,
  contractor_notified BOOLEAN DEFAULT FALSE,

  -- Follow-up
  resolved BOOLEAN DEFAULT FALSE,
  resolved_date DATE,
  resolution_notes TEXT,

  -- Documentation
  photo_urls TEXT[],

  -- Reported by
  reported_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reported_by_name TEXT,

  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pest_sightings_company ON public.pest_sightings(company_id);
CREATE INDEX IF NOT EXISTS idx_pest_sightings_site ON public.pest_sightings(site_id);
CREATE INDEX IF NOT EXISTS idx_pest_sightings_date ON public.pest_sightings(sighting_date DESC);
CREATE INDEX IF NOT EXISTS idx_pest_sightings_unresolved ON public.pest_sightings(site_id, resolved) WHERE resolved = FALSE;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.pest_sightings_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pest_sightings_updated ON public.pest_sightings;
CREATE TRIGGER trg_pest_sightings_updated
  BEFORE UPDATE ON public.pest_sightings
  FOR EACH ROW EXECUTE FUNCTION public.pest_sightings_set_updated_at();

-- RLS
ALTER TABLE public.pest_sightings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pest_sightings_select ON public.pest_sightings;
CREATE POLICY pest_sightings_select ON public.pest_sightings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.company_id = pest_sightings.company_id
    )
  );

DROP POLICY IF EXISTS pest_sightings_insert ON public.pest_sightings;
CREATE POLICY pest_sightings_insert ON public.pest_sightings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = pest_sightings.company_id
    )
  );

DROP POLICY IF EXISTS pest_sightings_update ON public.pest_sightings;
CREATE POLICY pest_sightings_update ON public.pest_sightings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = pest_sightings.company_id
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = pest_sightings.company_id
    )
  );

DROP POLICY IF EXISTS pest_sightings_delete ON public.pest_sightings;
CREATE POLICY pest_sightings_delete ON public.pest_sightings
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = pest_sightings.company_id
        AND LOWER(p.app_role::TEXT) IN ('owner', 'admin', 'manager')
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pest_sightings TO authenticated;


-- ============================================================================
-- Storage bucket for pest control documents
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pest-control-documents',
  'pest-control-documents',
  FALSE,
  10485760, -- 10MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: company members can read, managers+ can write
DROP POLICY IF EXISTS pest_docs_select ON storage.objects;
CREATE POLICY pest_docs_select ON storage.objects
  FOR SELECT USING (
    bucket_id = 'pest-control-documents'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id::TEXT = (storage.foldername(name))[1]
    )
  );

DROP POLICY IF EXISTS pest_docs_insert ON storage.objects;
CREATE POLICY pest_docs_insert ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'pest-control-documents'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id::TEXT = (storage.foldername(name))[1]
        AND LOWER(p.app_role::TEXT) IN ('owner', 'admin', 'manager')
    )
  );

DROP POLICY IF EXISTS pest_docs_update ON storage.objects;
CREATE POLICY pest_docs_update ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'pest-control-documents'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id::TEXT = (storage.foldername(name))[1]
        AND LOWER(p.app_role::TEXT) IN ('owner', 'admin', 'manager')
    )
  );

DROP POLICY IF EXISTS pest_docs_delete ON storage.objects;
CREATE POLICY pest_docs_delete ON storage.objects
  FOR DELETE USING (
    bucket_id = 'pest-control-documents'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id::TEXT = (storage.foldername(name))[1]
        AND LOWER(p.app_role::TEXT) IN ('owner', 'admin', 'manager')
    )
  );


DO $$
BEGIN
  RAISE NOTICE 'Pest control system tables created successfully: pest_control_contracts, pest_control_visits, pest_control_devices, pest_sightings';
END $$;
