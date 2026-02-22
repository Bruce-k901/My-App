-- ============================================================================
-- Fix site_checklists RLS policies to support staff with home_site
-- ============================================================================
-- The original SELECT policy only checked profiles.site_id, but staff members
-- may have their site stored in profiles.home_site instead.
-- This migration updates all policies to check both fields.

DO $$
BEGIN
  -- Check if required tables exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'site_checklists'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) THEN
    RAISE NOTICE 'site_checklists or profiles tables do not exist - skipping RLS policy fix';
    RETURN;
  END IF;

  -- Drop existing SELECT policy
  DROP POLICY IF EXISTS "Users view site_checklists for their site or all if Owner/Admin" ON site_checklists;

  -- Create new SELECT policy that checks both site_id and home_site
  CREATE POLICY "Users view site_checklists for their site or all if Owner/Admin"
  ON site_checklists FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (
        -- Owner/Admin can view all site_checklists in their company
        (
          profiles.app_role IN ('Owner', 'Admin')
          AND profiles.company_id = site_checklists.company_id
        )
        -- Regular users can view site_checklists for their site (check both site_id and home_site)
        OR (
          profiles.site_id = site_checklists.site_id
          OR profiles.home_site = site_checklists.site_id
        )
      )
    )
  );

  -- Drop existing UPDATE policy
  DROP POLICY IF EXISTS "Users update site_checklists for their site" ON site_checklists;

  -- Create new UPDATE policy that checks both site_id and home_site
  CREATE POLICY "Users update site_checklists for their site"
  ON site_checklists FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (
        -- Owner/Admin can update all site_checklists in their company
        (
          profiles.app_role IN ('Owner', 'Admin')
          AND profiles.company_id = site_checklists.company_id
        )
        -- Regular users can update site_checklists for their site (check both site_id and home_site)
        OR (
          profiles.site_id = site_checklists.site_id
          OR profiles.home_site = site_checklists.site_id
        )
      )
    )
  );

  -- Drop existing DELETE policy
  DROP POLICY IF EXISTS "Users delete site_checklists for their site" ON site_checklists;

  -- Create new DELETE policy that checks both site_id and home_site
  CREATE POLICY "Users delete site_checklists for their site"
  ON site_checklists FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (
        -- Owner/Admin can delete all site_checklists in their company
        (
          profiles.app_role IN ('Owner', 'Admin')
          AND profiles.company_id = site_checklists.company_id
        )
        -- Regular users can delete site_checklists for their site (check both site_id and home_site)
        OR (
          profiles.site_id = site_checklists.site_id
          OR profiles.home_site = site_checklists.site_id
        )
      )
    )
  );

  RAISE NOTICE '✅ Fixed site_checklists RLS policies to support staff with home_site';
END $$;
