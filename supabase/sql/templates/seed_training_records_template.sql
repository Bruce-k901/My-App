-- ============================================================================
-- Seed: training_records_review_template (sanitised)
-- ============================================================================
begin;

delete from template_repeatable_labels
where template_id in (
  select id from task_templates
  where company_id is null
    and slug = 'training_records_review'
);

delete from template_fields
where template_id in (
  select id from task_templates
  where company_id is null
    and slug = 'training_records_review'
);

delete from task_templates
where company_id is null
  and slug = 'training_records_review';

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
  'Monthly Training Compliance Review',
  'training_records_review',
  'Review staff training records, update certificate expiries, and plan refresher training for gaps.',
  'compliance',
  'health_safety',
  'monthly',
  'anytime',
  array['anytime'],
  jsonb_build_object(
    'date_of_month', 1,
    'daypart_times', jsonb_build_object('anytime','09:00'),
    'default_checklist_items', jsonb_build_array(
      'Review staff list and current training records',
      'Check Food Safety certificate expiries',
      'Review Health & Safety training compliance',
      'Verify Allergen Awareness training status',
      'Review First Aid certification',
      'Check Fire Marshal training records',
      'Update any new training completed',
      'Schedule refreshers for expiring certifications',
      'Prepare training gap summary for management'
    )
  ),
  'manager',
  'Health and Safety at Work Act 1974',
  true,
  true,
  true,
  array['text_note','pass_fail'],
  'Review the current training matrix, identify gaps, record updates, and schedule required refreshers.',
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
  'review_date',
  'date',
  'Compliance Review Date',
  true,
  1,
  'Date this training compliance review was performed.'
from task_templates
where company_id is null
  and slug = 'training_records_review';

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
  'reviewed_by',
  'text',
  'Reviewed By',
  true,
  2,
  'Manager completing the review.'
from task_templates
where company_id is null
  and slug = 'training_records_review';

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
  'staff_training_summary',
  'text',
  'Staff Training Summary',
  true,
  3,
  'Summarise overall training status, including upcoming expiries.',
  'e.g., Food Safety refreshers needed for 3 staff, allergen training overdue for 1 team member.'
from task_templates
where company_id is null
  and slug = 'training_records_review';

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
  'new_training_completed',
  'text',
  'New Training Completed',
  false,
  4,
  'Record any training completed since the last review.',
  'e.g., Allergen refresher completed for Sarah on 15/11.'
from task_templates
where company_id is null
  and slug = 'training_records_review';

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
  'certificate_updates',
  'text',
  'Certificate Updates',
  false,
  5,
  'List any certificate expiry updates made in staff records.',
  'e.g., Updated Mike''s Food Safety expiry to 15/03/2025.'
from task_templates
where company_id is null
  and slug = 'training_records_review';

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
  'training_gaps_identified',
  'text',
  'Training Gaps Identified',
  true,
  6,
  'Document training gaps or certificates needing renewal.',
  'e.g., First Aid refresher required for two supervisors.'
from task_templates
where company_id is null
  and slug = 'training_records_review';

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
  'training_priority',
  'select',
  'Training Priority Level',
  true,
  7,
  'Overall priority for addressing identified training gaps.',
  jsonb_build_array(
    jsonb_build_object('value','low','label','Low - All training current'),
    jsonb_build_object('value','medium','label','Medium - Refreshers needed within 3 months'),
    jsonb_build_object('value','high','label','High - Multiple certificates expiring soon'),
    jsonb_build_object('value','critical','label','Critical - Expired or missing mandatory training')
  )
from task_templates
where company_id is null
  and slug = 'training_records_review';

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
  'scheduled_refreshers',
  'text',
  'Scheduled Refresher Training',
  false,
  8,
  'List refresher training sessions that have been booked.',
  'e.g., Fire Marshal refresher booked for 12/02.'
from task_templates
where company_id is null
  and slug = 'training_records_review';

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
  'compliance_met',
  'pass_fail',
  'Training Compliance Met',
  true,
  9,
  'Pass if mandatory training is current or scheduled; fail if critical gaps remain.'
from task_templates
where company_id is null
  and slug = 'training_records_review';

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
  'next_review_focus',
  'text',
  'Next Review Focus',
  false,
  10,
  'Note specific areas that need attention during the next review.',
  'e.g., Confirm allergen training for new starters.'
from task_templates
where company_id is null
  and slug = 'training_records_review';

commit;
