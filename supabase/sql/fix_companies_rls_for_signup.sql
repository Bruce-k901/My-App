-- Fix companies RLS to allow new users to create companies during signup
-- Problem: New users don't have company_id yet, so they can't create a company
-- Solution: Allow authenticated users to create a company if they don't have one yet

-- Drop existing INSERT policy if it exists
DROP POLICY IF EXISTS companies_insert_own ON public.companies;
DROP POLICY IF EXISTS "Users can create companies" ON public.companies;
DROP POLICY IF EXISTS "Users can insert companies" ON public.companies;
DROP POLICY IF EXISTS companies_user_access ON public.companies;

-- Create new INSERT policy that allows:
-- 1. Users without a company_id (new signups) to create a company where user_id = auth.uid()
-- 2. Users with a company_id to create companies (if needed)
CREATE POLICY "Users can create companies"
  ON public.companies
  FOR INSERT
  WITH CHECK (
    -- Allow if user_id matches auth.uid() (user creating their own company)
    user_id = auth.uid()
    OR
    -- Allow if created_by matches auth.uid() (alternative field)
    created_by = auth.uid()
    OR
    -- Allow if user has no company_id yet (new signup)
    NOT EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND company_id IS NOT NULL
    )
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

