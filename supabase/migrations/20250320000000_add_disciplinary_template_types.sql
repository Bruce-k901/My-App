-- ============================================================================
-- Add Disciplinary Template Types to Enum
-- Description: Adds 6 new template types for disciplinary & grievance processes
-- Note: ALTER TYPE ADD VALUE cannot be run inside a transaction block in PostgreSQL < 12
-- If this migration fails, run each ALTER TYPE statement separately in Supabase SQL Editor
-- ============================================================================

-- Add new enum values (will fail silently if already exists)
-- Note: Supabase uses PostgreSQL 15+, so these should work in transactions

DO $$ 
BEGIN
  -- Add informal_discussion
  BEGIN
    ALTER TYPE review_template_type ADD VALUE 'informal_discussion';
  EXCEPTION WHEN OTHERS THEN
    -- Value may already exist, continue
    NULL;
  END;

  -- Add investigation_meeting
  BEGIN
    ALTER TYPE review_template_type ADD VALUE 'investigation_meeting';
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- Add disciplinary_hearing
  BEGIN
    ALTER TYPE review_template_type ADD VALUE 'disciplinary_hearing';
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- Add disciplinary_outcome
  BEGIN
    ALTER TYPE review_template_type ADD VALUE 'disciplinary_outcome';
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- Add appeal_hearing
  BEGIN
    ALTER TYPE review_template_type ADD VALUE 'appeal_hearing';
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- Add grievance_meeting
  BEGIN
    ALTER TYPE review_template_type ADD VALUE 'grievance_meeting';
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END $$;

