-- ============================================================================
-- Fix site_checklists INSERT RLS policy to allow Owner/Admin roles
-- ============================================================================
-- The original INSERT policy only allowed users to insert for their own site_id
-- This fix allows Owner/Admin to insert for any site in their company

DO $$
BEGIN
  -- Drop the existing INSERT policy if it exists
  DROP POLICY IF EXISTS "Users insert site_checklists for their site" ON site_checklists;

  -- Create new INSERT policy that allows Owner/Admin for any site in their company
  CREATE POLICY "Users insert site_checklists for their site or all if Owner/Admin"
  ON site_checklists FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (
        -- Owner/Admin can insert for any site in their company
        (
          profiles.app_role IN ('Owner', 'Admin')
          AND profiles.company_id = site_checklists.company_id
        )
        -- Regular users can only insert for their own site
        OR profiles.site_id = site_checklists.site_id
      )
    )
  );

  RAISE NOTICE '✅ Fixed site_checklists INSERT RLS policy to allow Owner/Admin';
END $$;
