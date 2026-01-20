-- ============================================================================
-- Migration: Fix Emergency Contacts company_id Column
-- Description: Adds company_id column to emergency_contacts table if it doesn't exist
--              This fixes the error: "emergency_contacts.company_id does not exist"
-- Note: This migration will be skipped if companies, sites, or profiles tables don't exist yet
-- ============================================================================

-- Check if company_id column exists, if not add it
DO $$
BEGIN
  -- Only proceed if companies table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'companies') THEN
    -- Check if the table exists
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
        -- Add company_id column (nullable first, without foreign key initially)
        ALTER TABLE public.emergency_contacts
          ADD COLUMN company_id UUID;
        
        -- Add foreign key constraint conditionally
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'emergency_contacts_company_id_fkey' 
          AND table_schema = 'public' 
          AND table_name = 'emergency_contacts'
        ) THEN
          ALTER TABLE public.emergency_contacts
          ADD CONSTRAINT emergency_contacts_company_id_fkey
          FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
        END IF;
      
        -- Populate company_id from site_id if sites have company_id
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sites') THEN
          UPDATE public.emergency_contacts ec
          SET company_id = s.company_id
          FROM public.sites s
          WHERE ec.site_id = s.id
            AND ec.company_id IS NULL;
        END IF;
      
        -- Create index
        CREATE INDEX IF NOT EXISTS idx_emergency_contacts_company_id 
          ON public.emergency_contacts(company_id);
        
        RAISE NOTICE 'Added company_id column to emergency_contacts table';
      ELSE
        RAISE NOTICE 'company_id column already exists in emergency_contacts table';
      END IF;
    ELSE
      RAISE NOTICE 'emergency_contacts table does not exist. Creating it now...';
      
      -- Create the table with company_id (without foreign keys initially)
      CREATE TABLE public.emergency_contacts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL,
        site_id UUID,
      
      -- Contact Information
      contact_type TEXT NOT NULL CHECK (contact_type IN ('first_aider', 'manager', 'emergency_services', 'utility', 'other')),
      name TEXT NOT NULL,
      phone_number TEXT NOT NULL,
      email TEXT,
      role_title TEXT,
      notes TEXT,
      
      -- Display Settings
      display_order INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT TRUE,
      language TEXT DEFAULT 'en',
      
        -- Metadata
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_by UUID,
        updated_by UUID
      );
      
      -- Add foreign keys conditionally
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'emergency_contacts_company_id_fkey' 
        AND table_schema = 'public' 
        AND table_name = 'emergency_contacts'
      ) THEN
        ALTER TABLE public.emergency_contacts
        ADD CONSTRAINT emergency_contacts_company_id_fkey
        FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
      END IF;

      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sites') THEN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'emergency_contacts_site_id_fkey' 
          AND table_schema = 'public' 
          AND table_name = 'emergency_contacts'
        ) THEN
          ALTER TABLE public.emergency_contacts
          ADD CONSTRAINT emergency_contacts_site_id_fkey
          FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE CASCADE;
        END IF;
      END IF;

      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'emergency_contacts_created_by_fkey' 
          AND table_schema = 'public' 
          AND table_name = 'emergency_contacts'
        ) THEN
          ALTER TABLE public.emergency_contacts
          ADD CONSTRAINT emergency_contacts_created_by_fkey
          FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'emergency_contacts_updated_by_fkey' 
          AND table_schema = 'public' 
          AND table_name = 'emergency_contacts'
        ) THEN
          ALTER TABLE public.emergency_contacts
          ADD CONSTRAINT emergency_contacts_updated_by_fkey
          FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
        END IF;
      END IF;
      
      -- Create indexes
      CREATE INDEX idx_emergency_contacts_company_id ON public.emergency_contacts(company_id);
      CREATE INDEX idx_emergency_contacts_site_id ON public.emergency_contacts(site_id);
      CREATE INDEX idx_emergency_contacts_active ON public.emergency_contacts(company_id, site_id, is_active) WHERE is_active = TRUE;
      
      -- Enable RLS
      ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;
      
      -- Create RLS policies (only if profiles table exists)
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
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
      END IF;
      
      -- Create updated_at trigger
      CREATE OR REPLACE FUNCTION update_emergency_contacts_updated_at()
      RETURNS TRIGGER AS $function$
      BEGIN
        NEW.updated_at = NOW();
        NEW.updated_by = auth.uid();
        RETURN NEW;
      END;
      $function$ LANGUAGE plpgsql;
      
      CREATE TRIGGER update_emergency_contacts_timestamp
        BEFORE UPDATE ON public.emergency_contacts
        FOR EACH ROW
        EXECUTE FUNCTION update_emergency_contacts_updated_at();
      
      RAISE NOTICE 'Created emergency_contacts table with company_id';
    END IF;
  ELSE
    RAISE NOTICE '⚠️ companies table does not exist yet - skipping emergency_contacts migration';
  END IF;
END $$;

-- Update RLS policies to use company_id (if table exists and policies need updating)
DO $$
BEGIN
  -- Only update policies if table exists, company_id column exists, and profiles table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles')
     AND EXISTS (
       SELECT 1 FROM information_schema.columns 
       WHERE table_schema = 'public' 
       AND table_name = 'emergency_contacts' 
       AND column_name = 'company_id'
     ) THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS emergency_contacts_select ON public.emergency_contacts;
    DROP POLICY IF EXISTS emergency_contacts_insert ON public.emergency_contacts;
    DROP POLICY IF EXISTS emergency_contacts_update ON public.emergency_contacts;
    DROP POLICY IF EXISTS emergency_contacts_delete ON public.emergency_contacts;
    
    -- Recreate policies with company_id
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
    
    RAISE NOTICE 'Updated RLS policies to use company_id';
  END IF;
END $$;

