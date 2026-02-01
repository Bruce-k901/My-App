-- Migration: 20250204000008_add_fire_alarm_test_template.sql
-- Description: Adds Weekly Fire Alarm Test template to compliance library
-- Template: Fire Alarm Test - Weekly
-- Critical: Failure triggers fire engineer contractor callout
-- Note: This migration will be skipped if task_templates table doesn't exist yet

-- Clean up: Delete existing template and all its fields/labels if it exists
-- Only delete if tables exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_templates') THEN
    -- Delete repeatable labels if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'template_repeatable_labels') THEN
      DELETE FROM public.template_repeatable_labels 
      WHERE template_id IN (SELECT id FROM task_templates WHERE slug = 'fire_alarm_test_weekly');
    END IF;
    
    -- Delete template fields if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'template_fields') THEN
      DELETE FROM public.template_fields 
      WHERE template_id IN (SELECT id FROM task_templates WHERE slug = 'fire_alarm_test_weekly');
    END IF;
    
    -- Delete template
    DELETE FROM public.task_templates 
    WHERE slug = 'fire_alarm_test_weekly';
  END IF;
END $$;

-- Weekly Fire Alarm Test Template
-- Create fresh template with checklist items in recurrence_pattern
-- Only insert if task_templates table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_templates') THEN
    INSERT INTO public.task_templates (
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
      evidence_types,
      instructions,
      repeatable_field_name,
      triggers_contractor_on_failure,
      contractor_type
    ) VALUES (
      NULL, -- Global template (available to all companies)
      'Test fire alarms and emergency lighting',
      'fire_alarm_test_weekly',
      'Weekly testing of fire alarms and emergency lighting systems. Verify operational status and escalate any faults immediately.',
      'h_and_s',
      'fire_safety',
      'weekly',
      '09:00',
      ARRAY['before_open'],
      jsonb_build_object(
        'daypart_times', jsonb_build_object('before_open', '09:00'),
        'default_checklist_items', jsonb_build_array(
          'Warn all staff that a fire alarm test is about to take place',
          'Select a different call point each week (rotate through all call points)',
          'Activate the call point using the test key or break-glass cover',
          'Verify all sounders work - check alarm can be heard everywhere (including toilets and storerooms)',
          'Confirm all staff heard the alarm',
          'Silence and reset the system using the fire panel',
          'Record the test date, time, call point location, and result in the fire logbook',
          'If any sounder did not work, report immediately to fire alarm contractor',
          'Test emergency lighting by switching off normal lighting (monthly visual check)',
          'Check all emergency light fittings come on and are bright enough',
          'Note any failures (dim, flickering, or dead units)',
          'Restore power and confirm lights return to charge mode (green LEDs should glow)',
          'Record emergency lighting test in emergency lighting logbook'
        )
      ),
      'manager',
      'Fire Safety Order 2005',
      TRUE, -- Critical compliance task
      TRUE, -- Library template
      ARRAY['pass_fail', 'photo', 'text_note'], -- Includes pass_fail for test results, photo for evidence, text_note for notes
      'Purpose:
Test fire alarm system and emergency lighting to ensure they function correctly in an emergency

Importance:
Required by Fire Safety Order 2005. Faulty alarms can result in enforcement action, fines, or prosecution. Lives depend on working fire alarms.

Method:
Test a different call point each week. Verify all sounders activate. Test emergency lighting monthly. Document all tests in fire logbook.

Special Requirements:
If any sounder or emergency light fails, report immediately to fire alarm contractor. Do not delay - this is a critical safety issue.',
      NULL, -- No repeatable_field_name - call points are handled via template_repeatable_labels and select field, not asset selection
      TRUE, -- CRITICAL: Triggers contractor callout on failure
      'fire_engineer' -- Contractor type for fire alarm engineers
    );
  END IF;
END $$;

-- Fields for Weekly Fire Alarm Test
-- Only insert if both tables exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_templates')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'template_fields') THEN
    -- Test Date field
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT t.id, 'test_date', 'date', 'Test Date', true, 1, 'Date when the fire alarm test was performed'
    FROM task_templates t
    WHERE t.slug = 'fire_alarm_test_weekly'
      AND NOT EXISTS (SELECT 1 FROM public.template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'test_date');

    -- Fire Alarm Call Point field (select dropdown - not asset-based)
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT t.id, 'fire_alarm_call_point', 'select', 'Fire Alarm Call Point', true, 2, 'Select the call point being tested this week. Rotate through all call points.'
    FROM task_templates t
    WHERE t.slug = 'fire_alarm_test_weekly'
      AND NOT EXISTS (SELECT 1 FROM public.template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'fire_alarm_call_point');

    -- Alarm Activated Pass/Fail field (CRITICAL - failure triggers callout)
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT t.id, 'alarm_activated', 'pass_fail', 'Alarm Activated Successfully', true, 3, 'PASS if alarm activated when call point was pressed. FAIL if alarm did not activate - this will trigger a fire engineer callout.'
    FROM task_templates t
    WHERE t.slug = 'fire_alarm_test_weekly'
      AND NOT EXISTS (SELECT 1 FROM public.template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'alarm_activated');

    -- All Staff Heard Pass/Fail field
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT t.id, 'all_staff_heard', 'pass_fail', 'All Staff Heard the Alarm', true, 4, 'PASS if all staff confirmed they heard the alarm. FAIL if alarm could not be heard in all areas.'
    FROM task_templates t
    WHERE t.slug = 'fire_alarm_test_weekly'
      AND NOT EXISTS (SELECT 1 FROM public.template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'all_staff_heard');

    -- Emergency Lighting Test Pass/Fail field (monthly)
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT t.id, 'emergency_lighting_test', 'pass_fail', 'Emergency Lighting Test (Monthly)', false, 5, 'Test emergency lighting monthly. PASS if all emergency lights activate and are bright enough. FAIL if any lights are dim, flickering, or dead.'
    FROM task_templates t
    WHERE t.slug = 'fire_alarm_test_weekly'
      AND NOT EXISTS (SELECT 1 FROM public.template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'emergency_lighting_test');

    -- Issues/Notes field
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT t.id, 'issues', 'text', 'Issues or Observations', false, 6, 'Record any issues, observations, or additional notes about the test'
    FROM task_templates t
    WHERE t.slug = 'fire_alarm_test_weekly'
      AND NOT EXISTS (SELECT 1 FROM public.template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'issues');

    -- Manager Initials field
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT t.id, 'manager_initials', 'text', 'Tested By (Initials)', true, 7, 'Initials of the person who performed the test'
    FROM task_templates t
    WHERE t.slug = 'fire_alarm_test_weekly'
      AND NOT EXISTS (SELECT 1 FROM public.template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'manager_initials');
  END IF;
END $$;

-- Add default fire alarm call point labels (users can add more via template editor)
-- Only insert if both tables exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_templates')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'template_repeatable_labels') THEN
    INSERT INTO public.template_repeatable_labels (template_id, label, label_value, is_default, display_order)
    SELECT t.id, 'Call Point 1 - Front Entrance', 'Call Point 1 - Front Entrance', true, 1
    FROM task_templates t
    WHERE t.slug = 'fire_alarm_test_weekly'
    ON CONFLICT DO NOTHING;

    INSERT INTO public.template_repeatable_labels (template_id, label, label_value, is_default, display_order)
    SELECT t.id, 'Call Point 2 - Kitchen', 'Call Point 2 - Kitchen', true, 2
    FROM task_templates t
    WHERE t.slug = 'fire_alarm_test_weekly'
    ON CONFLICT DO NOTHING;

    INSERT INTO public.template_repeatable_labels (template_id, label, label_value, is_default, display_order)
    SELECT t.id, 'Call Point 3 - Bar Area', 'Call Point 3 - Bar Area', true, 3
    FROM task_templates t
    WHERE t.slug = 'fire_alarm_test_weekly'
    ON CONFLICT DO NOTHING;

    INSERT INTO public.template_repeatable_labels (template_id, label, label_value, is_default, display_order)
    SELECT t.id, 'Call Point 4 - Back Office', 'Call Point 4 - Back Office', true, 4
    FROM task_templates t
    WHERE t.slug = 'fire_alarm_test_weekly'
    ON CONFLICT DO NOTHING;

    INSERT INTO public.template_repeatable_labels (template_id, label, label_value, is_default, display_order)
    SELECT t.id, 'Call Point 5 - Storage Area', 'Call Point 5 - Storage Area', true, 5
    FROM task_templates t
    WHERE t.slug = 'fire_alarm_test_weekly'
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Verify the template was created (only if tables exist)
DO $$
DECLARE
  template_count INTEGER;
  field_count INTEGER;
  label_count INTEGER;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_templates') THEN
    SELECT COUNT(*) INTO template_count
    FROM task_templates 
    WHERE slug = 'fire_alarm_test_weekly';
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'template_fields') THEN
      SELECT COUNT(*) INTO field_count
      FROM template_fields
      WHERE template_id IN (SELECT id FROM task_templates WHERE slug = 'fire_alarm_test_weekly');
    ELSE
      field_count := 0;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'template_repeatable_labels') THEN
      SELECT COUNT(*) INTO label_count
      FROM template_repeatable_labels
      WHERE template_id IN (SELECT id FROM task_templates WHERE slug = 'fire_alarm_test_weekly');
    ELSE
      label_count := 0;
    END IF;
    
    IF template_count = 1 THEN
      RAISE NOTICE '✅ Fire Alarm Test template created successfully';
      RAISE NOTICE '✅ Template fields created: %', field_count;
      RAISE NOTICE '✅ Call point labels created: %', label_count;
    ELSE
      RAISE NOTICE '⚠️ Template creation may have failed. Template count: %', template_count;
    END IF;
  ELSE
    RAISE NOTICE '⚠️ task_templates table does not exist yet - skipping verification';
  END IF;
END $$;
