-- ============================================================================
-- Seed: hot_holding_temperature_template
-- Notes: Sanitised for current schema
-- ============================================================================
begin;

delete from template_repeatable_labels
where template_id in (
  select id from task_templates
  where company_id is null
    and slug = 'hot_holding_temperature_verification'
);

delete from template_fields
where template_id in (
  select id from task_templates
  where company_id is null
    and slug = 'hot_holding_temperature_verification'
);

delete from task_templates
where company_id is null
  and slug = 'hot_holding_temperature_verification';

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
  'Hot Holding Temperature Verification',
  'hot_holding_temperature_verification',
  'During-service verification that hot holding equipment maintains safe temperatures above 63C.',
  'food_safety',
  'food_safety',
  'daily',
  'during_service',
  array['during_service'],
  'BOH',
  'Food Safety Act 1990',
  true,
  true,
  true,
  'equipment_name',
  array['temperature','text_note','photo'],
  'Check each hot holding unit with a calibrated probe thermometer. Recheck and escalate immediately if any station falls below 63C.',
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
  'equipment_name',
  'select',
  'Hot Holding Station',
  true,
  1,
  'Select the hot holding equipment being checked.',
  jsonb_build_array(
    jsonb_build_object('value','bain_marie','label','Bain-marie'),
    jsonb_build_object('value','hot_cabinet','label','Hot cabinet'),
    jsonb_build_object('value','soup_kettle','label','Soup kettle'),
    jsonb_build_object('value','hot_holding_display','label','Hot holding display')
  )
from task_templates
where company_id is null
  and slug = 'hot_holding_temperature_verification';

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
  'Record the measured temperature. Fail if below 63C and escalate immediately.'
from task_templates
where company_id is null
  and slug = 'hot_holding_temperature_verification';

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
  'Above 63C?',
  true,
  3,
  'Pass if temperature is maintained at or above 63C.'
from task_templates
where company_id is null
  and slug = 'hot_holding_temperature_verification';

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
  'Notes / Actions',
  false,
  4,
  'Record observations, corrective actions, or recheck times.'
from task_templates
where company_id is null
  and slug = 'hot_holding_temperature_verification';

commit;
