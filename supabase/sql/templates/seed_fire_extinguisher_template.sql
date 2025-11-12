-- ============================================================================
-- Seed: fire_extinguisher_inspection_template (sanitised)
-- ============================================================================
begin;

delete from template_repeatable_labels
where template_id in (
  select id from task_templates
  where company_id is null
    and slug = 'fire_extinguisher_inspection'
);

delete from template_fields
where template_id in (
  select id from task_templates
  where company_id is null
    and slug = 'fire_extinguisher_inspection'
);

delete from task_templates
where company_id is null
  and slug = 'fire_extinguisher_inspection';

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
  'Monthly Fire Extinguisher Inspection',
  'fire_extinguisher_inspection',
  'Visual inspection of fire extinguishers for accessibility, condition, and charge.',
  'fire',
  'fire_safety',
  'monthly',
  '07:00',
  array['before_open'],
  jsonb_build_object(
    'date_of_month', 1,
    'daypart_times', jsonb_build_object('before_open', '07:00'),
    'default_checklist_items', jsonb_build_array(
      'Check pressure gauge in the green zone',
      'Verify safety pin and tamper seal intact',
      'Inspect for physical damage or corrosion',
      'Ensure extinguisher is visible and unobstructed',
      'Check inspection tag is present and up to date',
      'Record inspection details in the fire log',
      'Escalate any issues for professional service'
    )
  ),
  'manager',
  'Regulatory Reform (Fire Safety) Order 2005',
  true,
  true,
  true,
  array['pass_fail','text_note','photo'],
  'Inspect each extinguisher, confirm it is accessible, charged, and damage free. Record findings and raise callouts for any faults.',
  null,
  true,
  'fire_safety'
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
  and slug = 'fire_extinguisher_inspection';

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
  'extinguisher_location',
  'select',
  'Extinguisher Location',
  true,
  2,
  'Select the extinguisher location checked.',
  jsonb_build_array(
    jsonb_build_object('value','kitchen_entrance','label','Kitchen - Near Entrance'),
    jsonb_build_object('value','kitchen_line','label','Kitchen - Cooking Line'),
    jsonb_build_object('value','bar_area','label','Bar Area'),
    jsonb_build_object('value','dining_area','label','Main Dining Area'),
    jsonb_build_object('value','reception','label','Reception Area'),
    jsonb_build_object('value','staff_room','label','Staff Room'),
    jsonb_build_object('value','office','label','Office Area'),
    jsonb_build_object('value','storage_room','label','Storage Room')
  )
from task_templates
where company_id is null
  and slug = 'fire_extinguisher_inspection';

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
  'extinguisher_type',
  'select',
  'Extinguisher Type',
  true,
  3,
  'Type of extinguisher being inspected.',
  jsonb_build_array(
    jsonb_build_object('value','water','label','Water (Red)'),
    jsonb_build_object('value','foam','label','Foam (Cream)'),
    jsonb_build_object('value','dry_powder','label','Dry Powder (Blue)'),
    jsonb_build_object('value','co2','label','CO2 (Black)'),
    jsonb_build_object('value','wet_chemical','label','Wet Chemical (Yellow)')
  )
from task_templates
where company_id is null
  and slug = 'fire_extinguisher_inspection';

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
  'pressure_gauge_ok',
  'pass_fail',
  'Pressure Gauge in Green Zone',
  true,
  4,
  'Pass if gauge reads in the green zone.'
from task_templates
where company_id is null
  and slug = 'fire_extinguisher_inspection';

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
  'safety_seal_ok',
  'pass_fail',
  'Safety Pin and Seal Intact',
  true,
  5,
  'Pass if tamper seal and pin are intact.'
from task_templates
where company_id is null
  and slug = 'fire_extinguisher_inspection';

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
  'no_damage',
  'pass_fail',
  'No Physical Damage or Corrosion',
  true,
  6,
  'Pass if extinguisher shows no damage or corrosion.'
from task_templates
where company_id is null
  and slug = 'fire_extinguisher_inspection';

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
  'accessible',
  'pass_fail',
  'Clear Access and Visibility',
  true,
  7,
  'Pass if extinguisher is visible and unobstructed.'
from task_templates
where company_id is null
  and slug = 'fire_extinguisher_inspection';

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
  'inspection_tag_ok',
  'pass_fail',
  'Inspection Tag Present and Current',
  true,
  8,
  'Pass if inspection tag is present and up to date.'
from task_templates
where company_id is null
  and slug = 'fire_extinguisher_inspection';

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
  'overall_assessment',
  'pass_fail',
  'Overall Extinguisher Assessment',
  true,
  9,
  'Pass if all checks are satisfactory. Fail to trigger contractor follow-up.'
from task_templates
where company_id is null
  and slug = 'fire_extinguisher_inspection';

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
  'fault_details',
  'text',
  'Fault Details / Actions Required',
  false,
  10,
  'Describe issues found and the actions required.'
from task_templates
where company_id is null
  and slug = 'fire_extinguisher_inspection';

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
  'Inspected By (Name)',
  true,
  11,
  'Name of the person who performed the inspection.'
from task_templates
where company_id is null
  and slug = 'fire_extinguisher_inspection';

commit;
