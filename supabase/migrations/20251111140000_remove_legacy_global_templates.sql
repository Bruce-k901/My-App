-- ============================================================================
-- Migration: 20251111140000_remove_legacy_global_templates.sql
-- Description: Removes legacy global compliance templates that were seeded in
--              the original prototype so the feature-module templates can take precedence.
-- ============================================================================

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
  -- Remove any template fields linked to the legacy templates first to maintain referential integrity
  DELETE FROM public.template_fields
  WHERE template_id IN (
    SELECT id
    FROM public.task_templates
    WHERE company_id IS NULL
      AND slug = ANY(legacy_slugs)
  );

  -- Remove the legacy template rows
  DELETE FROM public.task_templates
  WHERE company_id IS NULL
    AND slug = ANY(legacy_slugs);
END
$$;
