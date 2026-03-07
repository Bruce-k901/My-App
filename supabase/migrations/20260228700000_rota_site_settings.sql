-- ============================================================================
-- Migration: 20260228700000_rota_site_settings.sql
-- Description: Per-site rota settings (staff sort order, etc.).
--              Persists the staff ordering so it survives across sessions.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.rota_site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  staff_order JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, site_id)
);

CREATE INDEX IF NOT EXISTS idx_rota_site_settings_lookup
  ON public.rota_site_settings(company_id, site_id);

ALTER TABLE public.rota_site_settings ENABLE ROW LEVEL SECURITY;

-- Company users can view
CREATE POLICY rota_site_settings_select ON public.rota_site_settings FOR SELECT
  USING (public.is_service_role() OR public.matches_current_tenant(company_id));

-- Managers can manage
CREATE POLICY rota_site_settings_insert ON public.rota_site_settings FOR INSERT
  WITH CHECK (public.is_service_role() OR public.matches_current_tenant(company_id));

CREATE POLICY rota_site_settings_update ON public.rota_site_settings FOR UPDATE
  USING (public.is_service_role() OR public.matches_current_tenant(company_id));

CREATE POLICY rota_site_settings_delete ON public.rota_site_settings FOR DELETE
  USING (public.is_service_role() OR public.matches_current_tenant(company_id));

NOTIFY pgrst, 'reload schema';
