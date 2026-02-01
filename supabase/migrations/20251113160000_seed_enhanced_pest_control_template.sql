-- ============================================================================
-- Migration: Enhanced Pest Control Device Inspection Template
-- Description: Comprehensive weekly pest control device inspection with device mapping,
--              per-device pass/fail criteria, severity levels, and escalation workflows
-- ============================================================================
-- Note: This migration will be skipped if required tables don't exist yet

DO $$
BEGIN
  -- Only proceed if required tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_templates')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'template_fields') THEN

    -- Clean up ALL existing pest control templates (including relics)
    -- Remove template fields for all pest control templates
    DELETE FROM public.template_fields
    WHERE template_id IN (
      SELECT id FROM public.task_templates
      WHERE (
        (company_id IS NULL AND slug = 'pest_control_device_inspection')
        OR slug = 'weekly_pest_control_inspection'
        OR slug LIKE '%pest%control%'
        OR (name ILIKE '%pest%control%' AND slug != 'pest_control_device_inspection')
      )
    );

    -- Remove repeatable labels
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'template_repeatable_labels') THEN
      DELETE FROM public.template_repeatable_labels
      WHERE template_id IN (
        SELECT id FROM public.task_templates
        WHERE (
          (company_id IS NULL AND slug = 'pest_control_device_inspection')
          OR slug = 'weekly_pest_control_inspection'
          OR slug LIKE '%pest%control%'
          OR (name ILIKE '%pest%control%' AND slug != 'pest_control_device_inspection')
        )
      );
    END IF;

    -- Remove the templates themselves
    DELETE FROM public.task_templates
    WHERE (
      (company_id IS NULL AND slug = 'pest_control_device_inspection')
      OR slug = 'weekly_pest_control_inspection'
      OR slug LIKE '%pest%control%'
      OR (name ILIKE '%pest%control%' AND slug != 'pest_control_device_inspection')
    );

    -- Create the enhanced template
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
  'Pest Control Device Inspection',
  'pest_control_device_inspection',
  'Weekly inspection of all pest control devices including rodent bait stations, fly killer units, insectocutors, and bird deterrent systems. Document device condition, check for pest activity, and trigger immediate contractor callout if activity is detected.',
  'food_safety',
  'cleaning_premises', -- Category: Food Safety / Cleaning & Premises
  'weekly',
  '07:00',
  ARRAY['before_open'],
  jsonb_build_object(
    'daypart_times', jsonb_build_object('before_open', '07:00'),
    'default_checklist_items', jsonb_build_array(
      'Device intact and secure',
      'No pest activity signs around unit',
      'Bait/sticky board not full/expired',
      'Clean and operational',
      'Correctly positioned'
    )
  ),
  'manager',
  'Food Safety Act 1990, Food Hygiene Regulations',
  TRUE, -- Critical compliance task
  TRUE, -- Library template
  TRUE, -- Active
  ARRAY['yes_no_checklist', 'pass_fail', 'photo'], -- Yes/No checklist + Pass/Fail + Photos
  'Inspect all pest control devices systematically. For each device, verify it is intact, secure, clean, operational, and correctly positioned. Check for any signs of pest activity (droppings, gnaw marks, dead insects, etc.). Document findings with photos. If ANY pest activity is found, immediately isolate the affected area, assess severity, and trigger contractor callout. Critical findings require area closure and EHO notification.',
  NULL, -- NO asset selection (repeatable_field_name = NULL)
  NULL, -- No asset type filter
  TRUE, -- Requires SOP link: "Pest Control Monitoring Procedure"
  TRUE, -- Triggers contractor on failure
  'pest_control' -- Contractor type
);

-- ============================================================================
-- Template Fields
-- ============================================================================

    -- Inspection Information
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT id, 'inspection_date', 'date', 'Inspection Date', TRUE, 1,
      'Date when the pest control device inspection was completed.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'pest_control_device_inspection';

    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
    SELECT id, 'inspector_name', 'text', 'Inspector Name', TRUE, 2,
      'Name of the person conducting the pest control device inspection.',
      'e.g., John Smith'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'pest_control_device_inspection';

    -- Device Type Selection
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, options)
    SELECT id, 'device_type', 'select', 'Device Type', TRUE, 3,
      'Select the type of pest control device being inspected.',
      jsonb_build_array(
        jsonb_build_object('value', 'rodent_bait_station_external', 'label', 'Rodent Bait Station (External)'),
        jsonb_build_object('value', 'fly_killer_unit_internal', 'label', 'Fly Killer Unit (Internal)'),
        jsonb_build_object('value', 'insectocutor', 'label', 'Insectocutor'),
        jsonb_build_object('value', 'bird_deterrent', 'label', 'Bird Deterrent System'),
        jsonb_build_object('value', 'other', 'label', 'Other Device')
      )
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'pest_control_device_inspection';

    -- Device Location (text field - not repeatable)
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
    SELECT id, 'device_location', 'text', 'Device Location(s)', TRUE, 4,
      'Enter the specific location(s) of the device(s) inspected (e.g., "Kitchen - Back Door", "Storage Room A", "External - Loading Bay"). List multiple locations if inspecting multiple devices.',
      'e.g., Kitchen - Back Door, Storage Room A, External - Loading Bay'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'pest_control_device_inspection';

    -- Overall Assessment (Pass/Fail for all devices)
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT id, 'overall_assessment', 'pass_fail', 'Overall Assessment', TRUE, 5,
      'PASS: All devices meet inspection criteria. FAIL: One or more devices fail criteria or pest activity detected. Failure will trigger contractor callout workflow.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'pest_control_device_inspection';

-- Note: Yes/No checklist items come from default_checklist_items in recurrence_pattern above
-- They will appear as yes/no questions for the overall inspection

    -- Immediate Action (if failure)
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT id, 'immediate_action_taken', 'pass_fail', 'Immediate Action: Isolate Affected Area (if contamination risk)', FALSE, 6,
      'YES: Affected area has been isolated if contamination risk exists. NO: Isolation not required or pending.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'pest_control_device_inspection';

    -- Severity Level (if failure)
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, options)
    SELECT id, 'severity_level', 'select', 'Severity Level (if failure)', FALSE, 7,
      'Select the severity level if pest activity or device failure is detected.',
      jsonb_build_array(
        jsonb_build_object('value', 'minor', 'label', 'Minor: Device needs maintenance/cleaning'),
        jsonb_build_object('value', 'major', 'label', 'Major: Single pest sighting/evidence'),
        jsonb_build_object('value', 'critical', 'label', 'Critical: Multiple pests or infestation signs')
      )
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'pest_control_device_inspection';

    -- Corrective Action Taken
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, options)
    SELECT id, 'corrective_action', 'select', 'Corrective Action Taken', FALSE, 8,
      'Select the corrective action taken based on severity level.',
      jsonb_build_array(
        jsonb_build_object('value', 'minor_maintenance', 'label', 'Minor: Schedule contractor maintenance'),
        jsonb_build_object('value', 'major_callout', 'label', 'Major: Immediate contractor call-out required'),
        jsonb_build_object('value', 'critical_closure', 'label', 'Critical: Close affected area, deep clean, pest control emergency service')
      )
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'pest_control_device_inspection';

    -- Re-check Required
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT id, 'recheck_required', 'pass_fail', '24-Hour Follow-up Inspection Required (Major/Critical)', FALSE, 9,
      'YES: 24-hour follow-up inspection has been scheduled or completed for major/critical issues. NO: Re-check pending or not required.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'pest_control_device_inspection';

    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
    SELECT id, 'recheck_date_time', 'text', 'Re-check Date & Time (if required)', FALSE, 10,
      'Enter the date and time when re-check was or will be completed (for major/critical issues).',
      'e.g., 2024-01-15 14:30'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'pest_control_device_inspection';

    -- Escalation
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT id, 'manager_notified', 'pass_fail', 'Manager Notified (Major/Critical)', FALSE, 11,
      'YES: Manager has been notified of major or critical issues. NO: Notification pending or not required.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'pest_control_device_inspection';

    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT id, 'eho_notification', 'pass_fail', 'EHO Notification Activated (Critical)', FALSE, 12,
      'YES: EHO notification procedure has been activated for critical findings. NO: Not required or pending.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'pest_control_device_inspection';

    -- Contractor Information
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
    SELECT id, 'contractor_details', 'text', 'Contractor Details', FALSE, 13,
      'Document pest control contractor company name, contact details, and callout reference number.',
      'e.g., ABC Pest Control Ltd, Tel: 01234 567890, Ref: PC-2024-001'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'pest_control_device_inspection';

    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
    SELECT id, 'contractor_report_reference', 'text', 'Contractor Report Reference', FALSE, 14,
      'Enter the contractor report reference number or upload reference.',
      'e.g., Report #PC-2024-001'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'pest_control_device_inspection';

    -- Notes
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
    SELECT id, 'inspection_notes', 'text', 'Additional Notes', FALSE, 15,
      'Any additional observations, GPS coordinates, or notes from the inspection.',
      'e.g., Device located at GPS: 51.5074°N, 0.1278°W. No issues found.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'pest_control_device_inspection';

    -- Photo Evidence (Required for ANY pest activity found)
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT id, 'device_photos', 'photo', 'Device Photos (Required if pest activity found)', FALSE, 16,
      'Upload GPS-tagged photos showing device condition and any pest activity evidence. Mandatory for all failures.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'pest_control_device_inspection';

    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT id, 'pest_activity_photos', 'photo', 'Pest Activity Photos (if found)', FALSE, 17,
      'Upload GPS-tagged photos showing pest activity evidence (droppings, gnaw marks, dead insects, etc.). Mandatory for major/critical findings.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'pest_control_device_inspection';

    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT id, 'corrective_action_photos', 'photo', 'Corrective Action Photos', FALSE, 18,
      'Upload photos showing corrective actions taken (isolated area, cleaning, contractor work, etc.).'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'pest_control_device_inspection';

    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT id, 'contractor_report_upload', 'photo', 'Contractor Report Upload', FALSE, 19,
      'Upload contractor report document for all call-outs (PDF or photo of report).'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'pest_control_device_inspection';

    RAISE NOTICE 'Seeded enhanced pest control device inspection template';

  ELSE
    RAISE NOTICE '⚠️ Required tables (task_templates, template_fields) do not exist yet - skipping pest control template seed';
  END IF;
END $$;

