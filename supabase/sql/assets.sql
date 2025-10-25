-- Assets table RLS policies

-- Enable Row Level Security on assets table
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

-- Policy: Company members can select assets in their company
-- Owners/admins see all company assets, staff/managers see site-scoped assets based on their profile
CREATE POLICY assets_select_company
  ON public.assets
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = assets.company_id
        AND (
          -- Owners and admins can see all company assets
          LOWER(p.app_role) IN ('owner', 'admin')
          OR
          -- Staff and managers can see assets for their assigned sites
          (LOWER(p.app_role) IN ('staff', 'manager') AND assets.site_id = p.site_id)
        )
    )
  );

-- Policy: Company members can insert assets in their company
CREATE POLICY assets_insert_company
  ON public.assets
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = assets.company_id
        AND LOWER(p.app_role) IN ('owner', 'admin', 'manager')
    )
  );

-- Policy: Company members can update assets in their company
CREATE POLICY assets_update_company
  ON public.assets
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = assets.company_id
        AND (
          -- Owners and admins can update all company assets
          LOWER(p.app_role) IN ('owner', 'admin')
          OR
          -- Managers can update assets for their assigned sites
          (LOWER(p.app_role) = 'manager' AND assets.site_id = p.site_id)
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = assets.company_id
        AND (
          LOWER(p.app_role) IN ('owner', 'admin')
          OR
          (LOWER(p.app_role) = 'manager' AND assets.site_id = p.site_id)
        )
    )
  );

-- Policy: Company members can delete assets in their company
CREATE POLICY assets_delete_company
  ON public.assets
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = assets.company_id
        AND LOWER(p.app_role) IN ('owner', 'admin')
    )
  );

-- Helpful indexes for performance
CREATE INDEX IF NOT EXISTS idx_assets_company_id ON public.assets (company_id);
CREATE INDEX IF NOT EXISTS idx_assets_site_id ON public.assets (site_id);
CREATE INDEX IF NOT EXISTS idx_assets_company_site ON public.assets (company_id, site_id);