-- Migration: 20250204000011_add_first_aid_kit_inspection_template.sql
-- Description: Adds Weekly First Aid Kit Inspection template to compliance library
-- Template: First Aid Kit Inspection - Weekly
-- Critical: Required for Health and Safety (First-Aid) Regulations 1981
-- Note: This migration will be skipped if task_templates table doesn't exist yet

-- Clean up existing template if it exists
-- Only delete if tables exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_templates') THEN
    -- Delete repeatable labels if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'template_repeatable_labels') THEN
      DELETE FROM template_repeatable_labels 
      WHERE template_id IN (SELECT id FROM task_templates WHERE slug = 'first_aid_kit_inspection');
    END IF;
    
    -- Delete template fields if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'template_fields') THEN
      DELETE FROM template_fields 
      WHERE template_id IN (SELECT id FROM task_templates WHERE slug = 'first_aid_kit_inspection');
    END IF;
    
    -- Delete template
    DELETE FROM task_templates 
    WHERE slug = 'first_aid_kit_inspection';
  END IF;
END $$;

-- Weekly First Aid Kit Inspection Template
-- Only insert if task_templates table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_templates') THEN
    INSERT INTO task_templates (
      company_id,
      name,
      slug,
      description,
      category,                        -- Using 'h_and_s' (Health & Safety) as per schema
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
      repeatable_field_name,           -- NULL = no asset selection (first aid kits are repeatable via labels)
      triggers_contractor_on_failure,
      contractor_type
    ) VALUES (
      NULL,                            -- Global template (available to all companies)
      'Weekly First Aid Kit Inspection',
      'first_aid_kit_inspection',
      'Comprehensive check of first aid supplies and equipment to ensure compliance with Health and Safety (First-Aid) Regulations 1981',
      'h_and_s',                       -- Health & Safety category (matches fire alarm template)
      'h_and_s',
      'weekly',
      '07:00',
      ARRAY['before_open'],
      jsonb_build_object(
        'daypart_times', jsonb_build_object('before_open', '07:00'),
        'default_checklist_items', jsonb_build_array(
          'Check fabric plasters - assorted sizes',
          'Check blue plasters for food handlers',
          'Check medium sterile dressings',
          'Check large sterile dressings',
          'Check burns dressings',
          'Check disposable gloves',
          'Check antiseptic wipes',
          'Check eye wash solution',
          'Check scissors and tweezers',
          'Check finger cots',
          'Check burns gel sachets',
          'Verify accident book is available and completed',
          'Restock any used or expired items'
        )
      ),
      'manager',
      'Health and Safety (First-Aid) Regulations 1981',
      TRUE,                            -- Critical compliance task
      TRUE,                            -- Library template
      ARRAY['pass_fail', 'photo', 'text_note'],  -- Includes photo for evidence, pass_fail for compliance, text_note for checklist
      'Purpose:
Ensure first aid kits are fully stocked, in-date, and compliant with health and safety regulations.

Importance:
Compliance with Health and Safety (First-Aid) Regulations 1981 and employee welfare obligations. Proper first aid equipment can prevent minor injuries from becoming major issues.

Method:
1. Check kit contents against the checklist
2. Replace used or expired items immediately
3. Confirm accident book is available and properly completed
4. Record findings and any actions taken
5. Initial and date the inspection

Special Requirements:
- Use blue detectable plasters in food preparation areas
- Ensure burns equipment is available in kitchens
- Restock immediately after any use
- Larger venues may require multiple kits based on staff count',
      NULL,                            -- NULL = no asset selection (first aid kits handled via template_repeatable_labels)
      FALSE,                           -- Does not trigger contractor on failure
      NULL                             -- No contractor type
    );
  END IF;
END $$;

-- Fields for Weekly First Aid Kit Inspection
-- Only insert if both tables exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_templates')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'template_fields') THEN
    -- Field 1: Date (Identification - field_order: 1)
    INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT t.id, 'inspection_date', 'date', 'Inspection Date', TRUE, 1, 
      'Date when the first aid kit inspection was performed. Use today''s date for scheduled inspections.'
    FROM task_templates t
    WHERE t.slug = 'first_aid_kit_inspection'
      AND NOT EXISTS (SELECT 1 FROM template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'inspection_date');

    -- Field 2: Location Selection (Primary Data - field_order: 2)
    INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT t.id, 'first_aid_kit_location', 'select', 'First Aid Kit Location', TRUE, 2,
      'Select the location of the first aid kit being inspected. Rotate through all locations to ensure all kits are checked regularly.'
    FROM task_templates t
    WHERE t.slug = 'first_aid_kit_inspection'
      AND NOT EXISTS (SELECT 1 FROM template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'first_aid_kit_location');

    -- Field 3: Overall Assessment (Validation - field_order: 11)
    INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT t.id, 'overall_assessment', 'pass_fail', 'Overall Assessment', TRUE, 11,
      'PASS if kit is fully stocked, all items are in-date, and accident book is available. FAIL if any items are missing, expired, or if accident book is not available.'
    FROM task_templates t
    WHERE t.slug = 'first_aid_kit_inspection'
      AND NOT EXISTS (SELECT 1 FROM template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'overall_assessment');

    -- Field 4: Documentation - Notes (field_order: 16)
    INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
    SELECT t.id, 'notes', 'text', 'Additional Notes', FALSE, 16,
      'Record any observations, issues, or actions taken. Be specific about what was found, what was restocked, and any items that need ordering.',
      'Enter any additional observations or actions taken...'
    FROM task_templates t
    WHERE t.slug = 'first_aid_kit_inspection'
      AND NOT EXISTS (SELECT 1 FROM template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'notes');

    -- Field 5: Sign-off (field_order: 25)
    INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT t.id, 'inspected_by_initials', 'text', 'Inspected By (Initials)', TRUE, 25,
      'Initials of the person who performed the inspection. This confirms the inspection was completed correctly.'
    FROM task_templates t
    WHERE t.slug = 'first_aid_kit_inspection'
      AND NOT EXISTS (SELECT 1 FROM template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'inspected_by_initials');
  END IF;
END $$;

-- Add default first aid kit location labels (users can add more via template editor)
-- Only insert if both tables exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_templates')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'template_repeatable_labels') THEN
    INSERT INTO template_repeatable_labels (template_id, label, label_value, is_default, display_order)
    SELECT t.id, 'Kitchen - First Aid Kit', 'Kitchen - First Aid Kit', TRUE, 1
    FROM task_templates t
    WHERE t.slug = 'first_aid_kit_inspection'
    ON CONFLICT DO NOTHING;

    INSERT INTO template_repeatable_labels (template_id, label, label_value, is_default, display_order)
    SELECT t.id, 'Front of House - First Aid Kit', 'Front of House - First Aid Kit', TRUE, 2
    FROM task_templates t
    WHERE t.slug = 'first_aid_kit_inspection'
    ON CONFLICT DO NOTHING;

    INSERT INTO template_repeatable_labels (template_id, label, label_value, is_default, display_order)
    SELECT t.id, 'Bar Area - First Aid Kit', 'Bar Area - First Aid Kit', TRUE, 3
    FROM task_templates t
    WHERE t.slug = 'first_aid_kit_inspection'
    ON CONFLICT DO NOTHING;

    INSERT INTO template_repeatable_labels (template_id, label, label_value, is_default, display_order)
    SELECT t.id, 'Office - First Aid Kit', 'Office - First Aid Kit', TRUE, 4
    FROM task_templates t
    WHERE t.slug = 'first_aid_kit_inspection'
    ON CONFLICT DO NOTHING;

    INSERT INTO template_repeatable_labels (template_id, label, label_value, is_default, display_order)
    SELECT t.id, 'Storage Area - First Aid Kit', 'Storage Area - First Aid Kit', TRUE, 5
    FROM task_templates t
    WHERE t.slug = 'first_aid_kit_inspection'
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Verify the template was created (only if tables exist)
DO $$
DECLARE
  template_count INTEGER;
  field_count INTEGER;
  label_count INTEGER;
  repeatable_field TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_templates') THEN
    SELECT COUNT(*) INTO template_count
    FROM task_templates 
    WHERE slug = 'first_aid_kit_inspection';
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'template_fields') THEN
      SELECT COUNT(*) INTO field_count
      FROM template_fields
      WHERE template_id IN (SELECT id FROM task_templates WHERE slug = 'first_aid_kit_inspection');
    ELSE
      field_count := 0;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'template_repeatable_labels') THEN
      SELECT COUNT(*) INTO label_count
      FROM template_repeatable_labels
      WHERE template_id IN (SELECT id FROM task_templates WHERE slug = 'first_aid_kit_inspection');
    ELSE
      label_count := 0;
    END IF;
    
    SELECT repeatable_field_name INTO repeatable_field
    FROM task_templates 
    WHERE slug = 'first_aid_kit_inspection';
    
    IF template_count = 1 THEN
      RAISE NOTICE '✅ First Aid Kit Inspection template created successfully';
      RAISE NOTICE '✅ Template fields created: %', field_count;
      RAISE NOTICE '✅ Location labels created: %', label_count;
      IF repeatable_field IS NULL THEN
        RAISE NOTICE '✅ repeatable_field_name is NULL (asset selection hidden)';
      ELSE
        RAISE WARNING '⚠️ repeatable_field_name is set to: %', repeatable_field;
      END IF;
    ELSE
      RAISE NOTICE '⚠️ Template creation may have failed. Template count: %', template_count;
    END IF;
  ELSE
    RAISE NOTICE '⚠️ task_templates table does not exist yet - skipping verification';
  END IF;
END $$;
