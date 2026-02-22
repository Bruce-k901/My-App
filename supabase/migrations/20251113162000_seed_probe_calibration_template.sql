-- ============================================================================
-- Migration: Temperature Probe Calibration Audit Template
-- Description: Monthly calibration of all temperature probes using ice bath
--              and boiling water tests with escalation workflows
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
          AND slug = 'temperature_probe_calibration_audit'
      );
    END IF;

    DELETE FROM public.template_fields
    WHERE template_id IN (
      SELECT id FROM public.task_templates
      WHERE company_id IS NULL
        AND slug = 'temperature_probe_calibration_audit'
    );

    DELETE FROM public.task_templates
    WHERE company_id IS NULL
      AND slug = 'temperature_probe_calibration_audit';

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
  'Temperature Probe Calibration Audit',
  'temperature_probe_calibration_audit',
  'Monthly calibration of all temperature probes using ice bath (0°C) and boiling water (100°C) tests. Verify probe accuracy, condition, and functionality. Tag out-of-calibration probes immediately and investigate impact on recent temperature logs.',
  'food_safety',
  'handling_storage', -- Category: Food Safety / Handling & Storage
  'monthly',
  '09:00',
  ARRAY['before_open'],
  jsonb_build_object(
    'daypart_times', jsonb_build_object('before_open', '09:00'),
    'default_checklist_items', jsonb_build_array(
      'Ice bath test: reads 0°C ±1°C',
      'Boiling water test: reads 100°C ±1°C',
      'Probe clean and undamaged',
      'Battery functional',
      'Calibration date sticker updated'
    )
  ),
  'kitchen_manager',
  'Food Safety Act 1990, Food Hygiene Regulations, HACCP',
  TRUE, -- Critical compliance task (critical for all temperature checks)
  TRUE, -- Library template
  TRUE, -- Active
  ARRAY['yes_no_checklist', 'temperature', 'pass_fail', 'photo'], -- Yes/No checklist + Temperature + Pass/Fail + Photos
  'Calibrate all temperature probes monthly using ice bath and boiling water tests. For each probe, record ice bath reading (target: 0°C ±1°C) and boiling water reading (target: 100°C ±1°C). Verify probe is clean, undamaged, battery functional, and calibration sticker updated. Tag failed probes "OUT OF SERVICE - DO NOT USE" immediately. Minor failures (±1-2°C variance) require immediate recalibration. Major failures (±2-5°C variance) require investigation of all temperature logs since last calibration. Critical failures (>±5°C variance or damaged) require quarantine of affected food items and product disposal review.',
  NULL, -- NO repeatable_field_name (prevents asset selection UI - probes are text fields, not assets)
  NULL, -- No asset type filter
  TRUE, -- Requires SOP link: "Temperature Probe Calibration Procedure"
  FALSE, -- Does not trigger contractor (internal calibration process)
  NULL
);

-- ============================================================================
-- Template Fields
-- ============================================================================

    -- Calibration Information
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT id, 'calibration_date', 'date', 'Calibration Date', TRUE, 1,
      'Date when the temperature probe calibration audit was completed.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'temperature_probe_calibration_audit';

    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
    SELECT id, 'calibrator_name', 'text', 'Calibrator Name', TRUE, 2,
      'Name of the person conducting the temperature probe calibration.',
      'e.g., John Smith'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'temperature_probe_calibration_audit';

    -- Probe Name(s)/Nickname(s) (text field - users can list multiple probes separated by commas)
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
    SELECT id, 'probe_name', 'text', 'Probe Name(s)/Nickname(s)', TRUE, 3,
      'Enter the probe name(s) or nickname(s) being calibrated. List multiple probes separated by commas (e.g., "Digital Probe A, Fridge Probe, Hot Holding Probe").',
      'e.g., Digital Probe A, Fridge Probe, Hot Holding Probe'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'temperature_probe_calibration_audit';

    -- Probe ID/Serial Number (optional)
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
    SELECT id, 'probe_id_serial', 'text', 'Probe ID/Serial Number (optional)', FALSE, 4,
      'Enter the probe ID or serial number if available from inventory.',
      'e.g., PROBE-001, SN-12345'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'temperature_probe_calibration_audit';

    -- Last Calibration Date (from inventory)
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT id, 'last_calibration_date', 'date', 'Last Calibration Date (from inventory)', FALSE, 5,
      'Enter the last calibration date for this probe from inventory records.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'temperature_probe_calibration_audit';

    -- Ice Bath Temperature Reading
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
    SELECT id, 'ice_bath_reading', 'number', 'Ice Bath Reading (°C)', TRUE, 6,
      'Record the temperature reading from ice bath test. Target: 0°C ±1°C (acceptable range: -1°C to +1°C).',
      'e.g., 0.5'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'temperature_probe_calibration_audit';

    -- Boiling Water Temperature Reading
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
    SELECT id, 'boiling_water_reading', 'number', 'Boiling Water Reading (°C)', TRUE, 7,
      'Record the temperature reading from boiling water test. Target: 100°C ±1°C (acceptable range: 99°C to 101°C).',
      'e.g., 100.2'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'temperature_probe_calibration_audit';

    -- Overall Assessment (Pass/Fail for all probes)
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT id, 'overall_assessment', 'pass_fail', 'Overall Assessment', TRUE, 8,
      'PASS: All probes meet calibration criteria (readings within ±1°C, clean, undamaged, battery functional). FAIL: One or more probes fail criteria or are out of calibration.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'temperature_probe_calibration_audit';

-- Note: Yes/No checklist items come from default_checklist_items in recurrence_pattern above
-- They will appear as yes/no questions for the overall calibration

    -- Immediate Action (if failure)
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT id, 'probe_tagged_out_of_service', 'pass_fail', 'Probe Tagged "OUT OF SERVICE - DO NOT USE" (if failed)', FALSE, 9,
      'YES: Failed probe(s) have been tagged "OUT OF SERVICE - DO NOT USE" and removed from use. NO: Tagging pending or not required.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'temperature_probe_calibration_audit';

    -- Variance Calculation (for severity assessment)
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
    SELECT id, 'ice_bath_variance', 'number', 'Ice Bath Variance from 0°C (°C)', FALSE, 10,
      'Calculate variance from target (0°C). Enter absolute value (e.g., if reading is 1.5°C, enter 1.5).',
      'e.g., 1.5'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'temperature_probe_calibration_audit';

    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
    SELECT id, 'boiling_water_variance', 'number', 'Boiling Water Variance from 100°C (°C)', FALSE, 11,
      'Calculate variance from target (100°C). Enter absolute value (e.g., if reading is 98.5°C, enter 1.5).',
      'e.g., 1.5'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'temperature_probe_calibration_audit';

    -- Severity Level (if failure)
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, options)
    SELECT id, 'severity_level', 'select', 'Severity Level (if failure)', FALSE, 12,
      'Select the severity level based on variance or probe condition.',
      jsonb_build_array(
        jsonb_build_object('value', 'minor', 'label', 'Minor: ±1-2°C variance (recalibrate)'),
        jsonb_build_object('value', 'major', 'label', 'Major: ±2-5°C variance (investigate recent temp logs)'),
        jsonb_build_object('value', 'critical', 'label', 'Critical: >±5°C variance or damaged (recall affected products)')
      )
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'temperature_probe_calibration_audit';

    -- Corrective Action Taken
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, options)
    SELECT id, 'corrective_action', 'select', 'Corrective Action Taken', FALSE, 13,
      'Select the corrective action taken based on severity level.',
      jsonb_build_array(
        jsonb_build_object('value', 'minor_recalibrate', 'label', 'Minor: Recalibrate immediately'),
        jsonb_build_object('value', 'major_investigate', 'label', 'Major: Check all temperature logs since last calibration'),
        jsonb_build_object('value', 'critical_quarantine', 'label', 'Critical: Quarantine affected food items, review safety margins')
      )
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'temperature_probe_calibration_audit';

    -- Temperature Log Investigation (for major/critical)
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
    SELECT id, 'temperature_logs_reviewed', 'text', 'Temperature Logs Reviewed (Major/Critical)', FALSE, 14,
      'Document which temperature logs have been reviewed since last calibration date. List dates and any concerns.',
      'e.g., Reviewed logs from 2024-01-01 to 2024-01-31. No concerns found.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'temperature_probe_calibration_audit';

    -- Product Quarantine (for critical)
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
    SELECT id, 'quarantine_records', 'text', 'Quarantine Records (Critical)', FALSE, 15,
      'Document any food items that have been quarantined due to critical probe failure. Include product names, dates, and disposal decisions.',
      'e.g., Quarantined 5kg chicken from 2024-01-15. Disposed per manager approval.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'temperature_probe_calibration_audit';

    -- Re-check Required
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT id, 'recheck_required', 'pass_fail', 'Re-check Required (after recalibration)', FALSE, 16,
      'YES: Re-check has been completed immediately after recalibration. NO: Re-check pending or not required.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'temperature_probe_calibration_audit';

    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
    SELECT id, 'recheck_time', 'text', 'Re-check Time (if required)', FALSE, 17,
      'Enter the time when re-check was completed after recalibration.',
      'e.g., 10:30'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'temperature_probe_calibration_audit';

    -- Next Calibration Date (auto-calculated +30 days)
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT id, 'next_calibration_date', 'date', 'Next Calibration Date (+30 days)', FALSE, 18,
      'Enter the next scheduled calibration date (30 days from today). This will be used to auto-schedule the next calibration.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'temperature_probe_calibration_audit';

    -- Escalation
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT id, 'manager_notified', 'pass_fail', 'Kitchen Manager Notified (Major/Critical)', FALSE, 19,
      'YES: Kitchen manager has been notified of major or critical probe failures. NO: Notification pending or not required.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'temperature_probe_calibration_audit';

    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
    SELECT id, 'product_disposal_review', 'text', 'Product Disposal Review (Critical)', FALSE, 20,
      'Document product disposal decisions and review of safety margins for critical failures.',
      'e.g., Reviewed all products from affected period. No disposal required - safety margins adequate.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'temperature_probe_calibration_audit';

    -- Notes
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
    SELECT id, 'calibration_notes', 'text', 'Additional Notes', FALSE, 21,
      'Any additional observations or notes from the calibration.',
      'e.g., Probe recalibrated successfully. All readings now within acceptable range.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'temperature_probe_calibration_audit';

    -- Photo Evidence (Required for failed probes)
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT id, 'calibration_setup_photos', 'photo', 'Calibration Setup Photos', FALSE, 22,
      'Upload photos showing the calibration setup (ice bath and boiling water test setup).'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'temperature_probe_calibration_audit';

    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT id, 'probe_condition_photos', 'photo', 'Probe Condition Photos (Required if failed)', FALSE, 23,
      'Upload photos showing probe condition, damage, or calibration readings. Mandatory for all failures.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'temperature_probe_calibration_audit';

    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT id, 'before_after_photos', 'photo', 'Before/After Recalibration Photos', FALSE, 24,
      'Upload before and after photos showing probe readings before and after recalibration (if applicable).'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'temperature_probe_calibration_audit';

    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT id, 'quarantine_photos', 'photo', 'Quarantine Records Photos (Critical)', FALSE, 25,
      'Upload photos of quarantined products if critical failure occurred.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'temperature_probe_calibration_audit';

    RAISE NOTICE 'Seeded temperature probe calibration audit template';

  ELSE
    RAISE NOTICE '⚠️ Required tables (task_templates, template_fields) do not exist yet - skipping probe calibration template seed';
  END IF;
END $$;

