-- ============================================================================
-- Migration: Temperature Probe Calibration Audit Template
-- Description: Monthly calibration of all temperature probes using ice bath
--              and boiling water tests with escalation workflows
-- ============================================================================

begin;

-- Clean up existing template if it exists (by slug)
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
  null, -- Global template available to all companies
  'Temperature Probe Calibration Audit',
  'temperature_probe_calibration_audit',
  'Monthly calibration of all temperature probes using ice bath (0°C) and boiling water (100°C) tests. Verify probe accuracy, condition, and functionality. Tag out-of-calibration probes immediately and investigate impact on recent temperature logs.',
  'food_safety',
  'handling_storage', -- Category: Food Safety / Handling & Storage
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
  true, -- Critical compliance task (critical for all temperature checks)
  true, -- Library template
  true, -- Active
  array['yes_no_checklist', 'temperature', 'pass_fail', 'photo'], -- Yes/No checklist + Temperature + Pass/Fail + Photos
  'Calibrate all temperature probes monthly using ice bath and boiling water tests. For each probe, record ice bath reading (target: 0°C ±1°C) and boiling water reading (target: 100°C ±1°C). Verify probe is clean, undamaged, battery functional, and calibration sticker updated. Tag failed probes "OUT OF SERVICE - DO NOT USE" immediately. Minor failures (±1-2°C variance) require immediate recalibration. Major failures (±2-5°C variance) require investigation of all temperature logs since last calibration. Critical failures (>±5°C variance or damaged) require quarantine of affected food items and product disposal review.',
  null, -- NO repeatable_field_name (prevents asset selection UI - probes are text fields, not assets)
  null, -- No asset type filter
  true, -- Requires SOP link: "Temperature Probe Calibration Procedure"
  false, -- Does not trigger contractor (internal calibration process)
  null
);

-- ============================================================================
-- Template Fields
-- ============================================================================

-- Calibration Information
insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'calibration_date', 'date', 'Calibration Date', true, 1,
  'Date when the temperature probe calibration audit was completed.'
from task_templates where company_id is null and slug = 'temperature_probe_calibration_audit';

insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
select id, 'calibrator_name', 'text', 'Calibrator Name', true, 2,
  'Name of the person conducting the temperature probe calibration.',
  'e.g., John Smith'
from task_templates where company_id is null and slug = 'temperature_probe_calibration_audit';

-- Probe Name(s)/Nickname(s) (text field - users can list multiple probes separated by commas)
insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
select id, 'probe_name', 'text', 'Probe Name(s)/Nickname(s)', true, 3,
  'Enter the probe name(s) or nickname(s) being calibrated. List multiple probes separated by commas (e.g., "Digital Probe A, Fridge Probe, Hot Holding Probe").',
  'e.g., Digital Probe A, Fridge Probe, Hot Holding Probe'
from task_templates where company_id is null and slug = 'temperature_probe_calibration_audit';

-- Probe ID/Serial Number (optional)
insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
select id, 'probe_id_serial', 'text', 'Probe ID/Serial Number (optional)', false, 4,
  'Enter the probe ID or serial number if available from inventory.',
  'e.g., PROBE-001, SN-12345'
from task_templates where company_id is null and slug = 'temperature_probe_calibration_audit';

-- Last Calibration Date (from inventory)
insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'last_calibration_date', 'date', 'Last Calibration Date (from inventory)', false, 5,
  'Enter the last calibration date for this probe from inventory records.'
from task_templates where company_id is null and slug = 'temperature_probe_calibration_audit';

-- Ice Bath Temperature Reading
insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
select id, 'ice_bath_reading', 'number', 'Ice Bath Reading (°C)', true, 6,
  'Record the temperature reading from ice bath test. Target: 0°C ±1°C (acceptable range: -1°C to +1°C).',
  'e.g., 0.5'
from task_templates where company_id is null and slug = 'temperature_probe_calibration_audit';

-- Boiling Water Temperature Reading
insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
select id, 'boiling_water_reading', 'number', 'Boiling Water Reading (°C)', true, 7,
  'Record the temperature reading from boiling water test. Target: 100°C ±1°C (acceptable range: 99°C to 101°C).',
  'e.g., 100.2'
from task_templates where company_id is null and slug = 'temperature_probe_calibration_audit';

-- Overall Assessment (Pass/Fail for all probes)
insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'overall_assessment', 'pass_fail', 'Overall Assessment', true, 8,
  'PASS: All probes meet calibration criteria (readings within ±1°C, clean, undamaged, battery functional). FAIL: One or more probes fail criteria or are out of calibration.'
from task_templates where company_id is null and slug = 'temperature_probe_calibration_audit';

-- Note: Yes/No checklist items come from default_checklist_items in recurrence_pattern above
-- They will appear as yes/no questions for the overall calibration

-- Immediate Action (if failure)
insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'probe_tagged_out_of_service', 'pass_fail', 'Probe Tagged "OUT OF SERVICE - DO NOT USE" (if failed)', false, 9,
  'YES: Failed probe(s) have been tagged "OUT OF SERVICE - DO NOT USE" and removed from use. NO: Tagging pending or not required.'
from task_templates where company_id is null and slug = 'temperature_probe_calibration_audit';

-- Variance Calculation (for severity assessment)
insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
select id, 'ice_bath_variance', 'number', 'Ice Bath Variance from 0°C (°C)', false, 10,
  'Calculate variance from target (0°C). Enter absolute value (e.g., if reading is 1.5°C, enter 1.5).',
  'e.g., 1.5'
from task_templates where company_id is null and slug = 'temperature_probe_calibration_audit';

insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
select id, 'boiling_water_variance', 'number', 'Boiling Water Variance from 100°C (°C)', false, 11,
  'Calculate variance from target (100°C). Enter absolute value (e.g., if reading is 98.5°C, enter 1.5).',
  'e.g., 1.5'
from task_templates where company_id is null and slug = 'temperature_probe_calibration_audit';

-- Severity Level (if failure)
insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text, options)
select id, 'severity_level', 'select', 'Severity Level (if failure)', false, 12,
  'Select the severity level based on variance or probe condition.',
  jsonb_build_array(
    jsonb_build_object('value', 'minor', 'label', 'Minor: ±1-2°C variance (recalibrate)'),
    jsonb_build_object('value', 'major', 'label', 'Major: ±2-5°C variance (investigate recent temp logs)'),
    jsonb_build_object('value', 'critical', 'label', 'Critical: >±5°C variance or damaged (recall affected products)')
  )
from task_templates where company_id is null and slug = 'temperature_probe_calibration_audit';

-- Corrective Action Taken
insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text, options)
select id, 'corrective_action', 'select', 'Corrective Action Taken', false, 13,
  'Select the corrective action taken based on severity level.',
  jsonb_build_array(
    jsonb_build_object('value', 'minor_recalibrate', 'label', 'Minor: Recalibrate immediately'),
    jsonb_build_object('value', 'major_investigate', 'label', 'Major: Check all temperature logs since last calibration'),
    jsonb_build_object('value', 'critical_quarantine', 'label', 'Critical: Quarantine affected food items, review safety margins')
  )
from task_templates where company_id is null and slug = 'temperature_probe_calibration_audit';

-- Temperature Log Investigation (for major/critical)
insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
select id, 'temperature_logs_reviewed', 'text', 'Temperature Logs Reviewed (Major/Critical)', false, 14,
  'Document which temperature logs have been reviewed since last calibration date. List dates and any concerns.',
  'e.g., Reviewed logs from 2024-01-01 to 2024-01-31. No concerns found.'
from task_templates where company_id is null and slug = 'temperature_probe_calibration_audit';

-- Product Quarantine (for critical)
insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
select id, 'quarantine_records', 'text', 'Quarantine Records (Critical)', false, 15,
  'Document any food items that have been quarantined due to critical probe failure. Include product names, dates, and disposal decisions.',
  'e.g., Quarantined 5kg chicken from 2024-01-15. Disposed per manager approval.'
from task_templates where company_id is null and slug = 'temperature_probe_calibration_audit';

-- Re-check Required
insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'recheck_required', 'pass_fail', 'Re-check Required (after recalibration)', false, 16,
  'YES: Re-check has been completed immediately after recalibration. NO: Re-check pending or not required.'
from task_templates where company_id is null and slug = 'temperature_probe_calibration_audit';

insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
select id, 'recheck_time', 'text', 'Re-check Time (if required)', false, 17,
  'Enter the time when re-check was completed after recalibration.',
  'e.g., 10:30'
from task_templates where company_id is null and slug = 'temperature_probe_calibration_audit';

-- Next Calibration Date (auto-calculated +30 days)
insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'next_calibration_date', 'date', 'Next Calibration Date (+30 days)', false, 18,
  'Enter the next scheduled calibration date (30 days from today). This will be used to auto-schedule the next calibration.'
from task_templates where company_id is null and slug = 'temperature_probe_calibration_audit';

-- Escalation
insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'manager_notified', 'pass_fail', 'Kitchen Manager Notified (Major/Critical)', false, 19,
  'YES: Kitchen manager has been notified of major or critical probe failures. NO: Notification pending or not required.'
from task_templates where company_id is null and slug = 'temperature_probe_calibration_audit';

insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
select id, 'product_disposal_review', 'text', 'Product Disposal Review (Critical)', false, 20,
  'Document product disposal decisions and review of safety margins for critical failures.',
  'e.g., Reviewed all products from affected period. No disposal required - safety margins adequate.'
from task_templates where company_id is null and slug = 'temperature_probe_calibration_audit';

-- Notes
insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
select id, 'calibration_notes', 'text', 'Additional Notes', false, 21,
  'Any additional observations or notes from the calibration.',
  'e.g., Probe recalibrated successfully. All readings now within acceptable range.'
from task_templates where company_id is null and slug = 'temperature_probe_calibration_audit';

-- Photo Evidence (Required for failed probes)
insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'calibration_setup_photos', 'photo', 'Calibration Setup Photos', false, 22,
  'Upload photos showing the calibration setup (ice bath and boiling water test setup).'
from task_templates where company_id is null and slug = 'temperature_probe_calibration_audit';

insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'probe_condition_photos', 'photo', 'Probe Condition Photos (Required if failed)', false, 23,
  'Upload photos showing probe condition, damage, or calibration readings. Mandatory for all failures.'
from task_templates where company_id is null and slug = 'temperature_probe_calibration_audit';

insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'before_after_photos', 'photo', 'Before/After Recalibration Photos', false, 24,
  'Upload before and after photos showing probe readings before and after recalibration (if applicable).'
from task_templates where company_id is null and slug = 'temperature_probe_calibration_audit';

insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'quarantine_photos', 'photo', 'Quarantine Records Photos (Critical)', false, 25,
  'Upload photos of quarantined products if critical failure occurred.'
from task_templates where company_id is null and slug = 'temperature_probe_calibration_audit';

commit;

