-- Migration: Verify pest control template has checklist items
-- Run this to check if the template was created correctly
-- Note: This migration will be skipped if task_templates table doesn't exist yet

DO $$
DECLARE
  template_id UUID;
  template_name TEXT;
  repeatable_field TEXT;
  evidence_types TEXT[];
  checklist_items JSONB;
  checklist_count INTEGER;
BEGIN
  -- Check if table exists first
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_templates') THEN
    SELECT 
      id,
      name,
      repeatable_field_name,
      evidence_types,
      recurrence_pattern->'default_checklist_items'
    INTO 
      template_id,
      template_name,
      repeatable_field,
      evidence_types,
      checklist_items
    FROM task_templates 
    WHERE slug = 'weekly_pest_control_inspection';
    
    IF template_id IS NOT NULL THEN
      checklist_count := jsonb_array_length(COALESCE(checklist_items, '[]'::jsonb));
      
      RAISE NOTICE '✅ Pest Control template found (ID: %)', template_id;
      RAISE NOTICE '   Name: %', template_name;
      RAISE NOTICE '   Repeatable field: %', repeatable_field;
      RAISE NOTICE '   Evidence types: %', array_to_string(evidence_types, ', ');
      RAISE NOTICE '   Checklist items count: %', checklist_count;
      
      IF checklist_items IS NULL OR checklist_count = 0 THEN
        RAISE WARNING '⚠️  Checklist items are NULL or empty - template may need to be updated';
        RAISE NOTICE '   Run the 20250204000003 migration again to fix it';
      ELSE
        RAISE NOTICE '✅ Checklist items are present';
      END IF;
    ELSE
      RAISE NOTICE '⚠️  Pest control template not found - may need to run previous migrations first';
    END IF;
  ELSE
    RAISE NOTICE '⚠️  task_templates table does not exist yet - skipping verification';
  END IF;
END $$;


