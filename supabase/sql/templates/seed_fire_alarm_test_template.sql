-- ============================================================================
-- Seed: fire_alarm_test_template (sanitised)
-- ============================================================================
begin;

delete from template_repeatable_labels
where template_id in (
  select id from task_templates
  where company_id is null
    and slug = 'fire_alarm_test_weekly'
);

delete from template_fields
where template_id in (
  select id from task_templates
  where company_id is null
    and slug = 'fire_alarm_test_weekly'
);

delete from task_templates
where company_id is null
  and slug = 'fire_alarm_test_weekly';

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
  'Test fire alarms and emergency lighting',
  'fire_alarm_test_weekly',
  'Weekly testing of fire alarms and emergency lighting systems. Verify operation and escalate any faults immediately.',
  'h_and_s',
  'fire_safety',
  'weekly',
  '09:00',
  array['before_open'],
  jsonb_build_object(
    'daypart_times', jsonb_build_object('before_open', '09:00'),
    'default_checklist_items', jsonb_build_array(
      'Warn all staff that a fire alarm test is about to take place',
      'Select a different call point each week (rotate through all call points)',
      'Activate the call point using the test key or break-glass cover',
      'Verify all sounders are audible throughout the venue',
      'Confirm all staff heard the alarm',
      'Silence and reset the system using the fire panel',
      'Record test details in the fire logbook',
      'Report any sounder faults immediately to the fire contractor',
      'Test emergency lighting (monthly visual check)',
      'Check all emergency light fittings illuminate correctly',
      'Restore power and confirm charging indicators are lit',
      'Record emergency lighting test results in the logbook'
    )
  ),
  'manager',
  'Fire Safety Order 2005',
  true,
  true,
  array['pass_fail','photo','text_note'],
  'Test a different alarm call point each week, verify audibility, and document the results. Report any faults to the fire engineer immediately.',
  null,
  true,
  'fire_engineer'
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
  'test_date',
  'date',
  'Test Date',
  true,
  1,
  'Date when the alarm test was carried out.'
from task_templates
where company_id is null
  and slug = 'fire_alarm_test_weekly';

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
  'fire_alarm_call_point',
  'select',
  'Fire Alarm Call Point',
  true,
  2,
  'Select the call point tested this week. Rotate through all call points.'
from task_templates
where company_id is null
  and slug = 'fire_alarm_test_weekly';

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
  'alarm_activated',
  'pass_fail',
  'Alarm Activated Successfully',
  true,
  3,
  'Pass if alarm activated when call point was triggered.'
from task_templates
where company_id is null
  and slug = 'fire_alarm_test_weekly';

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
  'all_staff_heard',
  'pass_fail',
  'All Staff Heard the Alarm',
  true,
  4,
  'Confirm staff across the venue heard the alarm.'
from task_templates
where company_id is null
  and slug = 'fire_alarm_test_weekly';

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
  'emergency_lighting_test',
  'pass_fail',
  'Emergency Lighting Test (Monthly)',
  false,
  5,
  'Pass if emergency lighting illuminates correctly during the test.'
from task_templates
where company_id is null
  and slug = 'fire_alarm_test_weekly';

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
  'issues',
  'text',
  'Issues or Observations',
  false,
  6,
  'Record any faults, observations, or follow-up actions.'
from task_templates
where company_id is null
  and slug = 'fire_alarm_test_weekly';

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
  'manager_initials',
  'text',
  'Tested By (Initials)',
  true,
  7,
  'Initials of the person who performed the test.'
from task_templates
where company_id is null
  and slug = 'fire_alarm_test_weekly';

insert into template_repeatable_labels (template_id, label, label_value, is_default, display_order)
select id, 'Call Point 1 - Front Entrance', 'call_point_front_entrance', true, 1
from task_templates
where company_id is null
  and slug = 'fire_alarm_test_weekly';

insert into template_repeatable_labels (template_id, label, label_value, is_default, display_order)
select id, 'Call Point 2 - Kitchen', 'call_point_kitchen', true, 2
from task_templates
where company_id is null
  and slug = 'fire_alarm_test_weekly';

insert into template_repeatable_labels (template_id, label, label_value, is_default, display_order)
select id, 'Call Point 3 - Bar Area', 'call_point_bar', true, 3
from task_templates
where company_id is null
  and slug = 'fire_alarm_test_weekly';

insert into template_repeatable_labels (template_id, label, label_value, is_default, display_order)
select id, 'Call Point 4 - Back Office', 'call_point_back_office', true, 4
from task_templates
where company_id is null
  and slug = 'fire_alarm_test_weekly';

insert into template_repeatable_labels (template_id, label, label_value, is_default, display_order)
select id, 'Call Point 5 - Storage Area', 'call_point_storage', true, 5
from task_templates
where company_id is null
  and slug = 'fire_alarm_test_weekly';

commit;
