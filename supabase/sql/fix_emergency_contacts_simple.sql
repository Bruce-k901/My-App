-- ============================================================================
-- Simple Fix for Emergency Contacts company_id Column
-- Paste this directly into Supabase SQL Editor
-- Run this step by step if needed
-- ============================================================================

-- Step 1: Check if table exists and add company_id column
ALTER TABLE public.emergency_contacts
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- Step 2: Create index
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_company_id 
  ON public.emergency_contacts(company_id);

-- Step 3: Populate company_id from site_id where possible
UPDATE public.emergency_contacts ec
SET company_id = s.company_id
FROM public.sites s
WHERE ec.site_id = s.id
  AND ec.company_id IS NULL;

-- Step 4: For remaining contacts without company_id, you'll need to set manually
-- First, let's see what we have:
SELECT 
  id, 
  name, 
  site_id, 
  company_id,
  CASE 
    WHEN company_id IS NULL THEN 'NEEDS COMPANY_ID'
    ELSE 'OK'
  END as status
FROM public.emergency_contacts
ORDER BY status DESC, name;

-- Step 5: Drop old policies
DROP POLICY IF EXISTS emergency_contacts_select ON public.emergency_contacts;
DROP POLICY IF EXISTS emergency_contacts_insert ON public.emergency_contacts;
DROP POLICY IF EXISTS emergency_contacts_update ON public.emergency_contacts;
DROP POLICY IF EXISTS emergency_contacts_delete ON public.emergency_contacts;

-- Step 6: Create new policies
CREATE POLICY emergency_contacts_select ON public.emergency_contacts
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY emergency_contacts_insert ON public.emergency_contacts
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.profiles 
      WHERE id = auth.uid() 
        AND app_role IN ('Owner', 'Admin', 'Manager')
    )
  );

CREATE POLICY emergency_contacts_update ON public.emergency_contacts
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM public.profiles 
      WHERE id = auth.uid() 
        AND app_role IN ('Owner', 'Admin', 'Manager')
    )
  );

CREATE POLICY emergency_contacts_delete ON public.emergency_contacts
  FOR DELETE USING (
    company_id IN (
      SELECT company_id FROM public.profiles 
      WHERE id = auth.uid() 
        AND app_role IN ('Owner', 'Admin', 'Manager')
    )
  );

-- Success
SELECT 'Done! Check the SELECT query above to see which contacts need company_id set manually.' AS result;

