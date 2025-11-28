-- Fix companies RLS to allow users to create multiple companies
-- Problem: RLS was blocking users who already have a company from creating another one
-- Solution: Allow any authenticated user to create companies where user_id = auth.uid()

-- Drop existing INSERT policy if it exists
DROP POLICY IF EXISTS companies_insert_own ON public.companies;
DROP POLICY IF EXISTS "Users can create companies" ON public.companies;
DROP POLICY IF EXISTS "Users can insert companies" ON public.companies;
DROP POLICY IF EXISTS companies_user_access ON public.companies;

-- Create new INSERT policy that allows:
-- Any authenticated user can create a company where user_id = auth.uid()
-- This allows users to create multiple companies
CREATE POLICY "Users can create companies"
  ON public.companies
  FOR INSERT
  WITH CHECK (
    -- Allow if user_id matches auth.uid() (user creating their own company)
    user_id = auth.uid()
    OR
    -- Allow if created_by matches auth.uid() (alternative field)
    created_by = auth.uid()
  );

-- Ensure SELECT policy allows users to see their own company
DROP POLICY IF EXISTS companies_select_own_or_profile ON public.companies;
DROP POLICY IF EXISTS "Users can view their company" ON public.companies;

CREATE POLICY "Users can view their company"
  ON public.companies
  FOR SELECT
  USING (
    -- User created the company
    user_id = auth.uid()
    OR
    -- User belongs to the company
    id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Ensure UPDATE policy allows users to update their own company
DROP POLICY IF EXISTS companies_update_own_or_profile ON public.companies;
DROP POLICY IF EXISTS "Users can update their company" ON public.companies;

CREATE POLICY "Users can update their company"
  ON public.companies
  FOR UPDATE
  USING (
    -- User created the company
    user_id = auth.uid()
    OR
    -- User is admin of the company (use LOWER for case-insensitive comparison)
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND company_id = companies.id
      AND LOWER(app_role::text) IN ('admin', 'owner')
    )
  );

