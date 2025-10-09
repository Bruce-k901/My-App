-- Companies table RLS policies

-- Enable Row Level Security on companies table
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own company rows or those linked via profile.company_id
CREATE POLICY companies_select_own_or_profile
  ON public.companies
  FOR SELECT
  USING (
    public.companies.user_id = auth.uid()
    OR public.companies.created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = public.companies.id
    )
  );

-- Allow users to insert a company row for themselves
CREATE POLICY companies_insert_own
  ON public.companies
  FOR INSERT
  WITH CHECK (
    public.companies.user_id = auth.uid()
    OR public.companies.created_by = auth.uid()
  );

-- Allow users to update their own company rows or those linked via profile.company_id
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

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_companies_user_id ON public.companies(user_id);
CREATE INDEX IF NOT EXISTS idx_companies_created_by ON public.companies(created_by);