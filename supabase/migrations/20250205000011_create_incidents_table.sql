-- ============================================================================
-- Migration: 20250205000011_create_incidents_table.sql
-- Description: Creates incidents table for storing incident reports
-- ============================================================================

-- Drop existing table if it exists (to avoid column conflicts)
DROP TABLE IF EXISTS public.incidents CASCADE;

-- Create incidents table
CREATE TABLE public.incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,
  
  -- Incident Details
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  incident_type TEXT NOT NULL, -- 'slip_trip', 'cut', 'burn', 'fall', 'electrical', 'fire', 'food_poisoning', 'other'
  severity TEXT NOT NULL CHECK (severity IN ('near_miss', 'minor', 'moderate', 'major', 'critical', 'fatality')),
  
  -- Location & Time
  location TEXT,
  incident_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reported_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reported_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  -- Casualty Information
  casualties JSONB DEFAULT '[]'::jsonb, -- Array of {name, age, injury_type, severity, treatment_required}
  
  -- Witness Information
  witnesses JSONB DEFAULT '[]'::jsonb, -- Array of {name, contact, statement}
  
  -- Emergency Response
  emergency_services_called BOOLEAN DEFAULT FALSE,
  emergency_services_type TEXT, -- 'ambulance', 'fire', 'police', 'none'
  first_aid_provided BOOLEAN DEFAULT FALSE,
  scene_preserved BOOLEAN DEFAULT FALSE,
  
  -- RIDDOR Assessment
  riddor_reportable BOOLEAN DEFAULT FALSE,
  riddor_reported BOOLEAN DEFAULT FALSE,
  riddor_reported_date TIMESTAMPTZ,
  riddor_reference TEXT,
  
  -- Evidence
  photos TEXT[], -- Array of photo URLs
  documents TEXT[], -- Array of document URLs
  
  -- Immediate Actions
  immediate_actions_taken TEXT,
  
  -- Follow-up Tasks
  follow_up_tasks JSONB DEFAULT '[]'::jsonb, -- Array of task IDs created from this incident
  
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_incidents_company ON public.incidents(company_id);
CREATE INDEX IF NOT EXISTS idx_incidents_site ON public.incidents(site_id);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON public.incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON public.incidents(severity);
CREATE INDEX IF NOT EXISTS idx_incidents_date ON public.incidents(incident_date DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_riddor ON public.incidents(riddor_reportable) WHERE riddor_reportable = TRUE;

-- RLS Policies
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view incidents for their company
CREATE POLICY "Users can view incidents for their company"
  ON public.incidents FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Policy: Users can insert incidents for their company
CREATE POLICY "Users can insert incidents for their company"
  ON public.incidents FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Policy: Users can update incidents for their company
CREATE POLICY "Users can update incidents for their company"
  ON public.incidents FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Add comments
COMMENT ON TABLE public.incidents IS 'Stores incident reports with RIDDOR assessment and follow-up task generation';
COMMENT ON COLUMN public.incidents.casualties IS 'JSONB array of casualty information: {name, age, injury_type, severity, treatment_required}';
COMMENT ON COLUMN public.incidents.witnesses IS 'JSONB array of witness information: {name, contact, statement}';
COMMENT ON COLUMN public.incidents.follow_up_tasks IS 'JSONB array of task IDs created as follow-up actions from this incident';

