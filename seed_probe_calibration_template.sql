-- ============================================================================
-- Seed Temperature Probe Calibration Audit Template - Standalone Script
-- Description: Creates the probe calibration template directly
-- Run this in Supabase SQL Editor if template hasn't seeded
-- ============================================================================

begin;

-- Clean up existing template if it exists
delete from template_repeatable_labels
where template_id in (
  select id from task_templates
  where company_id is null
    and slug = 'temperature_probe_calibration_audit'
);

delete from template_fields
where template_id in (
  select id from task_templates
  where company_id is null
    and slug = 'temperature_probe_calibration_audit'
);

delete from task_templates
where company_id is null
  and slug = 'temperature_probe_calibration_audit';

-- Create the template
insert into task_templates (
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
) values (
  null,
  'Temperature Probe Calibration Audit',
  'temperature_probe_calibration_audit',
  'Monthly calibration of all temperature probes using ice bath (0°C) and boiling water (100°C) tests. Verify probe accuracy, condition, and functionality. Tag out-of-calibration probes immediately and investigate impact on recent temperature logs.',
  'food_safety',
  'handling_storage',
  'monthly',
  '09:00',
  array['before_open'],
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
  true,
  true,
  true,
  array['yes_no_checklist', 'temperature', 'pass_fail', 'photo'],
  'Calibrate all temperature probes monthly using ice bath and boiling water tests. For each probe, record ice bath reading (target: 0°C ±1°C) and boiling water reading (target: 100°C ±1°C). Verify probe is clean, undamaged, battery functional, and calibration sticker updated. Tag failed probes "OUT OF SERVICE - DO NOT USE" immediately. Minor failures (±1-2°C variance) require immediate recalibration. Major failures (±2-5°C variance) require investigation of all temperature logs since last calibration. Critical failures (>±5°C variance or damaged) require quarantine of affected food items and product disposal review.',
  null, -- NO repeatable_field_name (prevents asset selection UI - probes are text fields, not assets)
  null, -- No asset type filter
  true,
  false,
  null
);

-- Add template fields (abbreviated - using key fields)
INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT id, 'calibration_date', 'date', 'Calibration Date', true, 1,
  'Date when the temperature probe calibration audit was completed.'
FROM task_templates WHERE company_id IS NULL AND slug = 'temperature_probe_calibration_audit';

INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
SELECT id, 'calibrator_name', 'text', 'Calibrator Name', true, 2,
  'Name of the person conducting the temperature probe calibration.',
  'e.g., John Smith'
FROM task_templates WHERE company_id IS NULL AND slug = 'temperature_probe_calibration_audit';

INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
SELECT id, 'probe_name', 'text', 'Probe Name(s)/Nickname(s)', true, 3,
  'Enter the probe name(s) or nickname(s) being calibrated. List multiple probes separated by commas (e.g., "Digital Probe A, Fridge Probe, Hot Holding Probe").',
  'e.g., Digital Probe A, Fridge Probe, Hot Holding Probe'
FROM task_templates WHERE company_id IS NULL AND slug = 'temperature_probe_calibration_audit';

INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
SELECT id, 'ice_bath_reading', 'number', 'Ice Bath Reading (°C)', true, 6,
  'Record the temperature reading from ice bath test. Target: 0°C ±1°C (acceptable range: -1°C to +1°C).',
  'e.g., 0.5'
FROM task_templates WHERE company_id IS NULL AND slug = 'temperature_probe_calibration_audit';

INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
SELECT id, 'boiling_water_reading', 'number', 'Boiling Water Reading (°C)', true, 7,
  'Record the temperature reading from boiling water test. Target: 100°C ±1°C (acceptable range: 99°C to 101°C).',
  'e.g., 100.2'
FROM task_templates WHERE company_id IS NULL AND slug = 'temperature_probe_calibration_audit';

INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT id, 'probe_assessment', 'pass_fail', 'Probe Assessment', true, 8,
  'PASS: Probe meets all calibration criteria (readings within ±1°C, clean, undamaged, battery functional). FAIL: Probe fails one or more criteria or is out of calibration.'
FROM task_templates WHERE company_id IS NULL AND slug = 'temperature_probe_calibration_audit';

INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text, options)
SELECT id, 'severity_level', 'select', 'Severity Level (if failure)', false, 12,
  'Select the severity level based on variance or probe condition.',
  jsonb_build_array(
    jsonb_build_object('value', 'minor', 'label', 'Minor: ±1-2°C variance (recalibrate)'),
    jsonb_build_object('value', 'major', 'label', 'Major: ±2-5°C variance (investigate recent temp logs)'),
    jsonb_build_object('value', 'critical', 'label', 'Critical: >±5°C variance or damaged (recall affected products)')
  )
FROM task_templates WHERE company_id IS NULL AND slug = 'temperature_probe_calibration_audit';

INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT id, 'probe_condition_photos', 'photo', 'Probe Condition Photos (Required if failed)', false, 23,
  'Upload photos showing probe condition, damage, or calibration readings. Mandatory for all failures.'
FROM task_templates WHERE company_id IS NULL AND slug = 'temperature_probe_calibration_audit';

-- Verify template was created
DO $$
DECLARE
  template_count INTEGER;
  field_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO template_count
  FROM task_templates
  WHERE company_id IS NULL AND slug = 'temperature_probe_calibration_audit';
  
  IF template_count = 0 THEN
    RAISE EXCEPTION 'Template creation failed!';
  END IF;
  
  SELECT COUNT(*) INTO field_count
  FROM template_fields
  WHERE template_id IN (SELECT id FROM task_templates WHERE company_id IS NULL AND slug = 'temperature_probe_calibration_audit');
  
  RAISE NOTICE '✅ Template created successfully with % fields', field_count;
END $$;

commit;

