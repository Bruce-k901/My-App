-- ============================================================================
-- Migration: 20250205000005_verify_and_fix_all_template_features.sql
-- Description: Verifies and fixes feature configuration for all templates
-- Ensures templates only show features based on their evidence_types
-- Note: This migration will be skipped if task_templates table doesn't exist yet
-- ============================================================================

-- Fix templates (only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_templates') THEN
    -- Fix Fire Extinguisher template specifically
    UPDATE task_templates
    SET 
      repeatable_field_name = NULL,  -- NO asset selection
      evidence_types = ARRAY['pass_fail', 'text_note'],  -- Only pass/fail and checklist
      triggers_contractor_on_failure = TRUE,
      contractor_type = 'fire_safety'
    WHERE slug = 'fire_extinguisher_inspection';

    -- Fix Fire Alarm template (if it exists)
    UPDATE task_templates
    SET 
      repeatable_field_name = NULL  -- NO asset selection - call points are managed separately
    WHERE slug = 'fire_alarm_test_weekly';

    -- Fix Pest Control template (if it exists) - should not have asset selection
    UPDATE task_templates
    SET 
      repeatable_field_name = NULL  -- NO asset selection - pest devices are managed separately
    WHERE slug = 'pest_control_device_inspection';

    -- Fix First Aid template (if it exists) - locations are in template_fields, not assets
    UPDATE task_templates
    SET 
      repeatable_field_name = NULL  -- NO asset selection - locations are in template_fields.options
    WHERE slug = 'first_aid_kit_inspection';
  END IF;
END $$;

-- Verify all templates have correct configuration (only if table exists)
DO $$
DECLARE
  template_record RECORD;
  template_count INTEGER := 0;
  issue_count INTEGER := 0;
BEGIN
  -- Check if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_templates') THEN
    RAISE NOTICE '🔍 Verifying all templates...';
    RAISE NOTICE '';
    
    FOR template_record IN 
      SELECT * FROM task_templates WHERE is_active = true
    LOOP
    template_count := template_count + 1;
    RAISE NOTICE 'Template: % (slug: %)', template_record.name, template_record.slug;
    RAISE NOTICE '  Evidence types: %', template_record.evidence_types;
    RAISE NOTICE '  Repeatable field: %', template_record.repeatable_field_name;
    
    -- Check for issues
    IF template_record.repeatable_field_name IS NOT NULL THEN
      -- Only warn if evidence_types doesn't suggest assets are needed
      IF NOT ('temperature' = ANY(template_record.evidence_types)) THEN
        RAISE NOTICE '  ⚠️  Has repeatable_field_name but no temperature evidence - asset selection may show unnecessarily';
        issue_count := issue_count + 1;
      ELSE
        RAISE NOTICE '  ✓ Repeatable field set (likely for temperature logging)';
      END IF;
    ELSE
      RAISE NOTICE '  ✓ No repeatable field (no asset selection)';
    END IF;
    
    -- Check evidence_types
    IF template_record.evidence_types IS NULL OR array_length(template_record.evidence_types, 1) IS NULL THEN
      RAISE NOTICE '  ⚠️  No evidence_types set!';
      issue_count := issue_count + 1;
    END IF;
    
      RAISE NOTICE '';
    END LOOP;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Summary:';
    RAISE NOTICE '  Total templates checked: %', template_count;
    RAISE NOTICE '  Issues found: %', issue_count;
    RAISE NOTICE '========================================';
  ELSE
    RAISE NOTICE '⚠️ task_templates table does not exist yet - skipping verification';
  END IF;
END $$;

-- Specific verification for Fire Extinguisher template (only if table exists)
DO $$
DECLARE
  template_record RECORD;
  checklist_count INTEGER;
BEGIN
  -- Check if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_templates') THEN
    SELECT * INTO template_record
    FROM task_templates
    WHERE slug = 'fire_extinguisher_inspection';
  
  IF template_record.id IS NOT NULL THEN
    RAISE NOTICE '';
    RAISE NOTICE '✅ Fire Extinguisher Template Final Verification:';
    RAISE NOTICE '   Template ID: %', template_record.id;
    RAISE NOTICE '   Repeatable field name: % (should be NULL)', template_record.repeatable_field_name;
    RAISE NOTICE '   Evidence types: %', template_record.evidence_types;
    RAISE NOTICE '   Has pass_fail: %', 'pass_fail' = ANY(template_record.evidence_types);
    RAISE NOTICE '   Has text_note: %', 'text_note' = ANY(template_record.evidence_types);
    RAISE NOTICE '   Has temperature: %', 'temperature' = ANY(template_record.evidence_types);
    RAISE NOTICE '   Has photo: %', 'photo' = ANY(template_record.evidence_types);
    RAISE NOTICE '   Triggers contractor: %', template_record.triggers_contractor_on_failure;
    RAISE NOTICE '   Contractor type: %', template_record.contractor_type;
    
    -- Check default checklist items
    IF template_record.recurrence_pattern IS NOT NULL THEN
      SELECT jsonb_array_length(COALESCE((template_record.recurrence_pattern->'default_checklist_items'), '[]'::jsonb))
      INTO checklist_count;
      RAISE NOTICE '   Default checklist items: %', checklist_count;
    ELSE
      RAISE NOTICE '   Default checklist items: 0 (no recurrence_pattern)';
    END IF;
    
    -- Final checks
    IF template_record.repeatable_field_name IS NOT NULL THEN
      RAISE WARNING '❌ ISSUE: repeatable_field_name is NOT NULL - asset selection WILL show!';
    END IF;
    
    IF NOT ('text_note' = ANY(template_record.evidence_types)) THEN
      RAISE WARNING '❌ ISSUE: text_note not in evidence_types - checklist WILL NOT show!';
    END IF;
    
    IF NOT ('pass_fail' = ANY(template_record.evidence_types)) THEN
      RAISE WARNING '❌ ISSUE: pass_fail not in evidence_types - pass/fail feature WILL NOT show!';
    END IF;
    
    RAISE NOTICE '';
    ELSE
      RAISE NOTICE '⚠️ Fire Extinguisher template not found (may not exist yet)';
    END IF;
  ELSE
    RAISE NOTICE '⚠️ task_templates table does not exist yet - skipping verification';
  END IF;
END $$;

