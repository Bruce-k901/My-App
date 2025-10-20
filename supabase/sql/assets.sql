-- Assets table RLS policies

-- Enable Row Level Security on assets table
ALTER TABLE public.assets_redundant ENABLE ROW LEVEL SECURITY;

-- Policy: Company members can select assets in their company
-- Owners/admins see all company assets, staff/managers see site-scoped assets based on their profile
CREATE POLICY assets_select_company
  ON public.assets_redundant
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = assets_redundant.company_id
        AND (
          -- Owners and admins can see all company assets
          p.role IN ('owner', 'admin')
          OR
          -- Staff and managers can see assets for their assigned sites
          (p.role IN ('staff', 'manager') AND assets_redundant.site_id = p.site_id)
        )
    )
  );

-- Policy: Company members can insert assets in their company
CREATE POLICY assets_insert_company
  ON public.assets_redundant
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = assets_redundant.company_id
        AND p.role IN ('owner', 'admin', 'manager')
    )
  );

-- Policy: Company members can update assets in their company
CREATE POLICY assets_update_company
  ON public.assets_redundant
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = assets_redundant.company_id
        AND (
          -- Owners and admins can update all company assets
          p.role IN ('owner', 'admin')
          OR
          -- Managers can update assets for their assigned sites
          (p.role = 'manager' AND assets_redundant.site_id = p.site_id)
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = assets_redundant.company_id
        AND (
          p.role IN ('owner', 'admin')
          OR
          (p.role = 'manager' AND assets_redundant.site_id = p.site_id)
        )
    )
  );

-- Policy: Company owners/admins can delete assets
CREATE POLICY assets_delete_company
  ON public.assets_redundant
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = assets_redundant.company_id
        AND p.role IN ('owner', 'admin')
    )
  );

-- Helpful indexes for performance
CREATE INDEX IF NOT EXISTS idx_assets_company_id ON public.assets_redundant (company_id);
CREATE INDEX IF NOT EXISTS idx_assets_site_id ON public.assets_redundant (site_id);
CREATE INDEX IF NOT EXISTS idx_assets_company_site ON public.assets_redundant (company_id, site_id);