-- ============================================================================
-- Migration: 20250223000002_add_missing_incidents_columns.sql
-- Description: Adds missing columns to incidents table for rich incident reporting
-- ============================================================================

-- Add title column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'incidents' 
    AND column_name = 'title'
  ) THEN
    ALTER TABLE public.incidents 
    ADD COLUMN title TEXT;
    
    -- Update existing rows to have a title based on incident_type and severity
    UPDATE public.incidents 
    SET title = COALESCE(
      incident_type || ' - ' || severity,
      incident_type || ' Incident',
      'Incident Report'
    )
    WHERE title IS NULL;
    
    -- Make it NOT NULL after populating existing data
    ALTER TABLE public.incidents 
    ALTER COLUMN title SET NOT NULL;
    
    COMMENT ON COLUMN public.incidents.title IS 'Title/heading for the incident report';
  END IF;
END $$;

-- Add reported_by column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'incidents' 
    AND column_name = 'reported_by'
  ) THEN
    ALTER TABLE public.incidents 
    ADD COLUMN reported_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
    
    COMMENT ON COLUMN public.incidents.reported_by IS 'User who reported the incident (references profiles.id)';
  END IF;
END $$;

-- Add incident_type column if it doesn't exist (might be named 'type' in old schema)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'incidents' 
    AND column_name = 'type'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'incidents' 
    AND column_name = 'incident_type'
  ) THEN
    -- Rename 'type' to 'incident_type' for consistency
    ALTER TABLE public.incidents 
    RENAME COLUMN type TO incident_type;
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'incidents' 
    AND column_name = 'incident_type'
  ) THEN
    ALTER TABLE public.incidents 
    ADD COLUMN incident_type TEXT;
    
    COMMENT ON COLUMN public.incidents.incident_type IS 'Type of incident: slip_trip, cut, burn, fall, electrical, fire, food_poisoning, other';
  END IF;
END $$;

-- Add incident_date column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'incidents' 
    AND column_name = 'incident_date'
  ) THEN
    ALTER TABLE public.incidents 
    ADD COLUMN incident_date TIMESTAMPTZ DEFAULT NOW();
    
    -- Populate from created_at if it exists
    UPDATE public.incidents 
    SET incident_date = created_at 
    WHERE incident_date IS NULL AND created_at IS NOT NULL;
    
    ALTER TABLE public.incidents 
    ALTER COLUMN incident_date SET NOT NULL;
    ALTER TABLE public.incidents 
    ALTER COLUMN incident_date SET DEFAULT NOW();
    
    COMMENT ON COLUMN public.incidents.incident_date IS 'Date and time when the incident occurred';
  END IF;
END $$;

-- Add reported_date column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'incidents' 
    AND column_name = 'reported_date'
  ) THEN
    ALTER TABLE public.incidents 
    ADD COLUMN reported_date TIMESTAMPTZ DEFAULT NOW();
    
    -- Populate from created_at if it exists
    UPDATE public.incidents 
    SET reported_date = created_at 
    WHERE reported_date IS NULL AND created_at IS NOT NULL;
    
    ALTER TABLE public.incidents 
    ALTER COLUMN reported_date SET NOT NULL;
    ALTER TABLE public.incidents 
    ALTER COLUMN reported_date SET DEFAULT NOW();
    
    COMMENT ON COLUMN public.incidents.reported_date IS 'Date and time when the incident was reported';
  END IF;
END $$;

-- Add location column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'incidents' 
    AND column_name = 'location'
  ) THEN
    ALTER TABLE public.incidents 
    ADD COLUMN location TEXT;
    
    COMMENT ON COLUMN public.incidents.location IS 'Location where the incident occurred';
  END IF;
END $$;

-- Add casualties column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'incidents' 
    AND column_name = 'casualties'
  ) THEN
    ALTER TABLE public.incidents 
    ADD COLUMN casualties JSONB DEFAULT '[]'::jsonb;
    
    COMMENT ON COLUMN public.incidents.casualties IS 'JSONB array of casualty information: {name, age, injury_type, severity, treatment_required}';
  END IF;
END $$;

-- Add witnesses column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'incidents' 
    AND column_name = 'witnesses'
  ) THEN
    ALTER TABLE public.incidents 
    ADD COLUMN witnesses JSONB DEFAULT '[]'::jsonb;
    
    COMMENT ON COLUMN public.incidents.witnesses IS 'JSONB array of witness information: {name, contact, statement}';
  END IF;
END $$;

-- Add emergency_services_called column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'incidents' 
    AND column_name = 'emergency_services_called'
  ) THEN
    ALTER TABLE public.incidents 
    ADD COLUMN emergency_services_called BOOLEAN DEFAULT FALSE;
    
    COMMENT ON COLUMN public.incidents.emergency_services_called IS 'Whether emergency services were called';
  END IF;
END $$;

-- Add emergency_services_type column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'incidents' 
    AND column_name = 'emergency_services_type'
  ) THEN
    ALTER TABLE public.incidents 
    ADD COLUMN emergency_services_type TEXT;
    
    COMMENT ON COLUMN public.incidents.emergency_services_type IS 'Type of emergency services called: ambulance, fire, police, none';
  END IF;
END $$;

-- Add first_aid_provided column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'incidents' 
    AND column_name = 'first_aid_provided'
  ) THEN
    ALTER TABLE public.incidents 
    ADD COLUMN first_aid_provided BOOLEAN DEFAULT FALSE;
    
    COMMENT ON COLUMN public.incidents.first_aid_provided IS 'Whether first aid was provided at the scene';
  END IF;
END $$;

-- Add scene_preserved column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'incidents' 
    AND column_name = 'scene_preserved'
  ) THEN
    ALTER TABLE public.incidents 
    ADD COLUMN scene_preserved BOOLEAN DEFAULT FALSE;
    
    COMMENT ON COLUMN public.incidents.scene_preserved IS 'Whether the scene was preserved for investigation';
  END IF;
END $$;

-- Add immediate_actions_taken column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'incidents' 
    AND column_name = 'immediate_actions_taken'
  ) THEN
    ALTER TABLE public.incidents 
    ADD COLUMN immediate_actions_taken TEXT;
    
    COMMENT ON COLUMN public.incidents.immediate_actions_taken IS 'Description of immediate actions taken in response to the incident';
  END IF;
END $$;

-- Add photos column if it doesn't exist (might be photo_url in old schema)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'incidents' 
    AND column_name = 'photo_url'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'incidents' 
    AND column_name = 'photos'
  ) THEN
    -- Convert single photo_url to photos array
    ALTER TABLE public.incidents 
    ADD COLUMN photos TEXT[] DEFAULT '{}'::TEXT[];
    
    -- Migrate existing photo_url data
    UPDATE public.incidents 
    SET photos = ARRAY[photo_url] 
    WHERE photo_url IS NOT NULL AND photo_url != '';
    
    COMMENT ON COLUMN public.incidents.photos IS 'Array of photo URLs for the incident';
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'incidents' 
    AND column_name = 'photos'
  ) THEN
    ALTER TABLE public.incidents 
    ADD COLUMN photos TEXT[] DEFAULT '{}'::TEXT[];
    
    COMMENT ON COLUMN public.incidents.photos IS 'Array of photo URLs for the incident';
  END IF;
END $$;

-- Add documents column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'incidents' 
    AND column_name = 'documents'
  ) THEN
    ALTER TABLE public.incidents 
    ADD COLUMN documents TEXT[] DEFAULT '{}'::TEXT[];
    
    COMMENT ON COLUMN public.incidents.documents IS 'Array of document URLs for the incident';
  END IF;
END $$;

-- Add riddor_reportable column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'incidents' 
    AND column_name = 'riddor_reportable'
  ) THEN
    ALTER TABLE public.incidents 
    ADD COLUMN riddor_reportable BOOLEAN DEFAULT FALSE;
    
    COMMENT ON COLUMN public.incidents.riddor_reportable IS 'Whether this incident is RIDDOR reportable';
  END IF;
END $$;

-- Add riddor_reported column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'incidents' 
    AND column_name = 'riddor_reported'
  ) THEN
    ALTER TABLE public.incidents 
    ADD COLUMN riddor_reported BOOLEAN DEFAULT FALSE;
    
    COMMENT ON COLUMN public.incidents.riddor_reported IS 'Whether the RIDDOR report has been submitted';
  END IF;
END $$;

-- Add riddor_reported_date column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'incidents' 
    AND column_name = 'riddor_reported_date'
  ) THEN
    ALTER TABLE public.incidents 
    ADD COLUMN riddor_reported_date TIMESTAMPTZ;
    
    COMMENT ON COLUMN public.incidents.riddor_reported_date IS 'Date when the RIDDOR report was submitted';
  END IF;
END $$;

-- Add riddor_reference column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'incidents' 
    AND column_name = 'riddor_reference'
  ) THEN
    ALTER TABLE public.incidents 
    ADD COLUMN riddor_reference TEXT;
    
    COMMENT ON COLUMN public.incidents.riddor_reference IS 'Reference number from the RIDDOR report submission';
  END IF;
END $$;

-- Add follow_up_tasks column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'incidents' 
    AND column_name = 'follow_up_tasks'
  ) THEN
    ALTER TABLE public.incidents 
    ADD COLUMN follow_up_tasks JSONB DEFAULT '[]'::jsonb;
    
    COMMENT ON COLUMN public.incidents.follow_up_tasks IS 'JSONB array of task IDs created as follow-up actions from this incident';
  END IF;
END $$;

-- Add investigation_notes column if it doesn't exist (might be resolution_notes in old schema)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'incidents' 
    AND column_name = 'resolution_notes'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'incidents' 
    AND column_name = 'investigation_notes'
  ) THEN
    -- Copy resolution_notes to investigation_notes
    ALTER TABLE public.incidents 
    ADD COLUMN investigation_notes TEXT;
    
    UPDATE public.incidents 
    SET investigation_notes = resolution_notes 
    WHERE resolution_notes IS NOT NULL;
    
    COMMENT ON COLUMN public.incidents.investigation_notes IS 'Notes from the incident investigation';
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'incidents' 
    AND column_name = 'investigation_notes'
  ) THEN
    ALTER TABLE public.incidents 
    ADD COLUMN investigation_notes TEXT;
    
    COMMENT ON COLUMN public.incidents.investigation_notes IS 'Notes from the incident investigation';
  END IF;
END $$;

-- Add root_cause column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'incidents' 
    AND column_name = 'root_cause'
  ) THEN
    ALTER TABLE public.incidents 
    ADD COLUMN root_cause TEXT;
    
    COMMENT ON COLUMN public.incidents.root_cause IS 'Root cause analysis of the incident';
  END IF;
END $$;

-- Add corrective_actions column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'incidents' 
    AND column_name = 'corrective_actions'
  ) THEN
    ALTER TABLE public.incidents 
    ADD COLUMN corrective_actions TEXT;
    
    COMMENT ON COLUMN public.incidents.corrective_actions IS 'Corrective actions taken to prevent recurrence';
  END IF;
END $$;

-- Add updated_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'incidents' 
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.incidents 
    ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    
    -- Populate from created_at if it exists
    UPDATE public.incidents 
    SET updated_at = created_at 
    WHERE updated_at IS NULL AND created_at IS NOT NULL;
    
    ALTER TABLE public.incidents 
    ALTER COLUMN updated_at SET NOT NULL;
    ALTER TABLE public.incidents 
    ALTER COLUMN updated_at SET DEFAULT NOW();
    
    COMMENT ON COLUMN public.incidents.updated_at IS 'Timestamp when the incident record was last updated';
  END IF;
END $$;

-- Create index on reported_by for better query performance
CREATE INDEX IF NOT EXISTS idx_incidents_reported_by ON public.incidents(reported_by);

-- Create index on title for search functionality
CREATE INDEX IF NOT EXISTS idx_incidents_title ON public.incidents(title);

