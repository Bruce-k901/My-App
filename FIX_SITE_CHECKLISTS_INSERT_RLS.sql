-- ============================================================================
-- Quick Fix: Allow Owner/Admin to INSERT into site_checklists
-- ============================================================================
-- Run this SQL script in your Supabase SQL editor to fix the RLS policy
-- that was preventing Owner/Admin from creating site_checklists

BEGIN;

-- Drop the existing INSERT policy
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

COMMIT;

-- Verify the policy was created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'site_checklists' 
  AND policyname LIKE '%insert%'
ORDER BY policyname;
