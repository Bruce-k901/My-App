-- Add archived_at and archived_by columns to sop_entries
-- These columns are needed for proper archive tracking and ordering
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sop_entries') THEN
    ALTER TABLE sop_entries ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
    ALTER TABLE sop_entries ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES auth.users(id);

    -- Index for efficient archive ordering
    CREATE INDEX IF NOT EXISTS idx_sop_entries_archived_at ON sop_entries(archived_at) WHERE archived_at IS NOT NULL;

    -- Backfill: any existing 'Archived' SOPs without archived_at get updated_at as fallback
    UPDATE sop_entries
    SET archived_at = updated_at
    WHERE status = 'Archived' AND archived_at IS NULL;

    RAISE NOTICE 'Added archived_at and archived_by columns to sop_entries';
  ELSE
    RAISE NOTICE 'sop_entries table does not exist - skipping';
  END IF;
END $$;
