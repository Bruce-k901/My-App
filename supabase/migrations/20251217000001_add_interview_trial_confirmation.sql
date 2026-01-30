-- =====================================================
-- Add Interview and Trial Confirmation Tracking
-- =====================================================
-- Allows managers to track if candidates confirmed/declined

ALTER TABLE public.applications 
ADD COLUMN IF NOT EXISTS interview_confirmation_status TEXT 
  CHECK (interview_confirmation_status IN ('pending', 'confirmed', 'declined', 'rescheduled')),
ADD COLUMN IF NOT EXISTS interview_confirmation_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS interview_reschedule_reason TEXT,

ADD COLUMN IF NOT EXISTS trial_confirmation_status TEXT 
  CHECK (trial_confirmation_status IN ('pending', 'confirmed', 'declined', 'rescheduled')),
ADD COLUMN IF NOT EXISTS trial_confirmation_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS trial_reschedule_reason TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_applications_interview_confirmation 
ON public.applications(interview_confirmation_status) 
WHERE interview_scheduled_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_applications_trial_confirmation 
ON public.applications(trial_confirmation_status) 
WHERE trial_scheduled_at IS NOT NULL;

COMMENT ON COLUMN public.applications.interview_confirmation_status IS 
'Tracks whether candidate confirmed attendance: pending (waiting), confirmed (yes), declined (no), rescheduled (needs new date)';

COMMENT ON COLUMN public.applications.trial_confirmation_status IS 
'Tracks whether candidate confirmed attendance: pending (waiting), confirmed (yes), declined (no), rescheduled (needs new date)';
