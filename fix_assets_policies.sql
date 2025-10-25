-- Fix Assets table RLS policies
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "assets_select_company" ON public.assets;
DROP POLICY IF EXISTS "assets_insert_company" ON public.assets;
DROP POLICY IF EXISTS "assets_update_company" ON public.assets;
DROP POLICY IF EXISTS "assets_delete_company" ON public.assets;

-- Enable Row Level Security on assets table
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

-- Policy: Company members can select assets in their company
-- Using case-insensitive role matching and JWT metadata
CREATE POLICY "assets_select_company"
  ON public.assets
  FOR SELECT
  USING (
    -- Check via profiles table with case-insensitive role matching
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = assets.company_id
        AND (
          -- Owners and admins can see all company assets
          LOWER(p.role) IN ('owner', 'admin')
          OR
          -- Staff and managers can see assets for their assigned sites
          (LOWER(p.role) IN ('staff', 'manager') AND assets.site_id = p.site_id)
        )
    )
    OR
    -- Fallback to JWT metadata with case-insensitive role matching
    (
      LOWER(auth.jwt() ->> 'role') IN ('manager','admin','owner')
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND p.company_id = assets.company_id
      )
    )
  );

-- Policy: Company members can insert assets in their company
CREATE POLICY "assets_insert_company"
  ON public.assets
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = assets.company_id
        AND LOWER(p.role) IN ('owner', 'admin', 'manager')
    )
    OR
    (
      LOWER(auth.jwt() ->> 'role') IN ('manager','admin','owner')
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND p.company_id = assets.company_id
      )
    )
  );

-- Policy: Company members can update assets in their company
CREATE POLICY "assets_update_company"
  ON public.assets
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = assets.company_id
        AND (
          -- Owners and admins can update all company assets
          LOWER(p.role) IN ('owner', 'admin')
          OR
          -- Managers can update assets for their assigned sites
          (LOWER(p.role) = 'manager' AND assets.site_id = p.site_id)
        )
    )
    OR
    (
      LOWER(auth.jwt() ->> 'role') IN ('manager','admin','owner')
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND p.company_id = assets.company_id
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = assets.company_id
        AND (
          LOWER(p.role) IN ('owner', 'admin')
          OR
          (LOWER(p.role) = 'manager' AND assets.site_id = p.site_id)
        )
    )
    OR
    (
      LOWER(auth.jwt() ->> 'role') IN ('manager','admin','owner')
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND p.company_id = assets.company_id
      )
    )
  );

-- Policy: Company owners/admins can delete assets
CREATE POLICY "assets_delete_company"
  ON public.assets
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = assets.company_id
        AND LOWER(p.role) IN ('owner', 'admin')
    )
    OR
    (
      LOWER(auth.jwt() ->> 'role') IN ('admin','owner')
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND p.company_id = assets.company_id
      )
    )
  );

-- Helpful indexes for performance
CREATE INDEX IF NOT EXISTS idx_assets_company_id ON public.assets (company_id);
CREATE INDEX IF NOT EXISTS idx_assets_site_id ON public.assets (site_id);
CREATE INDEX IF NOT EXISTS idx_assets_company_site ON public.assets (company_id, site_id);

-- Temporary test policy (remove after testing)
-- CREATE POLICY "test_read_all"
-- ON public.assets
-- FOR SELECT
-- TO authenticated
-- USING (true);