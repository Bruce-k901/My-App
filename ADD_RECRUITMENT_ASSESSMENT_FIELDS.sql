-- Add missing assessment fields to applications table

-- Check if columns exist first
DO $$ 
BEGIN
    -- Add trial_team_feedback if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'applications' 
        AND column_name = 'trial_team_feedback'
    ) THEN
        ALTER TABLE public.applications ADD COLUMN trial_team_feedback TEXT;
        RAISE NOTICE '✅ Added trial_team_feedback column';
    ELSE
        RAISE NOTICE '✓ trial_team_feedback column already exists';
    END IF;

    -- Add trial_rating if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'applications' 
        AND column_name = 'trial_rating'
    ) THEN
        ALTER TABLE public.applications ADD COLUMN trial_rating INTEGER;
        RAISE NOTICE '✅ Added trial_rating column';
    ELSE
        RAISE NOTICE '✓ trial_rating column already exists';
    END IF;

    -- Add status_history if it doesn't exist (JSONB array)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'applications' 
        AND column_name = 'status_history'
    ) THEN
        ALTER TABLE public.applications ADD COLUMN status_history JSONB DEFAULT '[]'::jsonb;
        RAISE NOTICE '✅ Added status_history column';
    ELSE
        RAISE NOTICE '✓ status_history column already exists';
    END IF;
END $$;

-- Add constraints
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'applications_trial_rating_check'
    ) THEN
        ALTER TABLE public.applications 
        ADD CONSTRAINT applications_trial_rating_check 
        CHECK (trial_rating IS NULL OR (trial_rating >= 1 AND trial_rating <= 5));
        RAISE NOTICE '✅ Added trial_rating check constraint';
    ELSE
        RAISE NOTICE '✓ trial_rating constraint already exists';
    END IF;
END $$;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

RAISE NOTICE '🎉 All recruitment assessment fields are ready!';
