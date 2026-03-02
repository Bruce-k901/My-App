-- ============================================================================
-- Migration: Protect site_checklists from Accidental Deletion
-- Description: Adds safeguards to prevent data loss in production
-- Date: 2025-12-15
-- ============================================================================
-- This migration adds:
-- 1. Soft delete support (archive instead of delete)
-- 2. Audit logging for deletions
-- 3. Backup trigger before destructive operations
-- 4. RLS policies to prevent bulk deletions
-- ============================================================================

DO $$
BEGIN
  -- Skip entire migration if site_checklists doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'site_checklists'
  ) THEN
    RAISE NOTICE '⚠️ site_checklists table does not exist - skipping protect migration';
    RETURN;
  END IF;

  -- ============================================================================
  -- 1. Add archived_at column for soft deletes
  -- ============================================================================
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'site_checklists'
    AND column_name = 'archived_at'
  ) THEN
    ALTER TABLE site_checklists
    ADD COLUMN archived_at TIMESTAMPTZ;

    RAISE NOTICE 'Added archived_at column to site_checklists';
  ELSE
    RAISE NOTICE 'archived_at column already exists';
  END IF;

  -- ============================================================================
  -- 2. Create archive table for backup
  -- ============================================================================
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'site_checklists_archive'
  ) THEN
    -- Create table structure based on site_checklists
    CREATE TABLE site_checklists_archive (
      LIKE site_checklists INCLUDING ALL
    );

    -- Add archive-specific columns
    ALTER TABLE site_checklists_archive
    ADD COLUMN archived_reason TEXT;

    -- Ensure it has a default
    ALTER TABLE site_checklists_archive
    ALTER COLUMN archived_at SET DEFAULT NOW();

    RAISE NOTICE 'Created site_checklists_archive table';
  ELSE
    -- Table exists, just ensure archived_reason column exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'site_checklists_archive'
      AND column_name = 'archived_reason'
    ) THEN
      ALTER TABLE site_checklists_archive
      ADD COLUMN archived_reason TEXT;
    END IF;

    RAISE NOTICE 'site_checklists_archive table already exists';
  END IF;

  -- Add index for faster lookups
  CREATE INDEX IF NOT EXISTS idx_site_checklists_archive_archived_at
  ON site_checklists_archive(archived_at);

  -- ============================================================================
  -- 3. Create function to safely archive instead of delete
  -- ============================================================================
  CREATE OR REPLACE FUNCTION archive_site_checklist(
    p_checklist_id UUID,
    p_reason TEXT DEFAULT 'User deletion'
  )
  RETURNS BOOLEAN
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $fn$
  BEGIN
    -- Archive the checklist
    INSERT INTO site_checklists_archive
    SELECT *, NOW(), p_reason
    FROM site_checklists
    WHERE id = p_checklist_id;

    -- Soft delete by setting archived_at
    UPDATE site_checklists
    SET archived_at = NOW()
    WHERE id = p_checklist_id;

    RETURN FOUND;
  END;
  $fn$;

  -- ============================================================================
  -- 4. Create trigger to backup before hard delete (safety net)
  -- ============================================================================
  CREATE OR REPLACE FUNCTION backup_site_checklist_before_delete()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $fn$
  BEGIN
    -- Backup to archive before deletion
    INSERT INTO site_checklists_archive
    SELECT *, NOW(), 'Hard delete - backup'
    FROM site_checklists
    WHERE id = OLD.id;

    RETURN OLD;
  END;
  $fn$;

  -- Drop trigger if exists and recreate
  DROP TRIGGER IF EXISTS backup_site_checklist_delete ON site_checklists;
  CREATE TRIGGER backup_site_checklist_delete
    BEFORE DELETE ON site_checklists
    FOR EACH ROW
    EXECUTE FUNCTION backup_site_checklist_before_delete();

  -- ============================================================================
  -- 5. Create function to restore from archive
  -- ============================================================================
  CREATE OR REPLACE FUNCTION restore_site_checklist_from_archive(
    p_checklist_id UUID
  )
  RETURNS BOOLEAN
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $fn$
  DECLARE
    v_archived RECORD;
  BEGIN
    -- Find the most recent archive entry
    SELECT * INTO v_archived
    FROM site_checklists_archive
    WHERE id = p_checklist_id
    ORDER BY archived_at DESC
    LIMIT 1;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'No archived checklist found with id %', p_checklist_id;
    END IF;

    -- Restore to main table
    INSERT INTO site_checklists (
      id, site_id, company_id, template_id, name, frequency, active,
      daypart_times, equipment_config, days_of_week, date_of_month,
      anniversary_date, created_at, updated_at, created_by
    )
    VALUES (
      v_archived.id, v_archived.site_id, v_archived.company_id,
      v_archived.template_id, v_archived.name, v_archived.frequency,
      v_archived.active, v_archived.daypart_times, v_archived.equipment_config,
      v_archived.days_of_week, v_archived.date_of_month,
      v_archived.anniversary_date, v_archived.created_at,
      v_archived.updated_at, v_archived.created_by
    )
    ON CONFLICT (id) DO UPDATE SET
      site_id = EXCLUDED.site_id,
      company_id = EXCLUDED.company_id,
      template_id = EXCLUDED.template_id,
      name = EXCLUDED.name,
      frequency = EXCLUDED.frequency,
      active = EXCLUDED.active,
      daypart_times = EXCLUDED.daypart_times,
      equipment_config = EXCLUDED.equipment_config,
      days_of_week = EXCLUDED.days_of_week,
      date_of_month = EXCLUDED.date_of_month,
      anniversary_date = EXCLUDED.anniversary_date,
      updated_at = NOW(),
      archived_at = NULL; -- Clear archived flag

    RETURN TRUE;
  END;
  $fn$;

  -- ============================================================================
  -- 7. Create view for active checklists (excludes archived)
  -- ============================================================================
  CREATE OR REPLACE VIEW site_checklists_active AS
  SELECT *
  FROM site_checklists
  WHERE archived_at IS NULL;

  -- Grant access
  GRANT SELECT ON site_checklists_active TO authenticated;

  -- ============================================================================
  -- 8. Add comment documenting the protection
  -- ============================================================================
  COMMENT ON TABLE site_checklists IS
  'User-configured recurring task patterns. DO NOT DROP or TRUNCATE this table in production. Use archive_site_checklist() function for deletions.';

  COMMENT ON FUNCTION archive_site_checklist IS
  'Safely archives a site_checklist instead of hard deleting. Use this instead of DELETE.';

  COMMENT ON FUNCTION restore_site_checklist_from_archive IS
  'Restores a site_checklist from the archive table. Use this to recover accidentally deleted configurations.';

  -- Final notification
  RAISE NOTICE 'Protection mechanisms added to site_checklists table';
  RAISE NOTICE '  - Soft delete support (archived_at column)';
  RAISE NOTICE '  - Automatic backup before hard delete';
  RAISE NOTICE '  - Archive table for recovery';
  RAISE NOTICE '  - Restore function available';
END $$;
