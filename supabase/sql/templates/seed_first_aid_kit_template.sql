-- ============================================================================
-- Seed: first_aid_kit_inspection_template (sanitised)
-- ============================================================================
begin;

delete from template_repeatable_labels
where template_id in (
  select id from task_templates
  where company_id is null
    and slug = 'first_aid_kit_inspection'
);

delete from template_fields
where template_id in (
  select id from task_templates
  where company_id is null
    and slug = 'first_aid_kit_inspection'
);

delete from task_templates
where company_id is null
  and slug = 'first_aid_kit_inspection';

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
  evidence_types,
  instructions,
  repeatable_field_name,
  triggers_contractor_on_failure,
  contractor_type
) values (
  null,
  'Weekly First Aid Kit Inspection',
  'first_aid_kit_inspection',
  'Weekly inspection of first aid kits to ensure supplies are stocked, in date, and accessible.',
  'h_and_s',
  'health_safety',
  'weekly',
  '07:00',
  array['before_open'],
  jsonb_build_object(
    'daypart_times', jsonb_build_object('before_open', '07:00'),
    'default_checklist_items', jsonb_build_array(
      'Check fabric plasters are stocked and in date',
      'Confirm blue detectable plasters are available for food handlers',
      'Check sterile dressings (medium and large)',
      'Verify burns dressings and gel sachets are available',
      'Check disposable gloves and antiseptic wipes',
      'Confirm eye wash solution and finger cots are stocked',
      'Ensure scissors, tweezers, and accident book are available',
      'Restock any used or expired items'
    )
  ),
  'manager',
  'Health and Safety (First-Aid) Regulations 1981',
  true,
  true,
  array['pass_fail','photo','text_note'],
  'Inspect each first aid kit, confirm contents are stocked and in date, and document any restocking required.',
  null,
  false,
  null
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
  'Date when this first aid kit was inspected.'
from task_templates
where company_id is null
  and slug = 'first_aid_kit_inspection';

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
  'first_aid_kit_location',
  'select',
  'First Aid Kit Location',
  true,
  2,
  'Select the location of the kit being inspected.',
  jsonb_build_array(
    jsonb_build_object('value','kitchen','label','Kitchen'),
    jsonb_build_object('value','front_of_house','label','Front of House'),
    jsonb_build_object('value','bar_area','label','Bar Area'),
    jsonb_build_object('value','office','label','Office'),
    jsonb_build_object('value','storage_area','label','Storage Area')
  )
from task_templates
where company_id is null
  and slug = 'first_aid_kit_inspection';

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
  'Kit Fully Stocked & In Date',
  true,
  3,
  'Pass if all required items are stocked and within date.'
from task_templates
where company_id is null
  and slug = 'first_aid_kit_inspection';

insert into template_fields (
  template_id,
  field_name,
  field_type,
  label,
  required,
  field_order,
  help_text,
  placeholder
) select
  id,
  'notes',
  'text',
  'Notes / Restocking Actions',
  false,
  4,
  'Record observations, restocking needs, or accident book updates.',
  'Enter details of items restocked or further actions required.'
from task_templates
where company_id is null
  and slug = 'first_aid_kit_inspection';

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
  'inspected_by_initials',
  'text',
  'Inspected By (Initials)',
  true,
  5,
  'Initials of the person who completed the inspection.'
from task_templates
where company_id is null
  and slug = 'first_aid_kit_inspection';

insert into template_repeatable_labels (template_id, label, label_value, is_default, display_order)
select id, 'Kitchen - First Aid Kit', 'kitchen', true, 1
from task_templates
where company_id is null
  and slug = 'first_aid_kit_inspection';

insert into template_repeatable_labels (template_id, label, label_value, is_default, display_order)
select id, 'Front of House - First Aid Kit', 'front_of_house', true, 2
from task_templates
where company_id is null
  and slug = 'first_aid_kit_inspection';

insert into template_repeatable_labels (template_id, label, label_value, is_default, display_order)
select id, 'Bar Area - First Aid Kit', 'bar_area', true, 3
from task_templates
where company_id is null
  and slug = 'first_aid_kit_inspection';

insert into template_repeatable_labels (template_id, label, label_value, is_default, display_order)
select id, 'Office - First Aid Kit', 'office', true, 4
from task_templates
where company_id is null
  and slug = 'first_aid_kit_inspection';

insert into template_repeatable_labels (template_id, label, label_value, is_default, display_order)
select id, 'Storage Area - First Aid Kit', 'storage_area', true, 5
from task_templates
where company_id is null
  and slug = 'first_aid_kit_inspection';

commit;
