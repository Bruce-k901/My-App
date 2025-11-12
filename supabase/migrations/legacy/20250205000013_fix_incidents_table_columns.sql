-- ============================================================================
-- Migration: 20250205000013_fix_incidents_table_columns.sql
-- Description: Adds missing columns to incidents table if they don't exist
-- ============================================================================

-- Add severity column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'incidents' 
    AND column_name = 'severity'
  ) THEN
    ALTER TABLE public.incidents 
    ADD COLUMN severity TEXT NOT NULL DEFAULT 'near_miss' 
    CHECK (severity IN ('near_miss', 'minor', 'moderate', 'major', 'critical', 'fatality'));
    
    -- Remove the default after adding (since we want it to be NOT NULL going forward)
    ALTER TABLE public.incidents 
    ALTER COLUMN severity DROP DEFAULT;
  END IF;
END $$;

-- Add other potentially missing columns
DO $$ 
BEGIN
  -- Add incident_type if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'incidents' 
    AND column_name = 'incident_type'
  ) THEN
    ALTER TABLE public.incidents 
    ADD COLUMN incident_type TEXT;
  END IF;

  -- Add location if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'incidents' 
    AND column_name = 'location'
  ) THEN
    ALTER TABLE public.incidents 
    ADD COLUMN location TEXT;
  END IF;

  -- Add incident_date if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'incidents' 
    AND column_name = 'incident_date'
  ) THEN
    ALTER TABLE public.incidents 
    ADD COLUMN incident_date TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;

  -- Add reported_date if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'incidents' 
    AND column_name = 'reported_date'
  ) THEN
    ALTER TABLE public.incidents 
    ADD COLUMN reported_date TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;

  -- Add casualties if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'incidents' 
    AND column_name = 'casualties'
  ) THEN
    ALTER TABLE public.incidents 
    ADD COLUMN casualties JSONB DEFAULT '[]'::jsonb;
  END IF;

  -- Add witnesses if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'incidents' 
    AND column_name = 'witnesses'
  ) THEN
    ALTER TABLE public.incidents 
    ADD COLUMN witnesses JSONB DEFAULT '[]'::jsonb;
  END IF;

  -- Add emergency_services_called if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'incidents' 
    AND column_name = 'emergency_services_called'
  ) THEN
    ALTER TABLE public.incidents 
    ADD COLUMN emergency_services_called BOOLEAN DEFAULT FALSE;
  END IF;

  -- Add emergency_services_type if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'incidents' 
    AND column_name = 'emergency_services_type'
  ) THEN
    ALTER TABLE public.incidents 
    ADD COLUMN emergency_services_type TEXT;
  END IF;

  -- Add first_aid_provided if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'incidents' 
    AND column_name = 'first_aid_provided'
  ) THEN
    ALTER TABLE public.incidents 
    ADD COLUMN first_aid_provided BOOLEAN DEFAULT FALSE;
  END IF;

  -- Add scene_preserved if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'incidents' 
    AND column_name = 'scene_preserved'
  ) THEN
    ALTER TABLE public.incidents 
    ADD COLUMN scene_preserved BOOLEAN DEFAULT FALSE;
  END IF;

  -- Add riddor_reportable if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'incidents' 
    AND column_name = 'riddor_reportable'
  ) THEN
    ALTER TABLE public.incidents 
    ADD COLUMN riddor_reportable BOOLEAN DEFAULT FALSE;
  END IF;

  -- Add riddor_reported if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'incidents' 
    AND column_name = 'riddor_reported'
  ) THEN
    ALTER TABLE public.incidents 
    ADD COLUMN riddor_reported BOOLEAN DEFAULT FALSE;
  END IF;

  -- Add riddor_reported_date if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'incidents' 
    AND column_name = 'riddor_reported_date'
  ) THEN
    ALTER TABLE public.incidents 
    ADD COLUMN riddor_reported_date TIMESTAMPTZ;
  END IF;

  -- Add riddor_reference if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'incidents' 
    AND column_name = 'riddor_reference'
  ) THEN
    ALTER TABLE public.incidents 
    ADD COLUMN riddor_reference TEXT;
  END IF;

  -- Add photos if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'incidents' 
    AND column_name = 'photos'
  ) THEN
    ALTER TABLE public.incidents 
    ADD COLUMN photos TEXT[];
  END IF;

  -- Add documents if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'incidents' 
    AND column_name = 'documents'
  ) THEN
    ALTER TABLE public.incidents 
    ADD COLUMN documents TEXT[];
  END IF;

  -- Add immediate_actions_taken if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'incidents' 
    AND column_name = 'immediate_actions_taken'
  ) THEN
    ALTER TABLE public.incidents 
    ADD COLUMN immediate_actions_taken TEXT;
  END IF;

  -- Add follow_up_tasks if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'incidents' 
    AND column_name = 'follow_up_tasks'
  ) THEN
    ALTER TABLE public.incidents 
    ADD COLUMN follow_up_tasks JSONB DEFAULT '[]'::jsonb;
  END IF;

  -- Add investigation_notes if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'incidents' 
    AND column_name = 'investigation_notes'
  ) THEN
    ALTER TABLE public.incidents 
    ADD COLUMN investigation_notes TEXT;
  END IF;

  -- Add root_cause if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'incidents' 
    AND column_name = 'root_cause'
  ) THEN
    ALTER TABLE public.incidents 
    ADD COLUMN root_cause TEXT;
  END IF;

  -- Add corrective_actions if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'incidents' 
    AND column_name = 'corrective_actions'
  ) THEN
    ALTER TABLE public.incidents 
    ADD COLUMN corrective_actions TEXT;
  END IF;

  -- Add source_task_id if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'incidents' 
    AND column_name = 'source_task_id'
  ) THEN
    ALTER TABLE public.incidents 
    ADD COLUMN source_task_id UUID REFERENCES public.checklist_tasks(id) ON DELETE SET NULL;
  END IF;

  -- Add source_template_id if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'incidents' 
    AND column_name = 'source_template_id'
  ) THEN
    ALTER TABLE public.incidents 
    ADD COLUMN source_template_id UUID REFERENCES public.task_templates(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON public.incidents(severity);
CREATE INDEX IF NOT EXISTS idx_incidents_riddor ON public.incidents(riddor_reportable) WHERE riddor_reportable = TRUE;

-- Verify the table structure
DO $$
DECLARE
  severity_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'incidents' 
    AND column_name = 'severity'
  ) INTO severity_exists;
  
  IF severity_exists THEN
    RAISE NOTICE '✅ Incidents table columns verified successfully';
  ELSE
    RAISE WARNING '⚠️ Severity column still missing - check migration errors';
  END IF;
END $$;




