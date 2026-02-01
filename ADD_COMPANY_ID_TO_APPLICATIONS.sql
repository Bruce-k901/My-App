-- =====================================================
-- ADD company_id TO applications TABLE
-- =====================================================
-- The applications table needs company_id for RLS and querying

-- Add company_id column
ALTER TABLE public.applications 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- Populate existing records (if any) by looking up via candidates
UPDATE public.applications 
SET company_id = candidates.company_id
FROM public.candidates
WHERE applications.candidate_id = candidates.id
AND applications.company_id IS NULL;

-- Make it NOT NULL after populating
ALTER TABLE public.applications 
ALTER COLUMN company_id SET NOT NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_applications_company_id ON public.applications(company_id);

-- Update RLS policies to use company_id
DROP POLICY IF EXISTS "company_members_can_view_applications" ON public.applications;
DROP POLICY IF EXISTS "managers_can_manage_applications" ON public.applications;

CREATE POLICY "company_members_can_view_applications"
ON public.applications FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "managers_can_manage_applications"
ON public.applications FOR ALL
USING (
  company_id IN (
    SELECT company_id FROM public.profiles 
    WHERE id = auth.uid() 
    AND app_role IN ('Admin', 'Owner', 'Manager', 'Area Manager', 'Ops Manager')
  )
);

-- Allow service role to insert (for API routes)
CREATE POLICY "service_role_can_insert_applications"
ON public.applications FOR INSERT
TO service_role
WITH CHECK (true);
