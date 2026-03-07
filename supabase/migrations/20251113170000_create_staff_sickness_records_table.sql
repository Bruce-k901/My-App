-- Create staff_sickness_records table for logging staff illness and exclusions
-- Note: This migration will be skipped if required tables don't exist yet

DO $$
BEGIN
  -- Only proceed if required tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'companies')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN

    -- Create table with foreign keys
    -- Note: site_id foreign key is conditional - added separately if sites table exists
    CREATE TABLE IF NOT EXISTS public.staff_sickness_records (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
      site_id UUID, -- Foreign key added conditionally below
      staff_member_name TEXT NOT NULL,
      staff_member_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
      illness_onset_date DATE NOT NULL,
      illness_onset_time TIME,
      symptoms TEXT NOT NULL,
      exclusion_period_start DATE NOT NULL,
      exclusion_period_end DATE,
      return_to_work_date DATE,
      medical_clearance_required BOOLEAN DEFAULT FALSE,
      medical_clearance_received BOOLEAN DEFAULT FALSE,
      manager_notified BOOLEAN DEFAULT FALSE,
      food_handling_restricted BOOLEAN DEFAULT TRUE,
      symptomatic_in_food_areas BOOLEAN DEFAULT FALSE,
      reported_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
      reported_date DATE NOT NULL,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cleared', 'closed')),
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Add sites foreign key constraint if sites table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sites') THEN
      -- Check if constraint already exists before adding
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_schema = 'public'
          AND table_name = 'staff_sickness_records'
          AND constraint_name = 'staff_sickness_records_site_id_fkey'
      ) THEN
        ALTER TABLE public.staff_sickness_records
          ADD CONSTRAINT staff_sickness_records_site_id_fkey
          FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE SET NULL;
      END IF;
    END IF;

    -- Create indexes for faster queries
    CREATE INDEX IF NOT EXISTS idx_staff_sickness_records_company_id ON public.staff_sickness_records(company_id);
    CREATE INDEX IF NOT EXISTS idx_staff_sickness_records_site_id ON public.staff_sickness_records(site_id);
    CREATE INDEX IF NOT EXISTS idx_staff_sickness_records_status ON public.staff_sickness_records(status);
    CREATE INDEX IF NOT EXISTS idx_staff_sickness_records_illness_onset_date ON public.staff_sickness_records(illness_onset_date DESC);

    -- Enable RLS
    ALTER TABLE public.staff_sickness_records ENABLE ROW LEVEL SECURITY;

    -- RLS Policies
    DROP POLICY IF EXISTS "Users can view staff sickness records for their company" ON public.staff_sickness_records;
    CREATE POLICY "Users can view staff sickness records for their company"
      ON public.staff_sickness_records
      FOR SELECT
      USING (
        company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
      );

    DROP POLICY IF EXISTS "Users can insert staff sickness records for their company" ON public.staff_sickness_records;
    CREATE POLICY "Users can insert staff sickness records for their company"
      ON public.staff_sickness_records
      FOR INSERT
      WITH CHECK (
        company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
      );

    DROP POLICY IF EXISTS "Users can update staff sickness records for their company" ON public.staff_sickness_records;
    CREATE POLICY "Users can update staff sickness records for their company"
      ON public.staff_sickness_records
      FOR UPDATE
      USING (
        company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
      );

    DROP POLICY IF EXISTS "Users can delete staff sickness records for their company" ON public.staff_sickness_records;
    CREATE POLICY "Users can delete staff sickness records for their company"
      ON public.staff_sickness_records
      FOR DELETE
      USING (
        company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
      );

    -- Create updated_at trigger function
    CREATE OR REPLACE FUNCTION update_staff_sickness_records_updated_at()
    RETURNS TRIGGER AS $func$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;

    -- Create trigger
    DROP TRIGGER IF EXISTS update_staff_sickness_records_updated_at ON public.staff_sickness_records;
    CREATE TRIGGER update_staff_sickness_records_updated_at
      BEFORE UPDATE ON public.staff_sickness_records
      FOR EACH ROW
      EXECUTE FUNCTION update_staff_sickness_records_updated_at();

    RAISE NOTICE 'Created staff_sickness_records table';

  ELSE
    RAISE NOTICE '⚠️ Required tables (companies, profiles) do not exist yet - skipping staff_sickness_records';
  END IF;
END $$;




