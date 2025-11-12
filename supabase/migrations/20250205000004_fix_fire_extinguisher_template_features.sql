-- ============================================================================
-- Migration: 20250205000004_fix_fire_extinguisher_template_features.sql
-- Description: Ensures fire extinguisher template has correct feature configuration
-- Fixes: repeatable_field_name = NULL, removes assets/libraries/document features
-- ============================================================================

-- Update the fire extinguisher template to ensure correct configuration
UPDATE task_templates
SET 
  repeatable_field_name = NULL,  -- NO asset selection - locations are in template_fields.options
  evidence_types = ARRAY['pass_fail', 'text_note'],  -- Only pass/fail and checklist
  triggers_contractor_on_failure = TRUE,  -- Failures trigger contractor callout
  contractor_type = 'fire_safety'  -- Fire safety contractor
WHERE slug = 'fire_extinguisher_inspection';

-- Verification
DO $$
DECLARE
  template_record RECORD;
  field_count INTEGER;
BEGIN
  -- Get template
  SELECT * INTO template_record
  FROM task_templates
  WHERE slug = 'fire_extinguisher_inspection';
  
  -- Count fields
  SELECT COUNT(*) INTO field_count
  FROM template_fields
  WHERE template_id = template_record.id;
  
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
    RAISE WARNING '⚠️ Template not found!';
  END IF;
END $$;

