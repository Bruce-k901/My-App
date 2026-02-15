-- ============================================================================
-- Migration: 20250205000004_fix_fire_extinguisher_template_features.sql
-- Description: Ensures fire extinguisher template has correct feature configuration
-- Fixes: repeatable_field_name = NULL, removes assets/libraries/document features
-- Note: This migration will be skipped if task_templates table doesn't exist yet
-- ============================================================================

-- Update the fire extinguisher template to ensure correct configuration
-- Only update if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_templates') THEN
    UPDATE task_templates
    SET 
      repeatable_field_name = NULL,  -- NO asset selection - locations are in template_fields.options
      evidence_types = ARRAY['pass_fail', 'text_note'],  -- Only pass/fail and checklist
      triggers_contractor_on_failure = TRUE,  -- Failures trigger contractor callout
      contractor_type = 'fire_safety'  -- Fire safety contractor
    WHERE slug = 'fire_extinguisher_inspection';
  END IF;
END $$;

-- Verification (only if tables exist)
DO $$
DECLARE
  template_record RECORD;
  field_count INTEGER;
BEGIN
  -- Check if tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_templates') THEN
    -- Get template
    SELECT * INTO template_record
    FROM task_templates
    WHERE slug = 'fire_extinguisher_inspection';
    
    -- Count fields (only if template_fields table exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'template_fields') THEN
      SELECT COUNT(*) INTO field_count
      FROM template_fields
      WHERE template_id = template_record.id;
    ELSE
      field_count := 0;
    END IF;
  
    IF template_record.id IS NOT NULL THEN
      RAISE NOTICE '✅ Fire Extinguisher template verified:';
      RAISE NOTICE '   Template ID: %', template_record.id;
      RAISE NOTICE '   Repeatable field name: % (should be NULL)', template_record.repeatable_field_name;
      RAISE NOTICE '   Evidence types: % (should be: {pass_fail,text_note})', template_record.evidence_types;
      RAISE NOTICE '   Triggers contractor: % (should be TRUE)', template_record.triggers_contractor_on_failure;
      RAISE NOTICE '   Contractor type: % (should be fire_safety)', template_record.contractor_type;
      RAISE NOTICE '   Template fields: %', field_count;
      RAISE NOTICE '   Default checklist items: %', jsonb_array_length(COALESCE((template_record.recurrence_pattern->'default_checklist_items'), '[]'::jsonb));
      
      -- Check for issues
      IF template_record.repeatable_field_name IS NOT NULL THEN
        RAISE WARNING '⚠️ WARNING: repeatable_field_name is NOT NULL - asset selection will show!';
      END IF;
      
      IF NOT ('pass_fail' = ANY(template_record.evidence_types)) THEN
        RAISE WARNING '⚠️ WARNING: pass_fail not in evidence_types!';
      END IF;
      
      IF NOT ('text_note' = ANY(template_record.evidence_types)) THEN
        RAISE WARNING '⚠️ WARNING: text_note not in evidence_types - checklist will not show!';
      END IF;
    ELSE
      RAISE NOTICE '⚠️ Template not found (may not exist yet)';
    END IF;
  ELSE
    RAISE NOTICE '⚠️ task_templates table does not exist yet - skipping verification';
  END IF;
END $$;

