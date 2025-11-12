-- ============================================================================
-- Seed: fridge_freezer_temperature_template
-- Notes: Sanitised for current schema (no min/max columns, ASCII only)
-- ============================================================================
begin;

delete from template_repeatable_labels
where template_id in (
  select id from task_templates
  where company_id is null
    and slug = 'fridge-freezer-temperature-check'
);

delete from template_fields
where template_id in (
  select id from task_templates
  where company_id is null
    and slug = 'fridge-freezer-temperature-check'
);

delete from task_templates
where company_id is null
  and slug = 'fridge-freezer-temperature-check';

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
  assigned_to_role,
  compliance_standard,
  is_critical,
  is_template_library,
  is_active,
  repeatable_field_name,
  evidence_types,
  instructions,
  triggers_contractor_on_failure,
  contractor_type
) values (
  null,
  'Fridge/Freezer Temperature Check',
  'fridge-freezer-temperature-check',
  'Daily temperature monitoring for all chilled and frozen storage units.',
  'food_safety',
  'food_safety',
  'daily',
  'before_open',
  array['before_open','during_service','after_service'],
  'kitchen_manager',
  'Food Safety Act / HACCP',
  true,
  true,
  true,
  'asset_name',
  array['temperature','checklist','photo'],
  'Record the temperature of each refrigeration unit. Escalate immediately if readings are out of range.',
  true,
  'equipment_repair'
);

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
  'asset_name',
  'select',
  'Refrigeration Asset',
  true,
  1,
  'Select the refrigeration asset being checked.',
  null
from task_templates
where company_id is null
  and slug = 'fridge-freezer-temperature-check';

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
  'temperature',
  'number',
  'Temperature (C)',
  true,
  2,
  'Record the measured temperature. Aim for <= 5C (fridges) or <= -18C (freezers).'
from task_templates
where company_id is null
  and slug = 'fridge-freezer-temperature-check';

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
  'status',
  'pass_fail',
  'Within Safe Range?',
  true,
  3,
  'Pass if temperature is within the validated range. Fail triggers monitor/callout.'
from task_templates
where company_id is null
  and slug = 'fridge-freezer-temperature-check';

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
  'notes',
  'text',
  'Notes / Corrective Actions',
  false,
  4,
  'Document any corrective steps taken when temperatures are out of range.'
from task_templates
where company_id is null
  and slug = 'fridge-freezer-temperature-check';

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
  'initials',
  'text',
  'Checked By (Initials)',
  true,
  5,
  'Initials of the team member performing the check.'
from task_templates
where company_id is null
  and slug = 'fridge-freezer-temperature-check';

insert into template_repeatable_labels (template_id, label, label_value, is_default, display_order)
select id, 'Walk-in Chiller', 'walk_in_chiller', true, 1
from task_templates
where company_id is null
  and slug = 'fridge-freezer-temperature-check';

insert into template_repeatable_labels (template_id, label, label_value, is_default, display_order)
select id, 'Display Fridge A', 'display_fridge_a', true, 2
from task_templates
where company_id is null
  and slug = 'fridge-freezer-temperature-check';

insert into template_repeatable_labels (template_id, label, label_value, is_default, display_order)
select id, 'Display Fridge B', 'display_fridge_b', true, 3
from task_templates
where company_id is null
  and slug = 'fridge-freezer-temperature-check';

insert into template_repeatable_labels (template_id, label, label_value, is_default, display_order)
select id, 'Freezer 1', 'freezer_1', true, 4
from task_templates
where company_id is null
  and slug = 'fridge-freezer-temperature-check';

insert into template_repeatable_labels (template_id, label, label_value, is_default, display_order)
select id, 'Reach-in Freezer', 'reach_in_freezer', false, 5
from task_templates
where company_id is null
  and slug = 'fridge-freezer-temperature-check';

commit;
