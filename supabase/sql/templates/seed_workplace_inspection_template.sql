-- ============================================================================
-- Seed: workplace_inspection_template (sanitised)
-- ============================================================================
begin;

delete from template_repeatable_labels
where template_id in (
  select id from task_templates
  where company_id is null
    and slug = 'workplace_inspection'
);

delete from template_fields
where template_id in (
  select id from task_templates
  where company_id is null
    and slug = 'workplace_inspection'
);

delete from task_templates
where company_id is null
  and slug = 'workplace_inspection';

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
  triggers_contractor_on_failure,
  contractor_type
) values (
  null,
  'Monthly Health & Safety Workplace Inspection',
  'workplace_inspection',
  'Comprehensive safety walkthrough covering kitchen, FOH, staff welfare, and fire safety requirements.',
  'h_and_s',
  'health_safety',
  'monthly',
  'before_open',
  array['before_open'],
  jsonb_build_object(
    'date_of_month', 1,
    'daypart_times', jsonb_build_object('before_open','07:00'),
    'default_checklist_items', jsonb_build_array(
      'Kitchen floors clean and non-slip',
      'Trip hazards removed from work areas',
      'Fire extinguishers accessible and charged',
      'Extraction and ventilation in good order',
      'Electrical equipment PAT tested',
      'Food storage organised and labelled',
      'Temperature controls working',
      'Handwashing stations stocked',
      'Waste areas clean and sealed',
      'Front of house lighting and fixtures safe',
      'Emergency exits clear and signed',
      'Spill kits stocked and accessible',
      'Staff facilities clean and stocked',
      'First aid kits stocked and in date',
      'PPE available where required',
      'Fire alarm tests up to date',
      'Emergency lighting operational',
      'Evacuation plans displayed'
    ),
    'visibility_window_days_before', 7,
    'visibility_window_days_after', 7,
    'grace_period_days', 3
  ),
  'manager',
  'Health and Safety at Work Act 1974',
  true,
  true,
  true,
  array['text_note','pass_fail','photo'],
  'Conduct a full venue inspection, document hazards found, assign corrective actions, and follow up on critical issues.',
  null,
  true,
  'safety_consultant'
);

insert into template_fields (
  template_id,
  field_name,
  field_type,
  label,
  required,
  field_order,
  help_text
) select
  id,
  'inspection_date',
  'date',
  'Inspection Date',
  true,
  1,
  'Date the inspection was performed.'
from task_templates
where company_id is null
  and slug = 'workplace_inspection';

insert into template_fields (
  template_id,
  field_name,
  field_type,
  label,
  required,
  field_order,
  help_text
) select
  id,
  'inspected_by',
  'text',
  'Inspected By',
  true,
  2,
  'Name of the manager conducting the inspection.'
from task_templates
where company_id is null
  and slug = 'workplace_inspection';

insert into template_fields (
  template_id,
  field_name,
  field_type,
  label,
  required,
  field_order,
  help_text,
  options
) select
  id,
  'venue_area',
  'select',
  'Primary Area Focus',
  true,
  3,
  'Select the main area covered by this inspection.',
  jsonb_build_array(
    jsonb_build_object('value','kitchen_storage','label','Kitchen & Storage'),
    jsonb_build_object('value','front_of_house','label','Front of House & Bar'),
    jsonb_build_object('value','staff_admin','label','Staff & Admin Areas'),
    jsonb_build_object('value','external_delivery','label','External & Delivery Areas'),
    jsonb_build_object('value','full_venue','label','Full Venue Inspection')
  )
from task_templates
where company_id is null
  and slug = 'workplace_inspection';

-- Category assessments
insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'kitchen_safety_ok', 'pass_fail', 'Kitchen Safety Satisfactory', true, 4,
  'Pass if kitchen safety items are satisfactory. Fail if hazards found.'
from task_templates where company_id is null and slug = 'workplace_inspection';

insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'food_safety_ok', 'pass_fail', 'Food Safety & Hygiene Satisfactory', true, 5,
  'Pass if food safety controls are in place. Fail if hygiene issues found.'
from task_templates where company_id is null and slug = 'workplace_inspection';

insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'front_of_house_ok', 'pass_fail', 'Front of House Safety Satisfactory', true, 6,
  'Pass if customer areas are hazard free.'
from task_templates where company_id is null and slug = 'workplace_inspection';

insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'staff_welfare_ok', 'pass_fail', 'Staff Welfare Satisfactory', true, 7,
  'Pass if staff welfare facilities meet standards.'
from task_templates where company_id is null and slug = 'workplace_inspection';

insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'fire_safety_ok', 'pass_fail', 'Fire Safety Satisfactory', true, 8,
  'Pass if fire safety controls are in place.'
from task_templates where company_id is null and slug = 'workplace_inspection';

insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'overall_safety_ok', 'pass_fail', 'Overall Safety Assessment', true, 9,
  'Pass if the workplace meets required standards. Fail will trigger safety consultant follow-up.'
from task_templates where company_id is null and slug = 'workplace_inspection';

-- Documentation fields
insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'hazards_found', 'text', 'Hazards Identified', false, 10,
  'List hazards identified during inspection with locations and risks.'
from task_templates where company_id is null and slug = 'workplace_inspection';

insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'corrective_actions', 'text', 'Corrective Actions', false, 11,
  'Record immediate actions taken and follow-up required.'
from task_templates where company_id is null and slug = 'workplace_inspection';

insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'next_inspection_focus', 'text', 'Next Inspection Focus', false, 12,
  'Note any areas that need extra attention next time.'
from task_templates where company_id is null and slug = 'workplace_inspection';

commit;
