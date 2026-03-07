-- Migration: 20260305000000_seed_blue_plaster_register_template.sql
-- Description: Adds Blue Plaster Record template for SALSA certification compliance
-- Template: Blue Plaster Record (ad-hoc / triggered)
-- Critical: Required for SALSA compliance — tracks blue plaster usage in food production areas
-- Note: This migration will be skipped if task_templates table doesn't exist yet

-- Clean up existing template if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_templates') THEN
    -- Delete template fields if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'template_fields') THEN
      DELETE FROM template_fields
      WHERE template_id IN (SELECT id FROM task_templates WHERE slug = 'blue_plaster_record');
    END IF;

    -- Delete template
    DELETE FROM task_templates
    WHERE slug = 'blue_plaster_record';
  END IF;
END $$;

-- Blue Plaster Record Template
-- Only insert if task_templates table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_templates') THEN
    INSERT INTO task_templates (
      company_id,
      name,
      slug,
      description,
      category,
      audit_category,
      frequency,
      time_of_day,
      dayparts,
      recurrence_pattern,
      assigned_to_role,
      compliance_standard,
      is_critical,
      is_template_library,
      use_custom_fields,
      evidence_types,
      instructions,
      repeatable_field_name,
      triggers_contractor_on_failure,
      contractor_type
    ) VALUES (
      NULL,                            -- Global template (available to all companies)
      'Blue Plaster Record',
      'blue_plaster_record',
      'Record blue plaster application for SALSA compliance. Log the person, injury, plaster type, and application details.',
      'food_safety',
      'food_safety',
      'triggered',                     -- Ad-hoc task (can be started anytime)
      NULL,                            -- No scheduled time
      NULL,                            -- No dayparts
      jsonb_build_object(
        'is_register_template', TRUE   -- Flag to identify register-type templates
      ),
      'staff',                         -- Any staff member can log
      'SALSA (Safe and Local Supplier Approval)',
      TRUE,                            -- Critical compliance task
      TRUE,                            -- Library template
      TRUE,                            -- Uses custom fields form builder
      ARRAY['custom_fields'],          -- Custom fields mode
      'Purpose:
Record each instance of blue plaster application in the workplace. This register is required for SALSA certification and food safety compliance.

When to use:
Complete this form every time a blue metal-detectable plaster is applied to any member of staff working in a food production or handling area.

Method:
1. Record the name of the person who needs the plaster
2. Note the date and time of the incident
3. Describe the nature of the injury
4. Select the body location and plaster type
5. Record who applied the plaster
6. Update the removal/replacement time when applicable',
      NULL,                            -- No asset selection
      FALSE,                           -- Does not trigger contractor on failure
      NULL                             -- No contractor type
    );
  END IF;
END $$;

-- Custom fields for Blue Plaster Record
-- Only insert if both tables exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_templates')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'template_fields') THEN

    -- Field 1: Person's Name
    INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
    SELECT t.id, 'person_name', 'text', 'Person''s Name', TRUE, 1,
      'Full name of the person who received the blue plaster.',
      'e.g. John Smith'
    FROM task_templates t
    WHERE t.slug = 'blue_plaster_record'
      AND NOT EXISTS (SELECT 1 FROM template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'person_name');

    -- Field 2: Date of Incident
    INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT t.id, 'incident_date', 'date', 'Date of Incident', TRUE, 2,
      'Date when the plaster was applied.'
    FROM task_templates t
    WHERE t.slug = 'blue_plaster_record'
      AND NOT EXISTS (SELECT 1 FROM template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'incident_date');

    -- Field 3: Time of Incident
    INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT t.id, 'incident_time', 'time', 'Time of Incident', TRUE, 3,
      'Time when the plaster was applied.'
    FROM task_templates t
    WHERE t.slug = 'blue_plaster_record'
      AND NOT EXISTS (SELECT 1 FROM template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'incident_time');

    -- Field 4: Nature of Injury
    INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
    SELECT t.id, 'injury_description', 'text', 'Nature of Injury', TRUE, 4,
      'Brief description of the injury requiring a plaster.',
      'e.g. Small cut on index finger from knife'
    FROM task_templates t
    WHERE t.slug = 'blue_plaster_record'
      AND NOT EXISTS (SELECT 1 FROM template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'injury_description');

    -- Field 5: Body Location (select)
    INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text, options)
    SELECT t.id, 'body_location', 'select', 'Body Location', TRUE, 5,
      'Part of the body where the plaster was applied.',
      jsonb_build_object('choices', jsonb_build_array(
        'Finger', 'Hand', 'Wrist', 'Arm', 'Face', 'Head', 'Leg', 'Foot', 'Other'
      ))
    FROM task_templates t
    WHERE t.slug = 'blue_plaster_record'
      AND NOT EXISTS (SELECT 1 FROM template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'body_location');

    -- Field 6: Plaster Type (select)
    INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text, options)
    SELECT t.id, 'plaster_type', 'select', 'Plaster Type', TRUE, 6,
      'Type of plaster applied. Blue metal-detectable plasters must be used in food areas.',
      jsonb_build_object('choices', jsonb_build_array(
        'Blue Metal-Detectable', 'Blue Standard', 'Other'
      ))
    FROM task_templates t
    WHERE t.slug = 'blue_plaster_record'
      AND NOT EXISTS (SELECT 1 FROM template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'plaster_type');

    -- Field 7: Applied By
    INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
    SELECT t.id, 'applied_by_name', 'text', 'Applied By', TRUE, 7,
      'Name of the person who applied the plaster (first aider or colleague).',
      'e.g. Jane Doe'
    FROM task_templates t
    WHERE t.slug = 'blue_plaster_record'
      AND NOT EXISTS (SELECT 1 FROM template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'applied_by_name');

    -- Field 8: Removal / Replacement Time
    INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT t.id, 'removal_replacement_time', 'time', 'Removal / Replacement Time', FALSE, 8,
      'Time when the plaster was removed or replaced. Update this field later if needed.'
    FROM task_templates t
    WHERE t.slug = 'blue_plaster_record'
      AND NOT EXISTS (SELECT 1 FROM template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'removal_replacement_time');

    -- Field 9: Additional Notes
    INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
    SELECT t.id, 'notes', 'text', 'Additional Notes', FALSE, 9,
      'Any additional details, follow-up actions, or observations.',
      'e.g. Gloves also provided, plaster replaced at end of shift'
    FROM task_templates t
    WHERE t.slug = 'blue_plaster_record'
      AND NOT EXISTS (SELECT 1 FROM template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'notes');

  END IF;
END $$;

-- Verify the template was created
DO $$
DECLARE
  template_count INTEGER;
  field_count INTEGER;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_templates') THEN
    SELECT COUNT(*) INTO template_count
    FROM task_templates
    WHERE slug = 'blue_plaster_record';

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'template_fields') THEN
      SELECT COUNT(*) INTO field_count
      FROM template_fields
      WHERE template_id IN (SELECT id FROM task_templates WHERE slug = 'blue_plaster_record');
    ELSE
      field_count := 0;
    END IF;

    IF template_count = 1 THEN
      RAISE NOTICE 'Blue Plaster Record template created successfully';
      RAISE NOTICE 'Template fields created: %', field_count;
    ELSE
      RAISE NOTICE 'Template creation may have failed. Template count: %', template_count;
    END IF;
  ELSE
    RAISE NOTICE 'task_templates table does not exist yet - skipping verification';
  END IF;
END $$;
