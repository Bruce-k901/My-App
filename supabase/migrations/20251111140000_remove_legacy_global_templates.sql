-- ============================================================================
-- Migration: 20251111140000_remove_legacy_global_templates.sql
-- Description: Removes legacy global compliance templates that were seeded in
--              the original prototype so the feature-module templates can take precedence.
-- ============================================================================
-- Note: This migration will be skipped if required tables don't exist yet

DO $$
DECLARE
  legacy_slugs TEXT[] := ARRAY[
    'daily_opening_food_safety',
    'daily_closing_hygiene',
    'weekly_hot_holding_validation',
    'weekly_refrigeration_audit',
    'monthly_cleaning_verification',
    'fire_safety_drill_equipment',
    'emergency_lighting_escape_route',
    'first_aid_ppe_station_check',
    'pest_control_walk_bait',
    'waste_management_recycling_audit'
  ];
BEGIN
  -- Only proceed if required tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_templates') THEN

    -- Remove any template fields linked to the legacy templates first to maintain referential integrity
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'template_fields') THEN
      DELETE FROM public.template_fields
      WHERE template_id IN (
        SELECT id
        FROM public.task_templates
        WHERE company_id IS NULL
          AND slug = ANY(legacy_slugs)
      );
    END IF;

    -- Remove the legacy template rows
    DELETE FROM public.task_templates
    WHERE company_id IS NULL
      AND slug = ANY(legacy_slugs);

    RAISE NOTICE 'Removed legacy global templates';

  ELSE
    RAISE NOTICE '⚠️ Required table (task_templates) does not exist yet - skipping legacy template removal';
  END IF;
END $$;
