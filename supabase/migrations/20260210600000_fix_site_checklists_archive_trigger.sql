-- ============================================================================
-- Migration: Fix site_checklists archive trigger column mismatch
-- Description: The backup_site_checklist_before_delete() and archive_site_checklist()
--              functions use SELECT *, NOW(), 'reason' which produces N+2 columns,
--              but site_checklists_archive only has N+1 columns (archived_at is already
--              included in SELECT * since it was added to site_checklists before the
--              archive table was created). This causes "INSERT has more expressions
--              than target columns" when deleting task_templates (via CASCADE).
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'site_checklists'
  ) THEN
    RAISE NOTICE 'site_checklists table does not exist - skipping';
    RETURN;
  END IF;

  -- Fix the BEFORE DELETE trigger function
  CREATE OR REPLACE FUNCTION backup_site_checklist_before_delete()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $fn$
  BEGIN
    INSERT INTO site_checklists_archive (
      id, site_id, company_id, template_id, name, frequency, active,
      daypart_times, equipment_config, days_of_week, date_of_month,
      anniversary_date, created_at, updated_at, created_by,
      archived_at, archived_reason
    )
    VALUES (
      OLD.id, OLD.site_id, OLD.company_id, OLD.template_id, OLD.name,
      OLD.frequency, OLD.active, OLD.daypart_times, OLD.equipment_config,
      OLD.days_of_week, OLD.date_of_month, OLD.anniversary_date,
      OLD.created_at, OLD.updated_at, OLD.created_by,
      COALESCE(OLD.archived_at, NOW()), 'Hard delete - backup'
    );
    RETURN OLD;
  END;
  $fn$;

  -- Fix the archive_site_checklist helper function
  CREATE OR REPLACE FUNCTION archive_site_checklist(
    p_checklist_id UUID,
    p_reason TEXT DEFAULT 'User deletion'
  )
  RETURNS BOOLEAN
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $fn$
  BEGIN
    INSERT INTO site_checklists_archive (
      id, site_id, company_id, template_id, name, frequency, active,
      daypart_times, equipment_config, days_of_week, date_of_month,
      anniversary_date, created_at, updated_at, created_by,
      archived_at, archived_reason
    )
    SELECT
      id, site_id, company_id, template_id, name, frequency, active,
      daypart_times, equipment_config, days_of_week, date_of_month,
      anniversary_date, created_at, updated_at, created_by,
      COALESCE(archived_at, NOW()), p_reason
    FROM site_checklists
    WHERE id = p_checklist_id;

    UPDATE site_checklists
    SET archived_at = NOW()
    WHERE id = p_checklist_id;

    RETURN FOUND;
  END;
  $fn$;

  RAISE NOTICE 'Fixed site_checklists archive functions - column mismatch resolved';
END $$;
