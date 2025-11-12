-- ============================================================================
-- Seed: weekly_pest_control_template (sanitised)
-- ============================================================================
begin;

delete from template_repeatable_labels
where template_id in (
  select id from task_templates
  where company_id is null
    and slug = 'weekly_pest_control_inspection'
);

delete from template_fields
where template_id in (
  select id from task_templates
  where company_id is null
    and slug = 'weekly_pest_control_inspection'
);

delete from task_templates
where company_id is null
  and slug = 'weekly_pest_control_inspection';

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
  'Weekly Pest Control Device Inspection',
  'weekly_pest_control_inspection',
  'Inspect all pest control devices and log findings.',
  'food_safety',
  'food_safety',
  'weekly',
  '07:00',
  array['before_open'],
  jsonb_build_object(
    'daypart_times', jsonb_build_object('before_open', '07:00'),
    'default_checklist_items', jsonb_build_array(
      'Check all mouse traps in storage areas',
      'Inspect insectocutors in food preparation areas',
      'Examine bait stations in external areas',
      'Look for droppings or gnaw marks',
      'Check for entry points around doors and windows',
      'Verify no pest activity in dry goods storage',
      'Document findings and take photos if needed'
    )
  ),
  'manager',
  'Food Safety Act 1990',
  true,
  true,
  array['pass_fail','photo','text_note'],
  'Monitor traps, insect devices, and high-risk zones. Document any activity and trigger contractor follow-up immediately.',
  null,
  true,
  'pest_control'
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
  'overall_assessment',
  'pass_fail',
  'Overall Assessment',
  true,
  1,
  'Fail if any pest activity is detected. This will trigger a pest control contractor callout.'
from task_templates
where company_id is null
  and slug = 'weekly_pest_control_inspection';

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
  'Additional Notes',
  false,
  2,
  'Record observations, photo references, or actions taken.'
from task_templates
where company_id is null
  and slug = 'weekly_pest_control_inspection';

commit;
