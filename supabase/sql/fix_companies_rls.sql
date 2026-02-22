-- COMPREHENSIVE FIX: Update RLS policies to be more permissive during setup
-- This allows users to access their company during initial signup before profile is fully created

-- Drop existing policies
DROP POLICY IF EXISTS companies_select_own_or_profile ON public.companies;
DROP POLICY IF EXISTS companies_insert_own ON public.companies;
DROP POLICY IF EXISTS companies_update_own_or_profile ON public.companies;

-- More permissive SELECT policy: Allow if user_id, created_by matches, OR profile exists
-- Also allows access if user is the creator (for initial setup)
CREATE POLICY companies_select_own_or_profile
  ON public.companies
  FOR SELECT
  USING (
    -- User created the company (primary check)
    public.companies.user_id = auth.uid()
    OR public.companies.created_by = auth.uid()
    -- OR user has a profile linked to this company
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = public.companies.id
    )
  );

-- INSERT policy: Allow if user_id or created_by matches
CREATE POLICY companies_insert_own
  ON public.companies
  FOR INSERT
  WITH CHECK (
    public.companies.user_id = auth.uid()
    OR public.companies.created_by = auth.uid()
  );

-- UPDATE policy: Allow if user_id, created_by matches, OR profile exists
CREATE POLICY companies_update_own_or_profile
  ON public.companies
  FOR UPDATE
  USING (
    public.companies.user_id = auth.uid()
    OR public.companies.created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = public.companies.id
    )
  )
  WITH CHECK (
    public.companies.user_id = auth.uid()
    OR public.companies.created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = public.companies.id
    )
  );
