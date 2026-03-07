-- Add archive tracking columns to risk_assessments
-- The archive center expects archived_at and archived_by columns
-- to track when and who archived each risk assessment.

ALTER TABLE risk_assessments
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

ALTER TABLE risk_assessments
  ADD COLUMN IF NOT EXISTS archived_by UUID;

-- FK to profiles (consistent with recipes pattern)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'risk_assessments_archived_by_fkey'
  ) THEN
    ALTER TABLE risk_assessments
      ADD CONSTRAINT risk_assessments_archived_by_fkey
      FOREIGN KEY (archived_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Index for efficient archive listing
CREATE INDEX IF NOT EXISTS idx_risk_assessments_archived_at
  ON risk_assessments(archived_at)
  WHERE archived_at IS NOT NULL;
