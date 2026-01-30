-- ============================================================================
-- Migration: Fire Drill Execution & Documentation Template
-- Description: Biannual fire drill execution with evacuation timing, headcount,
--              fire warden verification, and escalation workflows
-- ============================================================================
-- Note: This migration will be skipped if required tables don't exist yet

DO $$
BEGIN
  -- Only proceed if required tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_templates')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'template_fields') THEN

    -- Clean up existing template if it exists (by slug)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'template_repeatable_labels') THEN
      DELETE FROM public.template_repeatable_labels
      WHERE template_id IN (
        SELECT id FROM public.task_templates
        WHERE company_id IS NULL
          AND slug = 'fire_drill_execution_documentation'
      );
    END IF;

    DELETE FROM public.template_fields
    WHERE template_id IN (
      SELECT id FROM public.task_templates
      WHERE company_id IS NULL
        AND slug = 'fire_drill_execution_documentation'
    );

    DELETE FROM public.task_templates
    WHERE company_id IS NULL
      AND slug = 'fire_drill_execution_documentation';

    -- Create the template
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
  is_active,
  evidence_types,
  instructions,
  repeatable_field_name,
  asset_type,
  requires_sop,
  triggers_contractor_on_failure,
  contractor_type
) VALUES (
  NULL, -- Global template available to all companies
  'Fire Drill Execution & Documentation',
  'fire_drill_execution_documentation',
  'Biannual fire drill execution and documentation. Test alarm activation, record evacuation timing, conduct headcount at assembly points, verify fire warden duties, and document all findings. Critical for legal compliance and staff safety.',
  'h_and_s',
  'fire_safety', -- Category: Health & Safety / Fire Safety
  'monthly', -- Biannual (every 6 months) - using monthly frequency, scheduling handled via recurrence_pattern
  '14:00', -- During service hours
  ARRAY['during_service'],
  jsonb_build_object(
    'daypart_times', jsonb_build_object('during_service', '14:00'),
    'default_checklist_items', jsonb_build_array(
      'Alarm activation test',
      'Evacuation timing recorded',
      'Assembly point headcount',
      'Roll call completion',
      'Special assistance requirements addressed'
    ),
    'interval_months', 6 -- Biannual: every 6 months
  ),
  'manager',
  'Regulatory Reform (Fire Safety) Order 2005',
  TRUE, -- Critical compliance task (legal requirement)
  TRUE, -- Library template
  TRUE, -- Active
  ARRAY['yes_no_checklist', 'pass_fail', 'photo', 'text_note'], -- Yes/No checklist + Pass/Fail + Photos + Text notes
  'Conduct a full fire drill evacuation. Activate alarm system, record evacuation start and completion times, conduct headcount at assembly points, verify all staff and visitors are accounted for, confirm fire wardens performed duties, and verify alarm was audible in all areas. Document any gaps or failures. Minor failures (slightly over time) require retraining. Major failures (missing staff/areas) require additional drill within 2 weeks. Critical failures (system failures) require immediate retraining and system repair.',
  NULL, -- NO asset selection (repeatable_field_name = NULL)
  NULL, -- No asset type filter
  TRUE, -- Requires SOP link: "Fire Evacuation Procedure"
  TRUE, -- Triggers contractor on failure (alarm maintenance company)
  'fire_engineer' -- Contractor type: fire engineer/alarm maintenance
);

-- ============================================================================
-- Template Fields
-- ============================================================================

    -- Drill Information
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT id, 'drill_date', 'date', 'Drill Date', TRUE, 1,
      'Date when the fire drill was conducted.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'fire_drill_execution_documentation';

    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
    SELECT id, 'drill_coordinator', 'text', 'Drill Coordinator Name', TRUE, 2,
      'Name of the person coordinating the fire drill.',
      'e.g., John Smith'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'fire_drill_execution_documentation';

    -- Evacuation Timing
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
    SELECT id, 'alarm_activation_time', 'text', 'Alarm Activation Time', TRUE, 3,
      'Time when the fire alarm was activated (HH:MM format).',
      'e.g., 14:05'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'fire_drill_execution_documentation';

    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
    SELECT id, 'evacuation_start_time', 'text', 'Evacuation Start Time', TRUE, 4,
      'Time when evacuation began (HH:MM format).',
      'e.g., 14:05'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'fire_drill_execution_documentation';

    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
    SELECT id, 'evacuation_completion_time', 'text', 'Evacuation Completion Time', TRUE, 5,
      'Time when all personnel reached assembly point (HH:MM format).',
      'e.g., 14:07'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'fire_drill_execution_documentation';

    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
    SELECT id, 'total_evacuation_time_minutes', 'number', 'Total Evacuation Time (minutes)', TRUE, 6,
      'Total time from alarm activation to completion (in minutes). Target: under 3 minutes.',
      'e.g., 2.5'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'fire_drill_execution_documentation';

    -- Headcount Information
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
    SELECT id, 'expected_staff_count', 'number', 'Expected Staff Count', TRUE, 7,
      'Total number of staff expected to be on-site during the drill.',
      'e.g., 25'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'fire_drill_execution_documentation';

    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
    SELECT id, 'actual_evacuated_count', 'number', 'Actual Evacuated Count', TRUE, 8,
      'Total number of staff and visitors actually evacuated to assembly point.',
      'e.g., 27'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'fire_drill_execution_documentation';

    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
    SELECT id, 'visitors_contractors_count', 'number', 'Visitors/Contractors Count', FALSE, 9,
      'Number of visitors or contractors present during the drill.',
      'e.g., 2'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'fire_drill_execution_documentation';

-- Note: Yes/No checklist items come from default_checklist_items in recurrence_pattern above
-- They will appear as yes/no questions for the drill success criteria

    -- Overall Assessment
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT id, 'drill_assessment', 'pass_fail', 'Drill Assessment', TRUE, 10,
      'PASS: Drill completed successfully - full evacuation under 3 minutes, all staff accounted for, fire wardens performed duties, alarm audible. FAIL: Drill incomplete or unsuccessful - timing exceeded, missing staff, system failures, or other critical issues.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'fire_drill_execution_documentation';

    -- Fire Warden Verification
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
    SELECT id, 'fire_warden_name', 'text', 'Fire Warden Name (Sign-off)', TRUE, 11,
      'Name of the fire warden who verified the drill completion.',
      'e.g., Jane Doe'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'fire_drill_execution_documentation';

    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT id, 'fire_warden_verified', 'pass_fail', 'Fire Warden Verified', TRUE, 12,
      'YES: Fire warden has verified and signed off on the drill completion. NO: Verification pending.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'fire_drill_execution_documentation';

    -- Alarm System Check
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT id, 'alarm_audible_all_areas', 'pass_fail', 'Alarm Audible in All Areas', TRUE, 13,
      'YES: Alarm was clearly audible in all areas of the building. NO: Alarm not audible in some areas (system failure).'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'fire_drill_execution_documentation';

    -- Severity Level (if failure)
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, options)
    SELECT id, 'severity_level', 'select', 'Severity Level (if failure)', FALSE, 14,
      'Select the severity level based on drill performance.',
      jsonb_build_array(
        jsonb_build_object('value', 'minor', 'label', 'Minor: Slightly over time (3-4 minutes)'),
        jsonb_build_object('value', 'major', 'label', 'Major: Missing staff/areas not evacuated (5+ minutes)'),
        jsonb_build_object('value', 'critical', 'label', 'Critical: System failures or no evacuation')
      )
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'fire_drill_execution_documentation';

    -- Corrective Action Taken
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, options)
    SELECT id, 'corrective_action', 'select', 'Corrective Action Taken', FALSE, 15,
      'Select the corrective action taken based on severity level.',
      jsonb_build_array(
        jsonb_build_object('value', 'minor_retrain', 'label', 'Minor: Retrain specific staff/departments'),
        jsonb_build_object('value', 'major_additional_drill', 'label', 'Major: Additional drill required within 2 weeks'),
        jsonb_build_object('value', 'critical_immediate', 'label', 'Critical: Immediate retraining + system repair')
      )
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'fire_drill_execution_documentation';

    -- Re-check Required
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT id, 'recheck_required', 'pass_fail', 'Re-check Required (Additional Drill)', FALSE, 16,
      'YES: Additional drill required within 30 days for major/critical failures. NO: Re-check not required.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'fire_drill_execution_documentation';

    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT id, 'recheck_scheduled_date', 'date', 'Re-check Scheduled Date (if required)', FALSE, 17,
      'Date when the additional drill is scheduled (within 30 days for major/critical failures).'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'fire_drill_execution_documentation';

    -- Escalation
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT id, 'fire_safety_manager_notified', 'pass_fail', 'Fire Safety Manager Notified (Major/Critical)', FALSE, 18,
      'YES: Fire safety manager has been notified of major or critical drill failures. NO: Notification pending or not required.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'fire_drill_execution_documentation';

    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT id, 'hs_officer_notified', 'pass_fail', 'H&S Officer Notified (Major/Critical)', FALSE, 19,
      'YES: Health & Safety officer has been notified of major or critical drill failures. NO: Notification pending or not required.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'fire_drill_execution_documentation';

    -- Training Records
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
    SELECT id, 'retraining_scheduled', 'text', 'Retraining Scheduled (if required)', FALSE, 20,
      'Document any retraining sessions scheduled as a result of drill findings.',
      'e.g., Kitchen staff retraining scheduled for 2024-02-15'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'fire_drill_execution_documentation';

    -- Notes
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
    SELECT id, 'drill_notes', 'text', 'Additional Notes', FALSE, 21,
      'Any additional observations or notes from the fire drill.',
      'e.g., Assembly point well-organized, all fire wardens performed duties correctly.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'fire_drill_execution_documentation';

    -- Photo Evidence
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT id, 'assembly_point_photos', 'photo', 'Assembly Point Photos', FALSE, 22,
      'Upload photos showing the assembly point during headcount.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'fire_drill_execution_documentation';

    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT id, 'evacuation_photos', 'photo', 'Evacuation Process Photos', FALSE, 23,
      'Upload photos documenting the evacuation process (if applicable).'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'fire_drill_execution_documentation';

    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT id, 'headcount_sheet_photos', 'photo', 'Headcount Sheet Photos', FALSE, 24,
      'Upload photos of the headcount sheets showing staff/visitor counts.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'fire_drill_execution_documentation';

    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT id, 'training_records_photos', 'photo', 'Training Records Photos (if retraining)', FALSE, 25,
      'Upload photos of training records if retraining was conducted.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'fire_drill_execution_documentation';

    RAISE NOTICE 'Seeded fire drill execution & documentation template';

  ELSE
    RAISE NOTICE '⚠️ Required tables (task_templates, template_fields) do not exist yet - skipping fire drill template seed';
  END IF;
END $$;

