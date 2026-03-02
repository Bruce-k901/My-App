-- ============================================================================
-- Migration: 20260224100000_fix_sop_entries_rls_policies.sql
-- Description: Fix sop_entries RLS policies.
--              The original policies only checked profiles.company_id using
--              profiles.id = auth.uid(). This fails when:
--                1) profiles.id != auth.uid() (auth_user_id column is used instead)
--                2) The user's active company comes from user_companies table
--              Updated to use get_user_company_id() helper (handles auth_user_id)
--              plus user_companies lookup (profile_id column) for multi-company users.
-- ============================================================================

-- Drop all existing sop_entries policies
DROP POLICY IF EXISTS "Users can view SOPs from their own company" ON sop_entries;
DROP POLICY IF EXISTS "Users can create SOPs for their own company" ON sop_entries;
DROP POLICY IF EXISTS "Users can update SOPs from their own company" ON sop_entries;
DROP POLICY IF EXISTS "Users can delete SOPs from their own company" ON sop_entries;

-- SELECT policy
CREATE POLICY "Users can view SOPs from their own company"
  ON sop_entries
  FOR SELECT
  USING (
    -- Check 1: profiles.company_id via SECURITY DEFINER helper (handles auth_user_id)
    company_id = public.get_user_company_id()
    -- Check 2: user_companies table for multi-company users
    OR company_id IN (
      SELECT uc.company_id FROM user_companies uc
      WHERE uc.profile_id IN (
        SELECT p.id FROM profiles p
        WHERE p.id = auth.uid() OR p.auth_user_id = auth.uid()
      )
    )
  );

-- INSERT policy
CREATE POLICY "Users can create SOPs for their own company"
  ON sop_entries
  FOR INSERT
  WITH CHECK (
    company_id = public.get_user_company_id()
    OR company_id IN (
      SELECT uc.company_id FROM user_companies uc
      WHERE uc.profile_id IN (
        SELECT p.id FROM profiles p
        WHERE p.id = auth.uid() OR p.auth_user_id = auth.uid()
      )
    )
  );

-- UPDATE policy
CREATE POLICY "Users can update SOPs from their own company"
  ON sop_entries
  FOR UPDATE
  USING (
    company_id = public.get_user_company_id()
    OR company_id IN (
      SELECT uc.company_id FROM user_companies uc
      WHERE uc.profile_id IN (
        SELECT p.id FROM profiles p
        WHERE p.id = auth.uid() OR p.auth_user_id = auth.uid()
      )
    )
  );

-- DELETE policy
CREATE POLICY "Users can delete SOPs from their own company"
  ON sop_entries
  FOR DELETE
  USING (
    company_id = public.get_user_company_id()
    OR company_id IN (
      SELECT uc.company_id FROM user_companies uc
      WHERE uc.profile_id IN (
        SELECT p.id FROM profiles p
        WHERE p.id = auth.uid() OR p.auth_user_id = auth.uid()
      )
    )
  );
