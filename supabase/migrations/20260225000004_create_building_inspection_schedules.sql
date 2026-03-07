-- ============================================================================
-- Migration: 20260225000001_create_building_inspection_schedules.sql
-- Description: Inspection scheduling for building fabric assets
--   - Tracks recurring inspections with configurable frequency
--   - Can auto-create work orders when inspections are due
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.building_inspection_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_asset_id UUID NOT NULL REFERENCES building_assets(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  description TEXT,
  frequency_months INTEGER NOT NULL,
  next_due_date DATE,
  last_completed_date DATE,
  assigned_contractor_id UUID REFERENCES contractors(id) ON DELETE SET NULL,
  auto_create_wo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_inspection_schedules_company ON building_inspection_schedules(company_id);
CREATE INDEX IF NOT EXISTS idx_inspection_schedules_asset ON building_inspection_schedules(building_asset_id);
CREATE INDEX IF NOT EXISTS idx_inspection_schedules_due ON building_inspection_schedules(next_due_date);

-- RLS
ALTER TABLE public.building_inspection_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_select_inspection_schedules
  ON public.building_inspection_schedules
  FOR SELECT
  USING (
    public.is_service_role()
    OR public.matches_current_tenant(company_id)
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
        AND p.company_id = building_inspection_schedules.company_id
    )
  );

CREATE POLICY tenant_modify_inspection_schedules
  ON public.building_inspection_schedules
  FOR ALL
  USING (
    public.is_service_role()
    OR public.matches_current_tenant(company_id)
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
        AND p.company_id = building_inspection_schedules.company_id
    )
  )
  WITH CHECK (
    public.is_service_role()
    OR public.matches_current_tenant(company_id)
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
        AND p.company_id = building_inspection_schedules.company_id
    )
  );
