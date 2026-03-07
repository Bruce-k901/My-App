-- Create Employee Site Assignments Table
-- This table tracks which employees can work at which sites and when
-- Allows one site to "borrow" employees from another site

-- This migration only runs if required tables exist
DO $$
BEGIN
  -- Check if required tables exist - exit early if they don't
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'companies'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'sites'
  ) THEN
    RAISE NOTICE 'companies, profiles, or sites tables do not exist - skipping employee_site_assignments migration';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Required tables found - proceeding with employee_site_assignments migration';
END $$;

-- Only proceed if required tables exist (checked above)
DO $$
BEGIN
  -- Check if required tables exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'companies'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'sites'
  ) THEN
    RETURN;
  END IF;

  EXECUTE $sql_table1$
    CREATE TABLE IF NOT EXISTS public.employee_site_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  home_site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  borrowed_site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  
  -- Date range for when this assignment is active
  start_date DATE NOT NULL,
  end_date DATE, -- NULL means permanent/ongoing assignment
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Notes
  notes TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id),
  
  -- Constraints
      CONSTRAINT employee_site_assignments_different_sites CHECK (home_site_id != borrowed_site_id),
      CONSTRAINT employee_site_assignments_valid_dates CHECK (end_date IS NULL OR end_date >= start_date)
    );
  $sql_table1$;

  -- Indexes
  CREATE INDEX IF NOT EXISTS idx_employee_site_assignments_company ON public.employee_site_assignments(company_id);
  CREATE INDEX IF NOT EXISTS idx_employee_site_assignments_profile ON public.employee_site_assignments(profile_id);
  CREATE INDEX IF NOT EXISTS idx_employee_site_assignments_borrowed_site ON public.employee_site_assignments(borrowed_site_id);
  CREATE INDEX IF NOT EXISTS idx_employee_site_assignments_dates ON public.employee_site_assignments(start_date, end_date);
  CREATE INDEX IF NOT EXISTS idx_employee_site_assignments_active ON public.employee_site_assignments(is_active) WHERE is_active = true;

  -- Updated_at trigger
  EXECUTE $sql_func1$
    CREATE OR REPLACE FUNCTION public.employee_site_assignments_set_updated_at()
    RETURNS TRIGGER LANGUAGE plpgsql AS $func$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $func$;
  $sql_func1$;

  -- Drop trigger if it exists, then create it
  DROP TRIGGER IF EXISTS trg_employee_site_assignments_updated_at ON public.employee_site_assignments;
  CREATE TRIGGER trg_employee_site_assignments_updated_at
    BEFORE UPDATE ON public.employee_site_assignments
    FOR EACH ROW
    EXECUTE FUNCTION public.employee_site_assignments_set_updated_at();

  -- RLS Policies
  ALTER TABLE public.employee_site_assignments ENABLE ROW LEVEL SECURITY;

  -- Drop policies if they exist (to make migration idempotent)
  DROP POLICY IF EXISTS "Users can view site assignments for their company" ON public.employee_site_assignments;
  DROP POLICY IF EXISTS "Managers can create site assignments for their company" ON public.employee_site_assignments;
  DROP POLICY IF EXISTS "Managers can update site assignments for their company" ON public.employee_site_assignments;
  DROP POLICY IF EXISTS "Managers can delete site assignments for their company" ON public.employee_site_assignments;

  -- Users can view assignments for their company
  CREATE POLICY "Users can view site assignments for their company"
    ON public.employee_site_assignments FOR SELECT
    USING (
      company_id IN (
        SELECT company_id FROM public.profiles WHERE id = auth.uid()
      )
    );

  -- Managers/Admins can insert assignments for their company
  CREATE POLICY "Managers can create site assignments for their company"
    ON public.employee_site_assignments FOR INSERT
    WITH CHECK (
      company_id IN (
        SELECT company_id FROM public.profiles WHERE id = auth.uid()
      )
      AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND LOWER(COALESCE(app_role::text, '')) IN ('admin', 'owner', 'manager', 'general manager', 'super admin')
      )
    );

  -- Managers/Admins can update assignments for their company
  CREATE POLICY "Managers can update site assignments for their company"
    ON public.employee_site_assignments FOR UPDATE
    USING (
      company_id IN (
        SELECT company_id FROM public.profiles WHERE id = auth.uid()
      )
      AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND LOWER(COALESCE(app_role::text, '')) IN ('admin', 'owner', 'manager', 'general manager', 'super admin')
      )
    );

  -- Managers/Admins can delete assignments for their company
  CREATE POLICY "Managers can delete site assignments for their company"
    ON public.employee_site_assignments FOR DELETE
    USING (
      company_id IN (
        SELECT company_id FROM public.profiles WHERE id = auth.uid()
      )
      AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND LOWER(COALESCE(app_role::text, '')) IN ('admin', 'owner', 'manager', 'general manager', 'super admin')
      )
    );

  -- Function to check if an employee is available at a site on a specific date
  EXECUTE $sql_func2$
    CREATE OR REPLACE FUNCTION public.is_employee_available_at_site(
      p_profile_id UUID,
      p_site_id UUID,
      p_date DATE
    )
    RETURNS BOOLEAN AS $func$
    BEGIN
      -- Check if employee's home site matches, or if there's an active assignment
      RETURN EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = p_profile_id
        AND (
          p.home_site = p_site_id
          OR EXISTS (
            SELECT 1
            FROM public.employee_site_assignments esa
            WHERE esa.profile_id = p_profile_id
            AND esa.borrowed_site_id = p_site_id
            AND esa.is_active = true
            AND esa.start_date <= p_date
            AND (esa.end_date IS NULL OR esa.end_date >= p_date)
          )
        )
      );
    END;
    $func$ LANGUAGE plpgsql;
  $sql_func2$;

END $$;


