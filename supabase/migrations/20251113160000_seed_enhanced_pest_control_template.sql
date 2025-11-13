-- ============================================================================
-- Migration: Enhanced Pest Control Device Inspection Template
-- Description: Comprehensive weekly pest control device inspection with device mapping,
--              per-device pass/fail criteria, severity levels, and escalation workflows
-- ============================================================================

begin;

-- Clean up ALL existing pest control templates (including relics)
-- Remove template fields for all pest control templates
delete from template_fields
where template_id in (
  select id from task_templates
  where (
    (company_id is null and slug = 'pest_control_device_inspection')
    OR slug = 'weekly_pest_control_inspection'
    OR slug LIKE '%pest%control%'
    OR (name ILIKE '%pest%control%' AND slug != 'pest_control_device_inspection')
  )
);

-- Remove repeatable labels
delete from template_repeatable_labels
where template_id in (
  select id from task_templates
  where (
    (company_id is null and slug = 'pest_control_device_inspection')
    OR slug = 'weekly_pest_control_inspection'
    OR slug LIKE '%pest%control%'
    OR (name ILIKE '%pest%control%' AND slug != 'pest_control_device_inspection')
  )
);

-- Remove the templates themselves
delete from task_templates
where (
  (company_id is null and slug = 'pest_control_device_inspection')
  OR slug = 'weekly_pest_control_inspection'
  OR slug LIKE '%pest%control%'
  OR (name ILIKE '%pest%control%' AND slug != 'pest_control_device_inspection')
);

-- Create the enhanced template
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
  'Pest Control Device Inspection',
  'pest_control_device_inspection',
  'Weekly inspection of all pest control devices including rodent bait stations, fly killer units, insectocutors, and bird deterrent systems. Document device condition, check for pest activity, and trigger immediate contractor callout if activity is detected.',
  'food_safety',
  'cleaning_premises', -- Category: Food Safety / Cleaning & Premises
  'weekly',
  '07:00',
  array['before_open'],
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
  true, -- Critical compliance task
  true, -- Library template
  true, -- Active
  array['yes_no_checklist', 'pass_fail', 'photo'], -- Yes/No checklist + Pass/Fail + Photos
  'Inspect all pest control devices systematically. For each device, verify it is intact, secure, clean, operational, and correctly positioned. Check for any signs of pest activity (droppings, gnaw marks, dead insects, etc.). Document findings with photos. If ANY pest activity is found, immediately isolate the affected area, assess severity, and trigger contractor callout. Critical findings require area closure and EHO notification.',
  null, -- NO asset selection (repeatable_field_name = NULL)
  null, -- No asset type filter
  true, -- Requires SOP link: "Pest Control Monitoring Procedure"
  true, -- Triggers contractor on failure
  'pest_control' -- Contractor type
);

-- ============================================================================
-- Template Fields
-- ============================================================================

-- Inspection Information
insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'inspection_date', 'date', 'Inspection Date', true, 1,
  'Date when the pest control device inspection was completed.'
from task_templates where company_id is null and slug = 'pest_control_device_inspection';

insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
select id, 'inspector_name', 'text', 'Inspector Name', true, 2,
  'Name of the person conducting the pest control device inspection.',
  'e.g., John Smith'
from task_templates where company_id is null and slug = 'pest_control_device_inspection';

-- Device Type Selection
insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text, options)
select id, 'device_type', 'select', 'Device Type', true, 3,
  'Select the type of pest control device being inspected.',
  jsonb_build_array(
    jsonb_build_object('value', 'rodent_bait_station_external', 'label', 'Rodent Bait Station (External)'),
    jsonb_build_object('value', 'fly_killer_unit_internal', 'label', 'Fly Killer Unit (Internal)'),
    jsonb_build_object('value', 'insectocutor', 'label', 'Insectocutor'),
    jsonb_build_object('value', 'bird_deterrent', 'label', 'Bird Deterrent System'),
    jsonb_build_object('value', 'other', 'label', 'Other Device')
  )
from task_templates where company_id is null and slug = 'pest_control_device_inspection';

-- Device Location (text field - not repeatable)
insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
select id, 'device_location', 'text', 'Device Location(s)', true, 4,
  'Enter the specific location(s) of the device(s) inspected (e.g., "Kitchen - Back Door", "Storage Room A", "External - Loading Bay"). List multiple locations if inspecting multiple devices.',
  'e.g., Kitchen - Back Door, Storage Room A, External - Loading Bay'
from task_templates where company_id is null and slug = 'pest_control_device_inspection';

-- Overall Assessment (Pass/Fail for all devices)
insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'overall_assessment', 'pass_fail', 'Overall Assessment', true, 5,
  'PASS: All devices meet inspection criteria. FAIL: One or more devices fail criteria or pest activity detected. Failure will trigger contractor callout workflow.'
from task_templates where company_id is null and slug = 'pest_control_device_inspection';

-- Note: Yes/No checklist items come from default_checklist_items in recurrence_pattern above
-- They will appear as yes/no questions for the overall inspection

-- Immediate Action (if failure)
insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'immediate_action_taken', 'pass_fail', 'Immediate Action: Isolate Affected Area (if contamination risk)', false, 6,
  'YES: Affected area has been isolated if contamination risk exists. NO: Isolation not required or pending.'
from task_templates where company_id is null and slug = 'pest_control_device_inspection';

-- Severity Level (if failure)
insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text, options)
select id, 'severity_level', 'select', 'Severity Level (if failure)', false, 7,
  'Select the severity level if pest activity or device failure is detected.',
  jsonb_build_array(
    jsonb_build_object('value', 'minor', 'label', 'Minor: Device needs maintenance/cleaning'),
    jsonb_build_object('value', 'major', 'label', 'Major: Single pest sighting/evidence'),
    jsonb_build_object('value', 'critical', 'label', 'Critical: Multiple pests or infestation signs')
  )
from task_templates where company_id is null and slug = 'pest_control_device_inspection';

-- Corrective Action Taken
insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text, options)
select id, 'corrective_action', 'select', 'Corrective Action Taken', false, 8,
  'Select the corrective action taken based on severity level.',
  jsonb_build_array(
    jsonb_build_object('value', 'minor_maintenance', 'label', 'Minor: Schedule contractor maintenance'),
    jsonb_build_object('value', 'major_callout', 'label', 'Major: Immediate contractor call-out required'),
    jsonb_build_object('value', 'critical_closure', 'label', 'Critical: Close affected area, deep clean, pest control emergency service')
  )
from task_templates where company_id is null and slug = 'pest_control_device_inspection';

-- Re-check Required
insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'recheck_required', 'pass_fail', '24-Hour Follow-up Inspection Required (Major/Critical)', false, 9,
  'YES: 24-hour follow-up inspection has been scheduled or completed for major/critical issues. NO: Re-check pending or not required.'
from task_templates where company_id is null and slug = 'pest_control_device_inspection';

insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
select id, 'recheck_date_time', 'text', 'Re-check Date & Time (if required)', false, 10,
  'Enter the date and time when re-check was or will be completed (for major/critical issues).',
  'e.g., 2024-01-15 14:30'
from task_templates where company_id is null and slug = 'pest_control_device_inspection';

-- Escalation
insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'manager_notified', 'pass_fail', 'Manager Notified (Major/Critical)', false, 11,
  'YES: Manager has been notified of major or critical issues. NO: Notification pending or not required.'
from task_templates where company_id is null and slug = 'pest_control_device_inspection';

insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'eho_notification', 'pass_fail', 'EHO Notification Activated (Critical)', false, 12,
  'YES: EHO notification procedure has been activated for critical findings. NO: Not required or pending.'
from task_templates where company_id is null and slug = 'pest_control_device_inspection';

-- Contractor Information
insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
select id, 'contractor_details', 'text', 'Contractor Details', false, 13,
  'Document pest control contractor company name, contact details, and callout reference number.',
  'e.g., ABC Pest Control Ltd, Tel: 01234 567890, Ref: PC-2024-001'
from task_templates where company_id is null and slug = 'pest_control_device_inspection';

insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
select id, 'contractor_report_reference', 'text', 'Contractor Report Reference', false, 14,
  'Enter the contractor report reference number or upload reference.',
  'e.g., Report #PC-2024-001'
from task_templates where company_id is null and slug = 'pest_control_device_inspection';

-- Notes
insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
select id, 'inspection_notes', 'text', 'Additional Notes', false, 15,
  'Any additional observations, GPS coordinates, or notes from the inspection.',
  'e.g., Device located at GPS: 51.5074°N, 0.1278°W. No issues found.'
from task_templates where company_id is null and slug = 'pest_control_device_inspection';

-- Photo Evidence (Required for ANY pest activity found)
insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'device_photos', 'photo', 'Device Photos (Required if pest activity found)', false, 16,
  'Upload GPS-tagged photos showing device condition and any pest activity evidence. Mandatory for all failures.'
from task_templates where company_id is null and slug = 'pest_control_device_inspection';

insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'pest_activity_photos', 'photo', 'Pest Activity Photos (if found)', false, 17,
  'Upload GPS-tagged photos showing pest activity evidence (droppings, gnaw marks, dead insects, etc.). Mandatory for major/critical findings.'
from task_templates where company_id is null and slug = 'pest_control_device_inspection';

insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'corrective_action_photos', 'photo', 'Corrective Action Photos', false, 18,
  'Upload photos showing corrective actions taken (isolated area, cleaning, contractor work, etc.).'
from task_templates where company_id is null and slug = 'pest_control_device_inspection';

insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'contractor_report_upload', 'photo', 'Contractor Report Upload', false, 19,
  'Upload contractor report document for all call-outs (PDF or photo of report).'
from task_templates where company_id is null and slug = 'pest_control_device_inspection';

commit;

