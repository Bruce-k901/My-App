-- Migration: 20250204000009_fix_fire_alarm_asset_selection.sql
-- Description: Ensures fire alarm template has repeatable_field_name = NULL to hide asset selection
-- Note: This migration will be skipped if task_templates table doesn't exist yet

-- Update fire alarm template to remove asset selection
-- Only update if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_templates') THEN
    UPDATE public.task_templates
    SET repeatable_field_name = NULL
    WHERE slug = 'fire_alarm_test_weekly'
      AND (repeatable_field_name IS NOT NULL OR repeatable_field_name != NULL);
  END IF;
END $$;

-- Verify the update (only if table exists)
DO $$
DECLARE
  template_repeatable_field TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_templates') THEN
    SELECT repeatable_field_name INTO template_repeatable_field
    FROM task_templates
    WHERE slug = 'fire_alarm_test_weekly';
    
    IF template_repeatable_field IS NULL THEN
      RAISE NOTICE '✅ Fire alarm template updated: repeatable_field_name is NULL (asset selection hidden)';
    ELSE
      RAISE WARNING '⚠️ Fire alarm template still has repeatable_field_name: %', template_repeatable_field;
    END IF;
  ELSE
    RAISE NOTICE '⚠️ task_templates table does not exist yet - skipping verification';
  END IF;
END $$;

