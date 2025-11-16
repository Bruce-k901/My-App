-- ============================================================================
-- Diagnostic and Fix Script for Emergency Contacts
-- Run this in Supabase SQL Editor to see what's wrong and fix it
-- ============================================================================

-- Step 1: Check what columns currently exist
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'emergency_contacts'
ORDER BY ordinal_position;

-- Step 2: Check if table exists and fix it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'emergency_contacts'
  ) THEN
    RAISE NOTICE 'Table does not exist - creating it now...';
    
    -- Create table with correct schema
    CREATE TABLE public.emergency_contacts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
      site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,
      
      -- Contact Information
      contact_type TEXT NOT NULL CHECK (contact_type IN ('first_aider', 'manager', 'emergency_services', 'utility', 'other')),
      name TEXT NOT NULL,
      phone_number TEXT NOT NULL,
      email TEXT,
      role_title TEXT,
      notes TEXT,
      
      -- Display Settings
      display_order INTEGER NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      language TEXT NOT NULL DEFAULT 'en',
      
      -- Metadata
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
      updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
    );
    
    RAISE NOTICE 'Table created successfully';
  ELSE
    RAISE NOTICE 'Table exists - checking columns...';
    
    -- Add company_id if missing
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'emergency_contacts' 
      AND column_name = 'company_id'
    ) THEN
      ALTER TABLE public.emergency_contacts
        ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
      
      -- Try to populate from site_id
      UPDATE public.emergency_contacts ec
      SET company_id = s.company_id
      FROM public.sites s
      WHERE ec.site_id = s.id
        AND ec.company_id IS NULL;
      
      -- Make it NOT NULL after populating (if all rows have company_id)
      -- First check if there are any NULLs
      IF NOT EXISTS (SELECT 1 FROM public.emergency_contacts WHERE company_id IS NULL) THEN
        ALTER TABLE public.emergency_contacts
          ALTER COLUMN company_id SET NOT NULL;
      END IF;
      
      RAISE NOTICE 'Added company_id column';
    END IF;
    
    -- Rename phone to phone_number if needed
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'emergency_contacts' 
      AND column_name = 'phone'
    ) AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'emergency_contacts' 
      AND column_name = 'phone_number'
    ) THEN
      ALTER TABLE public.emergency_contacts
        RENAME COLUMN phone TO phone_number;
      RAISE NOTICE 'Renamed phone to phone_number';
    END IF;
    
    -- Rename role to contact_type if needed
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'emergency_contacts' 
      AND column_name = 'role'
    ) AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'emergency_contacts' 
      AND column_name = 'contact_type'
    ) THEN
      ALTER TABLE public.emergency_contacts
        RENAME COLUMN role TO contact_type;
      RAISE NOTICE 'Renamed role to contact_type';
    END IF;
    
    -- Add contact_type if missing
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'emergency_contacts' 
      AND column_name = 'contact_type'
    ) THEN
      ALTER TABLE public.emergency_contacts
        ADD COLUMN contact_type TEXT CHECK (contact_type IN ('first_aider', 'manager', 'emergency_services', 'utility', 'other'));
      
      -- Set default for existing rows
      UPDATE public.emergency_contacts
      SET contact_type = 'other'
      WHERE contact_type IS NULL;
      
      -- Make it NOT NULL
      ALTER TABLE public.emergency_contacts
        ALTER COLUMN contact_type SET NOT NULL;
      
      RAISE NOTICE 'Added contact_type column';
    END IF;
    
    -- Add phone_number if missing
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'emergency_contacts' 
      AND column_name = 'phone_number'
    ) THEN
      ALTER TABLE public.emergency_contacts
        ADD COLUMN phone_number TEXT;
      
      -- Copy from phone if it exists
      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'emergency_contacts' 
        AND column_name = 'phone'
      ) THEN
        UPDATE public.emergency_contacts
        SET phone_number = phone;
      END IF;
      
      ALTER TABLE public.emergency_contacts
        ALTER COLUMN phone_number SET NOT NULL;
      
      RAISE NOTICE 'Added phone_number column';
    END IF;
    
    -- Add role_title if missing
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'emergency_contacts' 
      AND column_name = 'role_title'
    ) THEN
      ALTER TABLE public.emergency_contacts
        ADD COLUMN role_title TEXT;
      RAISE NOTICE 'Added role_title column';
    END IF;
    
    -- Add display_order if missing
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'emergency_contacts' 
      AND column_name = 'display_order'
    ) THEN
      ALTER TABLE public.emergency_contacts
        ADD COLUMN display_order INTEGER NOT NULL DEFAULT 0;
      RAISE NOTICE 'Added display_order column';
    END IF;
    
    -- Add is_active if missing
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'emergency_contacts' 
      AND column_name = 'is_active'
    ) THEN
      ALTER TABLE public.emergency_contacts
        ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;
      RAISE NOTICE 'Added is_active column';
    END IF;
    
    -- Add language if missing
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'emergency_contacts' 
      AND column_name = 'language'
    ) THEN
      ALTER TABLE public.emergency_contacts
        ADD COLUMN language TEXT NOT NULL DEFAULT 'en';
      RAISE NOTICE 'Added language column';
    END IF;
    
    -- Add created_at if missing
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'emergency_contacts' 
      AND column_name = 'created_at'
    ) THEN
      ALTER TABLE public.emergency_contacts
        ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
      RAISE NOTICE 'Added created_at column';
    END IF;
    
    -- Add updated_at if missing
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'emergency_contacts' 
      AND column_name = 'updated_at'
    ) THEN
      ALTER TABLE public.emergency_contacts
        ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
      RAISE NOTICE 'Added updated_at column';
    END IF;
  END IF;
END $$;

-- Step 3: Create indexes
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_company_id ON public.emergency_contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_site_id ON public.emergency_contacts(site_id);

-- Step 4: Enable RLS
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;

-- Step 5: Drop and recreate RLS policies
DROP POLICY IF EXISTS emergency_contacts_select ON public.emergency_contacts;
DROP POLICY IF EXISTS emergency_contacts_insert ON public.emergency_contacts;
DROP POLICY IF EXISTS emergency_contacts_update ON public.emergency_contacts;
DROP POLICY IF EXISTS emergency_contacts_delete ON public.emergency_contacts;

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

-- Step 6: Show final structure
SELECT 
  'Final table structure:' AS info,
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'emergency_contacts'
ORDER BY ordinal_position;

SELECT 'Done! Check the column list above to verify the structure.' AS result;
