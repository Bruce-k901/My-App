-- ============================================================================
-- Migration: 20250205000014_verify_incidents_table.sql
-- Description: Verifies incidents table exists and has correct structure
-- ============================================================================

-- Check if table exists, if not create it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'incidents'
  ) THEN
    -- Table doesn't exist, create it
    CREATE TABLE public.incidents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
      site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,
      
      -- Incident Details
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      incident_type TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'near_miss' CHECK (severity IN ('near_miss', 'minor', 'moderate', 'major', 'critical', 'fatality')),
      
      -- Location & Time
      location TEXT,
      incident_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      reported_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      reported_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
      
      -- Casualty Information
      casualties JSONB DEFAULT '[]'::jsonb,
      
      -- Witness Information
      witnesses JSONB DEFAULT '[]'::jsonb,
      
      -- Emergency Response
      emergency_services_called BOOLEAN DEFAULT FALSE,
      emergency_services_type TEXT,
      first_aid_provided BOOLEAN DEFAULT FALSE,
      scene_preserved BOOLEAN DEFAULT FALSE,
      
      -- RIDDOR Assessment
      riddor_reportable BOOLEAN DEFAULT FALSE,
      riddor_reported BOOLEAN DEFAULT FALSE,
      riddor_reported_date TIMESTAMPTZ,
      riddor_reference TEXT,
      
      -- Evidence
      photos TEXT[],
      documents TEXT[],
      
      -- Immediate Actions
      immediate_actions_taken TEXT,
      
      -- Follow-up Tasks
      follow_up_tasks JSONB DEFAULT '[]'::jsonb,
      
      -- Status
      status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'closed')),
      
      -- Investigation
      investigation_notes TEXT,
      root_cause TEXT,
      corrective_actions TEXT,
      
      -- Metadata
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      
      -- Foreign key to task if created from a task template
      source_task_id UUID REFERENCES public.checklist_tasks(id) ON DELETE SET NULL,
      source_template_id UUID REFERENCES public.task_templates(id) ON DELETE SET NULL
    );
    
    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_incidents_company ON public.incidents(company_id);
    CREATE INDEX IF NOT EXISTS idx_incidents_site ON public.incidents(site_id);
    CREATE INDEX IF NOT EXISTS idx_incidents_status ON public.incidents(status);
    CREATE INDEX IF NOT EXISTS idx_incidents_severity ON public.incidents(severity);
    CREATE INDEX IF NOT EXISTS idx_incidents_date ON public.incidents(incident_date DESC);
    CREATE INDEX IF NOT EXISTS idx_incidents_reported_date ON public.incidents(reported_date DESC);
    CREATE INDEX IF NOT EXISTS idx_incidents_riddor ON public.incidents(riddor_reportable) WHERE riddor_reportable = TRUE;
    
    -- Enable RLS
    ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
    
    -- Create RLS policies
    DROP POLICY IF EXISTS "Users can view incidents for their company" ON public.incidents;
    CREATE POLICY "Users can view incidents for their company"
      ON public.incidents FOR SELECT
      USING (
        company_id IN (
          SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
      );
    
    DROP POLICY IF EXISTS "Users can insert incidents for their company" ON public.incidents;
    CREATE POLICY "Users can insert incidents for their company"
      ON public.incidents FOR INSERT
      WITH CHECK (
        company_id IN (
          SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
      );
    
    DROP POLICY IF EXISTS "Users can update incidents for their company" ON public.incidents;
    CREATE POLICY "Users can update incidents for their company"
      ON public.incidents FOR UPDATE
      USING (
        company_id IN (
          SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
      );
  END IF;
END $$;

-- Verify reported_date column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'incidents' 
    AND column_name = 'reported_date'
  ) THEN
    -- Add reported_date if missing
    ALTER TABLE public.incidents 
    ADD COLUMN reported_date TIMESTAMPTZ NOT NULL DEFAULT NOW();
    
    -- If reported_at exists, copy data and drop it
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'incidents' 
      AND column_name = 'reported_at'
    ) THEN
      UPDATE public.incidents 
      SET reported_date = reported_at 
      WHERE reported_date IS NULL;
      
      ALTER TABLE public.incidents 
      DROP COLUMN reported_at;
    END IF;
  END IF;
END $$;

-- Ensure index exists for reported_date
CREATE INDEX IF NOT EXISTS idx_incidents_reported_date ON public.incidents(reported_date DESC);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.incidents TO authenticated;





