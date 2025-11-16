-- ============================================================================
-- Fix Emergency Contacts company_id Column
-- Paste this directly into Supabase SQL Editor
-- ============================================================================

-- Step 1: Add company_id column if it doesn't exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'emergency_contacts'
  ) THEN
    -- Check if company_id column exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'emergency_contacts' 
      AND column_name = 'company_id'
    ) THEN
      -- Add company_id column
      ALTER TABLE public.emergency_contacts
        ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
      
      RAISE NOTICE 'Added company_id column';
    ELSE
      RAISE NOTICE 'company_id column already exists';
    END IF;
  ELSE
    RAISE NOTICE 'emergency_contacts table does not exist';
  END IF;
END $$;

-- Step 2: Populate company_id from site_id (if contact has a site)
-- Note: Emergency contacts are primarily company-wide, site_id is optional
UPDATE public.emergency_contacts ec
SET company_id = s.company_id
FROM public.sites s
WHERE ec.site_id = s.id
  AND ec.company_id IS NULL;

-- Step 2b: For emergency contacts without site_id (company-wide contacts),
-- set company_id from the current user's profile company_id
-- This assumes you're running this as a user with a company_id
DO $$
DECLARE
  user_company_id UUID;
BEGIN
  -- Get the company_id from the authenticated user's profile
  SELECT company_id INTO user_company_id
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
  
  -- Update company-wide emergency contacts (those without site_id)
  IF user_company_id IS NOT NULL THEN
    UPDATE public.emergency_contacts
    SET company_id = user_company_id
    WHERE company_id IS NULL
      AND site_id IS NULL;
    
    RAISE NOTICE 'Updated company-wide emergency contacts with company_id: %', user_company_id;
  END IF;
END $$;

-- Step 3: Create index if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_company_id 
  ON public.emergency_contacts(company_id);

-- Step 4: Drop and recreate RLS policies with correct app_role
DROP POLICY IF EXISTS emergency_contacts_select ON public.emergency_contacts;
DROP POLICY IF EXISTS emergency_contacts_insert ON public.emergency_contacts;
DROP POLICY IF EXISTS emergency_contacts_update ON public.emergency_contacts;
DROP POLICY IF EXISTS emergency_contacts_delete ON public.emergency_contacts;

-- Recreate SELECT policy
CREATE POLICY emergency_contacts_select ON public.emergency_contacts
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Recreate INSERT policy
CREATE POLICY emergency_contacts_insert ON public.emergency_contacts
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.profiles 
      WHERE id = auth.uid() 
        AND app_role IN ('Owner', 'Admin', 'Manager')
    )
  );

-- Recreate UPDATE policy
CREATE POLICY emergency_contacts_update ON public.emergency_contacts
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM public.profiles 
      WHERE id = auth.uid() 
        AND app_role IN ('Owner', 'Admin', 'Manager')
    )
  );

-- Recreate DELETE policy
CREATE POLICY emergency_contacts_delete ON public.emergency_contacts
  FOR DELETE USING (
    company_id IN (
      SELECT company_id FROM public.profiles 
      WHERE id = auth.uid() 
        AND app_role IN ('Owner', 'Admin', 'Manager')
    )
  );

-- Success message
SELECT 'Emergency contacts table fixed! company_id column added and RLS policies updated.' AS result;

