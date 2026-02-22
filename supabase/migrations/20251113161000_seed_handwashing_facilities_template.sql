-- ============================================================================
-- Migration: Handwashing Station Compliance Check Template
-- Description: Daily verification of all handwashing facilities with operational
--              criteria, temperature checks, and escalation workflows
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
          AND slug = 'handwashing_station_compliance_check'
      );
    END IF;

    DELETE FROM public.template_fields
    WHERE template_id IN (
      SELECT id FROM public.task_templates
      WHERE company_id IS NULL
        AND slug = 'handwashing_station_compliance_check'
    );

    DELETE FROM public.task_templates
    WHERE company_id IS NULL
      AND slug = 'handwashing_station_compliance_check';

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
  'Handwashing Station Compliance Check',
  'handwashing_station_compliance_check',
  'Daily verification of all handwashing facilities to ensure operational compliance. Check hot/cold water supply, soap/towel availability, signage, and water temperature. Tag non-operational stations and trigger immediate maintenance for critical issues.',
  'food_safety',
  'cleaning_premises', -- Category: Food Safety / Cleaning & Premises
  'daily',
  '07:00',
  ARRAY['before_open'],
  jsonb_build_object(
    'daypart_times', jsonb_build_object('before_open', '07:00'),
    'default_checklist_items', jsonb_build_array(
      'Hot AND cold running water',
      'Liquid soap dispenser full',
      'Paper towels stocked',
      'No-touch bin with liner',
      '"Now Wash Your Hands" sign visible',
      'Temperature check: water reaches 40-45°C'
    )
  ),
  'manager',
  'Food Safety Act 1990, Food Hygiene Regulations, HACCP',
  TRUE, -- Critical compliance task (direct food safety impact)
  TRUE, -- Library template
  TRUE, -- Active
  ARRAY['yes_no_checklist', 'temperature', 'pass_fail', 'photo'], -- Yes/No checklist + Temperature + Pass/Fail + Photos
  'Verify all handwashing stations daily before service. Check hot/cold water flow, soap/towel supplies, signage visibility, and water temperature (40-45°C). Document any deficiencies with photos. Tag non-operational stations "OUT OF ORDER" and redirect staff to nearest working station. Critical issues (no water flow) require emergency maintenance callout. Major issues (no hot water/drainage) require maintenance within 2 hours. Minor issues (low supplies) require restocking within 15 minutes.',
  NULL, -- NO asset selection (repeatable_field_name = NULL)
  NULL, -- No asset type filter
  TRUE, -- Requires SOP link: "Handwashing Facility Maintenance"
  TRUE, -- Triggers contractor on failure (for maintenance)
  'equipment_repair' -- Contractor type for maintenance
);

-- ============================================================================
-- Template Fields
-- ============================================================================

    -- Inspection Information
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT id, 'inspection_date', 'date', 'Inspection Date', TRUE, 1,
      'Date when the handwashing station compliance check was completed.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'handwashing_station_compliance_check';

    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
    SELECT id, 'inspector_name', 'text', 'Inspector Name', TRUE, 2,
      'Name of the person conducting the handwashing station compliance check.',
      'e.g., John Smith'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'handwashing_station_compliance_check';

    -- Station Location(s) (text field - not repeatable)
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
    SELECT id, 'station_location', 'text', 'Station Location(s)', TRUE, 3,
      'Enter the location(s) of the handwashing station(s) being verified (e.g., "Kitchen Handwash Station", "Prep Area Station"). List multiple locations if checking multiple stations.',
      'e.g., Kitchen Handwash Station, Prep Area Station, Service Area Station'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'handwashing_station_compliance_check';

    -- Overall Assessment (Pass/Fail for all stations)
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT id, 'overall_assessment', 'pass_fail', 'Overall Assessment', TRUE, 4,
      'PASS: All stations meet operational criteria. FAIL: One or more stations fail criteria or are non-operational. Failure will trigger maintenance workflow.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'handwashing_station_compliance_check';

-- Note: Yes/No checklist items come from default_checklist_items in recurrence_pattern above
-- They will appear as yes/no questions for the overall inspection

    -- Temperature Reading
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
    SELECT id, 'water_temperature', 'number', 'Water Temperature (°C)', TRUE, 5,
      'Record the water temperature reading using a digital thermometer. Target range: 40-45°C.',
      'e.g., 42'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'handwashing_station_compliance_check';

    -- Immediate Action (if failure)
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT id, 'station_tagged', 'pass_fail', 'Station Tagged "OUT OF ORDER" (if non-operational)', FALSE, 6,
      'YES: Station has been tagged "OUT OF ORDER" and staff redirected to nearest working station. NO: Tagging pending or not required.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'handwashing_station_compliance_check';

    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
    SELECT id, 'redirected_to_station', 'text', 'Staff Redirected To (if station out of order)', FALSE, 7,
      'Enter the location of the nearest working handwashing station where staff have been redirected.',
      'e.g., Prep Area Station'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'handwashing_station_compliance_check';

    -- Severity Level (if failure)
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, options)
    SELECT id, 'severity_level', 'select', 'Severity Level (if failure)', FALSE, 8,
      'Select the severity level if station fails operational criteria.',
      jsonb_build_array(
        jsonb_build_object('value', 'minor', 'label', 'Minor: Low supplies (soap/towels)'),
        jsonb_build_object('value', 'major', 'label', 'Major: No hot water or drainage issues'),
        jsonb_build_object('value', 'critical', 'label', 'Critical: No water flow at all')
      )
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'handwashing_station_compliance_check';

    -- Corrective Action Taken
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, options)
    SELECT id, 'corrective_action', 'select', 'Corrective Action Taken', FALSE, 9,
      'Select the corrective action taken based on severity level.',
      jsonb_build_array(
        jsonb_build_object('value', 'minor_restock', 'label', 'Minor: Restock immediately (15 min resolution)'),
        jsonb_build_object('value', 'major_maintenance', 'label', 'Major: Maintenance call-out within 2 hours'),
        jsonb_build_object('value', 'critical_emergency', 'label', 'Critical: Emergency maintenance - station unusable')
      )
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'handwashing_station_compliance_check';

    -- Re-check Required
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT id, 'recheck_required', 'pass_fail', 'Re-check Required', FALSE, 10,
      'YES: Re-check has been scheduled or completed. NO: Re-check pending or not required.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'handwashing_station_compliance_check';

    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
    SELECT id, 'recheck_time', 'text', 'Re-check Time (if required)', FALSE, 11,
      'Enter the time when re-check was or will be completed. Minor: within 1 hour. Major/Critical: within 4 hours.',
      'e.g., 08:30'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'handwashing_station_compliance_check';

    -- Escalation
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT id, 'manager_notified', 'pass_fail', 'Manager Notified (Major/Critical)', FALSE, 12,
      'YES: Manager has been auto-notified of major or critical issues. NO: Notification pending or not required.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'handwashing_station_compliance_check';

    -- Maintenance Information
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
    SELECT id, 'maintenance_ticket_number', 'text', 'Maintenance Request Ticket Number', FALSE, 13,
      'Enter the maintenance request ticket number for major/critical issues.',
      'e.g., MNT-2024-001'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'handwashing_station_compliance_check';

    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
    SELECT id, 'supplies_inventory_reference', 'text', 'Supplies Inventory Reference (soap/towels)', FALSE, 14,
      'Enter the inventory reference for soap/towel restocking if applicable.',
      'e.g., INV-SOAP-001'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'handwashing_station_compliance_check';

    -- Notes
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
    SELECT id, 'inspection_notes', 'text', 'Additional Notes', FALSE, 15,
      'Any additional observations or notes from the inspection.',
      'e.g., Station fully operational, all supplies adequate.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'handwashing_station_compliance_check';

    -- Photo Evidence (Required for any deficiencies)
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT id, 'station_photos', 'photo', 'Station Photos (Required if deficiencies found)', FALSE, 16,
      'Upload photos showing the handwashing station condition. Required for all failures showing stocked station, signage, and any deficiencies.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'handwashing_station_compliance_check';

    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT id, 'deficiency_photos', 'photo', 'Deficiency Photos (if found)', FALSE, 17,
      'Upload photos showing specific deficiencies (empty soap dispenser, missing towels, broken fixtures, etc.). Mandatory for all failures.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'handwashing_station_compliance_check';

    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT id, 'temperature_reading_photo', 'photo', 'Temperature Reading Photo', FALSE, 18,
      'Upload photo of digital thermometer showing water temperature reading (good practice documentation).'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'handwashing_station_compliance_check';

    RAISE NOTICE 'Seeded handwashing station compliance check template';

  ELSE
    RAISE NOTICE '⚠️ Required tables (task_templates, template_fields) do not exist yet - skipping handwashing template seed';
  END IF;
END $$;

