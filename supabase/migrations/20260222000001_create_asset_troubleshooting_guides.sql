-- ============================================================================
-- Migration: 20260222000001_create_asset_troubleshooting_guides.sql
-- Description: Per-asset AI-generated + user-added troubleshooting guides
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.asset_troubleshooting_guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  ai_questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  custom_questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  sources JSONB DEFAULT '[]'::jsonb,
  ai_model TEXT,
  generated_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(asset_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_asset_troubleshooting_guides_company
  ON public.asset_troubleshooting_guides(company_id);
CREATE INDEX IF NOT EXISTS idx_asset_troubleshooting_guides_asset
  ON public.asset_troubleshooting_guides(asset_id);

-- RLS
ALTER TABLE public.asset_troubleshooting_guides ENABLE ROW LEVEL SECURITY;

-- Read: any authenticated user in the same company
DO $$
BEGIN
  DROP POLICY IF EXISTS atg_select ON public.asset_troubleshooting_guides;
  CREATE POLICY atg_select
    ON public.asset_troubleshooting_guides FOR SELECT
    USING (
      public.is_service_role()
      OR public.matches_current_tenant(company_id)
    );

  DROP POLICY IF EXISTS atg_insert ON public.asset_troubleshooting_guides;
  CREATE POLICY atg_insert
    ON public.asset_troubleshooting_guides FOR INSERT
    WITH CHECK (
      public.is_service_role()
      OR public.matches_current_tenant(company_id)
    );

  DROP POLICY IF EXISTS atg_update ON public.asset_troubleshooting_guides;
  CREATE POLICY atg_update
    ON public.asset_troubleshooting_guides FOR UPDATE
    USING (
      public.is_service_role()
      OR public.matches_current_tenant(company_id)
    );

  DROP POLICY IF EXISTS atg_delete ON public.asset_troubleshooting_guides;
  CREATE POLICY atg_delete
    ON public.asset_troubleshooting_guides FOR DELETE
    USING (
      public.is_service_role()
      OR public.matches_current_tenant(company_id)
    );
END $$;
