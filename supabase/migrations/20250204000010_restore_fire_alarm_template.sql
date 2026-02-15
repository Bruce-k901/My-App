-- Migration: 20250204000010_restore_fire_alarm_template.sql
-- Description: Restores fire alarm template if missing and ensures repeatable_field_name = NULL
-- Note: This migration will be skipped if task_templates table doesn't exist yet

-- Check if template exists, if not, recreate it
-- Only run if task_templates table exists
DO $$
DECLARE
  template_exists BOOLEAN;
  template_id_val UUID;
BEGIN
  -- Check if table exists first
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_templates') THEN
    -- Check if template exists
    SELECT EXISTS(SELECT 1 FROM task_templates WHERE slug = 'fire_alarm_test_weekly') INTO template_exists;
  
  IF NOT template_exists THEN
    RAISE NOTICE 'Template not found, recreating fire alarm template...';
    
    -- Recreate the template (from migration 20250204000008)
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
      NULL,
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
      TRUE,
      TRUE,
      ARRAY['pass_fail', 'photo', 'text_note'],
      'Purpose:
Test fire alarm system and emergency lighting to ensure they function correctly in an emergency

Importance:
Required by Fire Safety Order 2005. Faulty alarms can result in enforcement action, fines, or prosecution. Lives depend on working fire alarms.

Method:
Test a different call point each week. Verify all sounders activate. Test emergency lighting monthly. Document all tests in fire logbook.

Special Requirements:
If any sounder or emergency light fails, report immediately to fire alarm contractor. Do not delay - this is a critical safety issue.',
      NULL, -- CRITICAL: NULL means no asset selection
      TRUE,
      'fire_engineer'
    ) RETURNING id INTO template_id_val;
    
    RAISE NOTICE '✅ Fire alarm template created with ID: %', template_id_val;
    
    -- Add template fields (only if table exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'template_fields') THEN
      INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
      VALUES
        (template_id_val, 'test_date', 'date', 'Test Date', true, 1, 'Date when the fire alarm test was performed'),
        (template_id_val, 'fire_alarm_call_point', 'select', 'Fire Alarm Call Point', true, 2, 'Select the call point being tested this week. Rotate through all call points.'),
        (template_id_val, 'alarm_activated', 'pass_fail', 'Alarm Activated Successfully', true, 3, 'PASS if alarm activated when call point was pressed. FAIL if alarm did not activate - this will trigger a fire engineer callout.'),
        (template_id_val, 'all_staff_heard', 'pass_fail', 'All Staff Heard the Alarm', true, 4, 'PASS if all staff confirmed they heard the alarm. FAIL if alarm could not be heard in all areas.'),
        (template_id_val, 'emergency_lighting_test', 'pass_fail', 'Emergency Lighting Test (Monthly)', false, 5, 'Test emergency lighting monthly. PASS if all emergency lights activate and are bright enough. FAIL if any lights are dim, flickering, or dead.'),
        (template_id_val, 'issues', 'text', 'Issues or Observations', false, 6, 'Record any issues, observations, or additional notes about the test'),
        (template_id_val, 'manager_initials', 'text', 'Tested By (Initials)', true, 7, 'Initials of the person who performed the test');
    END IF;
    
    -- Add default call point labels (only if table exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'template_repeatable_labels') THEN
      INSERT INTO public.template_repeatable_labels (template_id, label, label_value, is_default, display_order)
      VALUES
        (template_id_val, 'Call Point 1 - Front Entrance', 'Call Point 1 - Front Entrance', true, 1),
        (template_id_val, 'Call Point 2 - Kitchen', 'Call Point 2 - Kitchen', true, 2),
        (template_id_val, 'Call Point 3 - Bar Area', 'Call Point 3 - Bar Area', true, 3),
        (template_id_val, 'Call Point 4 - Back Office', 'Call Point 4 - Back Office', true, 4),
        (template_id_val, 'Call Point 5 - Storage Area', 'Call Point 5 - Storage Area', true, 5);
    END IF;
    
    RAISE NOTICE '✅ Template fields and call point labels created';
  ELSE
    RAISE NOTICE 'Template exists, updating repeatable_field_name to NULL...';
    
    -- Template exists, just ensure repeatable_field_name is NULL
    UPDATE public.task_templates
    SET repeatable_field_name = NULL
    WHERE slug = 'fire_alarm_test_weekly'
      AND (repeatable_field_name IS NOT NULL);
    
    RAISE NOTICE '✅ Template updated successfully';
  END IF;
  ELSE
    RAISE NOTICE '⚠️ task_templates table does not exist yet - skipping template restoration';
  END IF;
END $$;

-- Verify the template exists and has correct settings (only if table exists)
DO $$
DECLARE
  template_count INTEGER;
  repeatable_field TEXT;
BEGIN
  -- Check if table exists first
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_templates') THEN
    -- Check if template exists
    SELECT COUNT(*) INTO template_count
    FROM task_templates 
    WHERE slug = 'fire_alarm_test_weekly';
    
    IF template_count = 1 THEN
      -- Get repeatable_field_name value
      SELECT repeatable_field_name INTO repeatable_field
      FROM task_templates 
      WHERE slug = 'fire_alarm_test_weekly';
      
      IF repeatable_field IS NULL THEN
        RAISE NOTICE '✅ Fire alarm template verified: repeatable_field_name is NULL (asset selection hidden)';
      ELSE
        RAISE WARNING '⚠️ Fire alarm template has repeatable_field_name: %', repeatable_field;
      END IF;
    ELSE
      RAISE NOTICE '⚠️ Fire alarm template not found after migration';
    END IF;
  ELSE
    RAISE NOTICE '⚠️ task_templates table does not exist yet - skipping verification';
  END IF;
END $$;

