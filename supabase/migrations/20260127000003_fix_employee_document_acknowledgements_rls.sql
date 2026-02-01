-- ============================================================================
-- Migration: 20260127000003_fix_employee_document_acknowledgements_rls.sql
-- Description: Fix RLS policy for employee_document_acknowledgements to allow
--              users to acknowledge documents when profile_id matches their profile
-- ============================================================================

-- Drop the existing policy
DROP POLICY IF EXISTS onboarding_ack_insert_own ON public.employee_document_acknowledgements;

-- Create a more flexible policy that allows users to acknowledge documents
-- for their own profile (where profile.id = auth.uid() OR profile.auth_user_id = auth.uid())
CREATE POLICY onboarding_ack_insert_own
  ON public.employee_document_acknowledgements
  FOR INSERT
  WITH CHECK (
    -- Check that the profile_id belongs to a profile that matches the authenticated user
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = employee_document_acknowledgements.profile_id
        AND (p.id = auth.uid() OR p.auth_user_id = auth.uid())
        AND p.company_id = employee_document_acknowledgements.company_id
    )
  );
