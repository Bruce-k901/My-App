-- ============================================================================
-- Seed: lighting_inspection_template (sanitised)
-- ============================================================================
begin;

delete from template_repeatable_labels
where template_id in (
  select id from task_templates
  where company_id is null
    and slug = 'lighting_inspection'
);

delete from template_fields
where template_id in (
  select id from task_templates
  where company_id is null
    and slug = 'lighting_inspection'
);

delete from task_templates
where company_id is null
  and slug = 'lighting_inspection';

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
  'Weekly Lighting Inspection',
  'lighting_inspection',
  'Check venue lighting is operational; raise electrical callouts for unresolved faults.',
  'h_and_s',
  'health_safety',
  'weekly',
  'before_open',
  array['before_open'],
  jsonb_build_object(
    'daypart_times', jsonb_build_object('before_open','07:00'),
    'days', array[1],
    'default_checklist_items', jsonb_build_array(
      'Kitchen main lighting operational',
      'Food preparation areas adequately lit',
      'Storage rooms lighting functioning',
      'Staff areas lighting working',
      'Customer areas free of faulty lights',
      'Entrance and external lighting operational',
      'Emergency exits clearly illuminated',
      'Replace accessible faulty bulbs',
      'Escalate persistent electrical faults'
    ),
    'visibility_window_days_before', 2,
    'visibility_window_days_after', 3,
    'grace_period_days', 1
  ),
  'manager',
  'Workplace (Health, Safety and Welfare) Regulations 1992',
  false,
  true,
  true,
  array['text_note','pass_fail','photo'],
  'Inspect all areas for lighting faults, replace bulbs where safe, and report electrical issues.',
  null,
  true,
  'electrical'
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
  'Date the lighting inspection was carried out.'
from task_templates
where company_id is null
  and slug = 'lighting_inspection';

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
  'Name of the person completing the inspection.'
from task_templates
where company_id is null
  and slug = 'lighting_inspection';

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
  'all_lighting_ok',
  'pass_fail',
  'All Lighting Operational',
  true,
  3,
  'Pass if lighting is fully operational. Fail to trigger an electrical callout.'
from task_templates
where company_id is null
  and slug = 'lighting_inspection';

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
  'action_notes',
  'text',
  'Actions Taken / Notes',
  false,
  4,
  'Record bulbs replaced, faults found, or contractor follow-up required.',
  'e.g., Replaced 3 bulbs in kitchen, electrician needed for storage room circuit.'
from task_templates
where company_id is null
  and slug = 'lighting_inspection';

commit;
