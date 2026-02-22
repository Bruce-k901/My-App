-- ============================================================================
-- Migration: 20250205000002_add_fire_extinguisher_inspection_template.sql
-- Description: Adds monthly fire extinguisher inspection template
-- Note: This migration will be skipped if task_templates table doesn't exist yet
-- ============================================================================

-- Clean up existing template if it exists
-- Only delete if tables exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_templates') THEN
    -- Delete repeatable labels if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'template_repeatable_labels') THEN
      DELETE FROM template_repeatable_labels 
      WHERE template_id IN (SELECT id FROM task_templates WHERE slug = 'fire_extinguisher_inspection');
    END IF;
    
    -- Delete template fields if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'template_fields') THEN
      DELETE FROM template_fields 
      WHERE template_id IN (SELECT id FROM task_templates WHERE slug = 'fire_extinguisher_inspection');
    END IF;
    
    -- Delete template
    DELETE FROM task_templates 
    WHERE slug = 'fire_extinguisher_inspection';
  END IF;
END $$;

-- Create template
-- Only insert if task_templates table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_templates') THEN
    INSERT INTO task_templates (
      company_id,
      name,
      slug,
      description,
      category,                        -- FIXED: Changed from 'fire_safety' to 'fire' (valid category per schema)
      audit_category,
      frequency,
      time_of_day,
      dayparts,
      recurrence_pattern,
      assigned_to_role,
      compliance_standard,
      is_critical,
      is_template_library,
      evidence_types,
      instructions,
      repeatable_field_name,
      triggers_contractor_on_failure,
      contractor_type,
      is_active
    ) VALUES (
      NULL,
      'Monthly Fire Extinguisher Inspection',
      'fire_extinguisher_inspection',
      'Visual inspection of all fire extinguishers for accessibility and condition',
      'fire',                          -- FIXED: Valid category value
      'fire_safety',                   -- audit_category can be 'fire_safety' (not constrained)
      'monthly',
      '07:00',
      ARRAY['before_open'],
      jsonb_build_object(
        'date_of_month', 1,            -- FIXED: Added date_of_month for monthly tasks (runs on 1st of month)
        'daypart_times', jsonb_build_object('before_open', '07:00'),
        'default_checklist_items', jsonb_build_array(
          'Check pressure gauge in green zone',
          'Verify safety pin and seal intact',
          'Inspect for physical damage or corrosion',
          'Ensure clear access and visibility',
          'Check inspection tag is present and current',
          'Record inspection in fire safety log',
          'Report any issues for immediate service'
        )
      ),
      'manager',
      'Regulatory Reform (Fire Safety) Order 2005',
      TRUE,
      TRUE,
      ARRAY['pass_fail', 'text_note'],
      'Purpose:
Ensure fire extinguishers are accessible, charged, and in good condition for immediate use.

Importance:
Legal requirement under the Regulatory Reform (Fire Safety) Order 2005. Properly maintained extinguishers can prevent small fires from becoming major incidents.

Method:
1. Visually inspect each extinguisher location
2. Check pressure gauge is in the green zone
3. Verify safety pin and tamper seal are intact
4. Ensure extinguisher is accessible and not obstructed
5. Look for any physical damage or corrosion
6. Record findings in fire safety log
7. Report any issues immediately for professional service

Special Requirements:
- Annual professional service required by qualified contractor
- Tag any faulty extinguishers immediately and remove from service
- Ensure clear access - no obstructions within 1 meter
- Maintain inspection records for fire authority inspection',
      NULL,                            -- No asset selection - locations are managed via template_repeatable_labels
      TRUE,
      'fire_safety',
      TRUE
    );
  END IF;
END $$;

-- Add template fields
-- Only insert if both tables exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_templates')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'template_fields') THEN
    INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT t.id, 'inspection_date', 'date', 'Inspection Date', TRUE, 1, 
      'Date when the fire extinguisher inspection was performed.'
    FROM task_templates t
    WHERE t.slug = 'fire_extinguisher_inspection'
      AND NOT EXISTS (SELECT 1 FROM template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'inspection_date');

    INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text, options)
    SELECT t.id, 'extinguisher_location', 'select', 'Extinguisher Location', TRUE, 2,
      'Select which fire extinguisher is being inspected.',
      jsonb_build_array(
        jsonb_build_object('value', 'Kitchen - Near Entrance', 'label', 'Kitchen - Near Entrance'),
        jsonb_build_object('value', 'Kitchen - Cooking Line', 'label', 'Kitchen - Cooking Line'),
        jsonb_build_object('value', 'Bar Area', 'label', 'Bar Area'),
        jsonb_build_object('value', 'Main Dining Area', 'label', 'Main Dining Area'),
        jsonb_build_object('value', 'Reception Area', 'label', 'Reception Area'),
        jsonb_build_object('value', 'Staff Room', 'label', 'Staff Room'),
        jsonb_build_object('value', 'Office Area', 'label', 'Office Area'),
        jsonb_build_object('value', 'Storage Room', 'label', 'Storage Room')
      )
    FROM task_templates t
    WHERE t.slug = 'fire_extinguisher_inspection'
      AND NOT EXISTS (SELECT 1 FROM template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'extinguisher_location');

    INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text, options)
    SELECT t.id, 'extinguisher_type', 'select', 'Extinguisher Type', TRUE, 3,
      'Type of fire extinguisher being inspected.',
      jsonb_build_array(
        jsonb_build_object('value', 'Water (Red)', 'label', 'Water (Red)'),
        jsonb_build_object('value', 'Foam (Cream)', 'label', 'Foam (Cream)'),
        jsonb_build_object('value', 'Dry Powder (Blue)', 'label', 'Dry Powder (Blue)'),
        jsonb_build_object('value', 'CO2 (Black)', 'label', 'CO2 (Black)'),
        jsonb_build_object('value', 'Wet Chemical (Yellow)', 'label', 'Wet Chemical (Yellow)')
      )
    FROM task_templates t
    WHERE t.slug = 'fire_extinguisher_inspection'
      AND NOT EXISTS (SELECT 1 FROM template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'extinguisher_type');

    INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT t.id, 'pressure_gauge_ok', 'pass_fail', 'Pressure Gauge in Green Zone', TRUE, 10,
      'PASS if pressure gauge shows in the green zone. FAIL if in red zone or not visible.'
    FROM task_templates t
    WHERE t.slug = 'fire_extinguisher_inspection'
      AND NOT EXISTS (SELECT 1 FROM template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'pressure_gauge_ok');

    INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT t.id, 'safety_seal_ok', 'pass_fail', 'Safety Pin and Seal Intact', TRUE, 11,
      'PASS if safety pin and tamper seal are intact and undamaged.'
    FROM task_templates t
    WHERE t.slug = 'fire_extinguisher_inspection'
      AND NOT EXISTS (SELECT 1 FROM template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'safety_seal_ok');

    INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT t.id, 'no_damage', 'pass_fail', 'No Physical Damage or Corrosion', TRUE, 12,
      'PASS if extinguisher shows no signs of damage, dents, or corrosion.'
    FROM task_templates t
    WHERE t.slug = 'fire_extinguisher_inspection'
      AND NOT EXISTS (SELECT 1 FROM template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'no_damage');

    INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT t.id, 'accessible', 'pass_fail', 'Clear Access and Visibility', TRUE, 13,
      'PASS if extinguisher is clearly visible and accessible (no obstructions within 1 meter).'
    FROM task_templates t
    WHERE t.slug = 'fire_extinguisher_inspection'
      AND NOT EXISTS (SELECT 1 FROM template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'accessible');

    INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT t.id, 'inspection_tag_ok', 'pass_fail', 'Inspection Tag Present and Current', TRUE, 14,
      'PASS if inspection tag is present and shows current inspection date.'
    FROM task_templates t
    WHERE t.slug = 'fire_extinguisher_inspection'
      AND NOT EXISTS (SELECT 1 FROM template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'inspection_tag_ok');

    INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT t.id, 'overall_assessment', 'pass_fail', 'Overall Extinguisher Assessment', TRUE, 20,
      'PASS if all checks are satisfactory. FAIL if any issues found - will trigger contractor callout.'
    FROM task_templates t
    WHERE t.slug = 'fire_extinguisher_inspection'
      AND NOT EXISTS (SELECT 1 FROM template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'overall_assessment');

    INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
    SELECT t.id, 'fault_details', 'text', 'Fault Details / Actions Required', FALSE, 21,
      'Describe any faults found and actions required. Be specific about location and issue.',
      'e.g., Pressure gauge in red zone, safety pin missing, obstructed by equipment...'
    FROM task_templates t
    WHERE t.slug = 'fire_extinguisher_inspection'
      AND NOT EXISTS (SELECT 1 FROM template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'fault_details');

    INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT t.id, 'inspected_by', 'text', 'Inspected By (Name)', TRUE, 22,
      'Full name of the person who performed the inspection.'
    FROM task_templates t
    WHERE t.slug = 'fire_extinguisher_inspection'
      AND NOT EXISTS (SELECT 1 FROM template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'inspected_by');
  END IF;
END $$;

-- Note: Extinguisher locations and types are stored in template_fields.options JSONB field
-- This is the correct way to store select field options (not in repeatable_labels)
-- Repeatable labels are only used for repeatable multi-record fields (when repeatable_field_name is set)

-- Verification (only if tables exist)
DO $$
DECLARE
  template_count INTEGER;
  field_count INTEGER;
  template_record RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_templates') THEN
    SELECT COUNT(*) INTO template_count
    FROM task_templates 
    WHERE slug = 'fire_extinguisher_inspection';
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'template_fields') THEN
      SELECT COUNT(*) INTO field_count
      FROM template_fields
      WHERE template_id IN (SELECT id FROM task_templates WHERE slug = 'fire_extinguisher_inspection');
    ELSE
      field_count := 0;
    END IF;
    
    -- Get template details for verification
    SELECT * INTO template_record
    FROM task_templates
    WHERE slug = 'fire_extinguisher_inspection';
    
    IF template_count = 1 THEN
      RAISE NOTICE '✅ Fire Extinguisher Inspection template created successfully';
      RAISE NOTICE '   Template ID: %', template_record.id;
      RAISE NOTICE '   Category: % (should be "fire")', template_record.category;
      RAISE NOTICE '   Frequency: %', template_record.frequency;
      RAISE NOTICE '   Repeatable field name: % (should be NULL)', template_record.repeatable_field_name;
      RAISE NOTICE '   Template fields created: %', field_count;
      RAISE NOTICE '   Evidence types: %', template_record.evidence_types;
      RAISE NOTICE '   Recurrence pattern date_of_month: %', (template_record.recurrence_pattern->>'date_of_month');
      RAISE NOTICE '   Default checklist items count: %', jsonb_array_length(COALESCE((template_record.recurrence_pattern->'default_checklist_items'), '[]'::jsonb));
    ELSE
      RAISE NOTICE '⚠️ Template creation may have failed. Template count: %', template_count;
    END IF;
  ELSE
    RAISE NOTICE '⚠️ task_templates table does not exist yet - skipping verification';
  END IF;
END $$;
