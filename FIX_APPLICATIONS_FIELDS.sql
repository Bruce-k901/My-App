-- Add missing fields to applications table

-- Add trial_team_feedback column
ALTER TABLE public.applications 
ADD COLUMN IF NOT EXISTS trial_team_feedback TEXT;

-- Add trial_rating column
ALTER TABLE public.applications 
ADD COLUMN IF NOT EXISTS trial_rating INTEGER;

-- Add constraint for trial_rating
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'applications_trial_rating_check'
    ) THEN
        ALTER TABLE public.applications 
        ADD CONSTRAINT applications_trial_rating_check 
        CHECK (trial_rating IS NULL OR (trial_rating >= 1 AND trial_rating <= 5));
    END IF;
END $$;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
