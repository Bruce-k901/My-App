-- Consolidate contractors: Remove maintenance_contractors, make contractors a real table with contact_name
-- This migration:
-- 1. Drops the contractors view (if it exists)
-- 2. Creates contractors as a real table (if it doesn't exist) or alters existing table
-- 3. Adds contact_name column if missing
-- 4. Migrates data from maintenance_contractors to contractors
-- 5. Drops maintenance_contractors table

-- Step 1: Drop triggers and check if contractors is a view or table
DROP TRIGGER IF EXISTS contractors_insert_trigger ON public.contractors;
DROP TRIGGER IF EXISTS contractors_update_trigger ON public.contractors;

-- Check if contractors is a view and drop it, or if it's a table, we'll work with it
DO $$
BEGIN
  -- Check if it's a view
  IF EXISTS (
    SELECT FROM information_schema.views 
    WHERE table_schema = 'public' 
    AND table_name = 'contractors'
  ) THEN
    DROP VIEW IF EXISTS public.contractors CASCADE;
    RAISE NOTICE 'Dropped contractors view';
  ELSE
    RAISE NOTICE 'contractors is already a table, proceeding with alterations';
  END IF;
END $$;

-- Step 2: Check if contractors table exists, if not create it
-- If it exists, we'll just add the missing columns
DO $$
BEGIN
  -- Check if contractors table exists
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'contractors'
  ) THEN
    -- Create contractors table
    CREATE TABLE public.contractors (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
      category text NOT NULL,
      name text NOT NULL,
      contact_name text,
      email text,
      phone text,
      ooh_phone text,
      ooh text,
      address text,
      postcode text,
      website text,
      hourly_rate numeric,
      callout_fee numeric,
      region text,
      contract_start date,
      contract_expiry date,
      contract_file text,
      notes text,
      is_active boolean DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  ELSE
    -- Table exists, add missing columns if they don't exist
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'contractors' 
      AND column_name = 'contact_name'
    ) THEN
      ALTER TABLE public.contractors ADD COLUMN contact_name text;
    END IF;
    
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'contractors' 
      AND column_name = 'address'
    ) THEN
      ALTER TABLE public.contractors ADD COLUMN address text;
    END IF;
    
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'contractors' 
      AND column_name = 'ooh_phone'
    ) THEN
      ALTER TABLE public.contractors ADD COLUMN ooh_phone text;
    END IF;
    
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'contractors' 
      AND column_name = 'ooh'
    ) THEN
      ALTER TABLE public.contractors ADD COLUMN ooh text;
    END IF;
    
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'contractors' 
      AND column_name = 'contract_start'
    ) THEN
      ALTER TABLE public.contractors ADD COLUMN contract_start date;
    END IF;
    
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'contractors' 
      AND column_name = 'contract_expiry'
    ) THEN
      ALTER TABLE public.contractors ADD COLUMN contract_expiry date;
    END IF;
    
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'contractors' 
      AND column_name = 'contract_file'
    ) THEN
      ALTER TABLE public.contractors ADD COLUMN contract_file text;
    END IF;
    
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'contractors' 
      AND column_name = 'is_active'
    ) THEN
      ALTER TABLE public.contractors ADD COLUMN is_active boolean DEFAULT true;
    END IF;
    
    -- Add postcode, website, hourly_rate, callout_fee if missing
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'contractors' 
      AND column_name = 'postcode'
    ) THEN
      ALTER TABLE public.contractors ADD COLUMN postcode text;
    END IF;
    
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'contractors' 
      AND column_name = 'website'
    ) THEN
      ALTER TABLE public.contractors ADD COLUMN website text;
    END IF;
    
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'contractors' 
      AND column_name = 'hourly_rate'
    ) THEN
      ALTER TABLE public.contractors ADD COLUMN hourly_rate numeric;
    END IF;
    
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'contractors' 
      AND column_name = 'callout_fee'
    ) THEN
      ALTER TABLE public.contractors ADD COLUMN callout_fee numeric;
    END IF;
    
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'contractors' 
      AND column_name = 'region'
    ) THEN
      ALTER TABLE public.contractors ADD COLUMN region text;
    END IF;
  END IF;
END $$;

-- Step 3: Migrate data from maintenance_contractors to contractors (if maintenance_contractors exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'maintenance_contractors'
  ) THEN
    -- Insert data from maintenance_contractors that doesn't already exist in contractors
    INSERT INTO public.contractors (
      id, company_id, category, name, contact_name, email, phone,
      ooh_phone, ooh, address, notes, created_at, updated_at, is_active
    )
    SELECT 
      id, company_id, category, name, contact_name, email, phone,
      emergency_phone, emergency_phone, address, notes, created_at, updated_at, true
    FROM public.maintenance_contractors mc
    WHERE NOT EXISTS (
      SELECT 1 FROM public.contractors c WHERE c.id = mc.id
    )
    ON CONFLICT (id) DO NOTHING;
    
    RAISE NOTICE 'Migrated data from maintenance_contractors to contractors';
  END IF;
END $$;

-- Step 4: Set up updated_at trigger
CREATE OR REPLACE FUNCTION public.contractors_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_contractors_updated ON public.contractors;
CREATE TRIGGER trg_contractors_updated
BEFORE UPDATE ON public.contractors
FOR EACH ROW
EXECUTE FUNCTION public.contractors_set_updated_at();

-- Step 5: Enable RLS
ALTER TABLE public.contractors ENABLE ROW LEVEL SECURITY;

-- Step 6: Drop existing policies and create new ones
DROP POLICY IF EXISTS contractors_select_company ON public.contractors;
DROP POLICY IF EXISTS contractors_insert_company ON public.contractors;
DROP POLICY IF EXISTS contractors_update_company ON public.contractors;
DROP POLICY IF EXISTS contractors_delete_company ON public.contractors;

-- Select policy: Any company member can read
CREATE POLICY contractors_select_company
  ON public.contractors
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = contractors.company_id
    )
    OR EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = contractors.company_id
        AND (c.user_id = auth.uid() OR c.created_by = auth.uid())
    )
  );

-- Insert policy: Owners/admins/managers can insert
CREATE POLICY contractors_insert_company
  ON public.contractors
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = contractors.company_id
        AND LOWER(p.app_role::text) IN ('owner', 'admin', 'manager')
    )
  );

-- Update policy: Owners/admins/managers can update
CREATE POLICY contractors_update_company
  ON public.contractors
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = contractors.company_id
        AND LOWER(p.app_role::text) IN ('owner', 'admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = contractors.company_id
        AND LOWER(p.app_role::text) IN ('owner', 'admin', 'manager')
    )
  );

-- Delete policy: Owners/admins/managers can delete
CREATE POLICY contractors_delete_company
  ON public.contractors
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = contractors.company_id
        AND LOWER(p.app_role::text) IN ('owner', 'admin', 'manager')
    )
  );

-- Step 7: Create indexes
CREATE INDEX IF NOT EXISTS idx_contractors_company ON public.contractors(company_id);
CREATE INDEX IF NOT EXISTS idx_contractors_name ON public.contractors(name);
CREATE INDEX IF NOT EXISTS idx_contractors_category ON public.contractors(category);

-- Step 8: Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contractors TO authenticated;

-- Step 9: Drop maintenance_contractors table (after migration)
-- WARNING: Only do this if you're sure all data has been migrated!
-- Uncomment the next line when ready:
-- DROP TABLE IF EXISTS public.maintenance_contractors CASCADE;

-- For now, we'll just leave a note - uncomment the DROP when you've verified the migration
DO $$
BEGIN
  RAISE NOTICE 'Migration complete. contractors table is now ready with contact_name column.';
  RAISE NOTICE 'maintenance_contractors table still exists. Verify data migration, then run: DROP TABLE IF EXISTS public.maintenance_contractors CASCADE;';
END $$;

