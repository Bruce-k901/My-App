-- ============================================================================
-- Migration: 20251111100000_extend_incidents_riddor.sql
-- Description: Extends incidents table with detailed RIDDOR tracking fields
-- ============================================================================
-- Note: This migration will be skipped if incidents table doesn't exist yet

DO $$
BEGIN
  -- Only proceed if incidents table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'incidents') THEN

    ALTER TABLE public.incidents
      ADD COLUMN IF NOT EXISTS lost_time_days integer;

    ALTER TABLE public.incidents
      ADD COLUMN IF NOT EXISTS hospitalisation boolean default false;

    ALTER TABLE public.incidents
      ADD COLUMN IF NOT EXISTS public_involved boolean default false;

    ALTER TABLE public.incidents
      ADD COLUMN IF NOT EXISTS reportable_disease boolean default false;

    ALTER TABLE public.incidents
      ADD COLUMN IF NOT EXISTS environmental_release boolean default false;

    ALTER TABLE public.incidents
      ADD COLUMN IF NOT EXISTS riddor_category text CHECK (
        riddor_category IN (
          'fatality',
          'specified_injury',
          'over_seven_day',
          'hospitalisation',
          'public_hospitalisation',
          'occupational_disease',
          'dangerous_occurrence',
          'other'
        )
      );

    ALTER TABLE public.incidents
      ADD COLUMN IF NOT EXISTS riddor_reason text;

    ALTER TABLE public.incidents
      ADD COLUMN IF NOT EXISTS riddor_due_date date;

    ALTER TABLE public.incidents
      ADD COLUMN IF NOT EXISTS riddor_notes text;

    ALTER TABLE public.incidents
      ADD COLUMN IF NOT EXISTS riddor_notified_at timestamptz;

    ALTER TABLE public.incidents
      ADD COLUMN IF NOT EXISTS export_url text;

    COMMENT ON COLUMN public.incidents.lost_time_days IS 'Number of days the injured worker is expected to be off work';
    COMMENT ON COLUMN public.incidents.hospitalisation IS 'Whether anyone was admitted to hospital as a result of the incident';
    COMMENT ON COLUMN public.incidents.public_involved IS 'True if a member of the public was injured and taken to hospital';
    COMMENT ON COLUMN public.incidents.reportable_disease IS 'True if it involves a reportable occupational disease';
    COMMENT ON COLUMN public.incidents.environmental_release IS 'True if a dangerous occurrence or hazardous substance release occurred';
    COMMENT ON COLUMN public.incidents.riddor_category IS 'RIDDOR category assigned to this incident';
    COMMENT ON COLUMN public.incidents.riddor_reason IS 'Derived explanation of why the incident is RIDDOR reportable';
    COMMENT ON COLUMN public.incidents.riddor_due_date IS 'Deadline by which the RIDDOR report must be submitted';
    COMMENT ON COLUMN public.incidents.riddor_notes IS 'Additional context or decision notes for the RIDDOR assessment';
    COMMENT ON COLUMN public.incidents.riddor_notified_at IS 'Timestamp when the RIDDOR notification was sent';
    COMMENT ON COLUMN public.incidents.export_url IS 'Reference to the generated incident export (PDF/JSON) if stored';

    RAISE NOTICE 'Extended incidents table with RIDDOR tracking fields';

  ELSE
    RAISE NOTICE '⚠️ incidents table does not exist yet - skipping RIDDOR fields';
  END IF;
END $$;


