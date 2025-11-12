-- ============================================================================
-- Seed: training_compliance_management_template (sanitised)
-- ============================================================================
begin;

delete from template_repeatable_labels
where template_id in (
  select id from task_templates
  where company_id is null
    and slug = 'training_compliance_management'
);

delete from template_fields
where template_id in (
  select id from task_templates
  where company_id is null
    and slug = 'training_compliance_management'
);

delete from task_templates
where company_id is null
  and slug = 'training_compliance_management';

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
  'Training Compliance Management',
  'training_compliance_management',
  'Manage training matrix data, summarise expiring certificates, and log follow-up actions.',
  'compliance',
  'health_safety',
  'monthly',
  'anytime',
  array['anytime'],
  jsonb_build_object(
    'date_of_month', 1,
    'daypart_times', jsonb_build_object('anytime','09:00'),
    'default_checklist_items', jsonb_build_array(
      'Open the live training matrix and review current status',
      'Summarise certificates expiring within 60 days',
      'Confirm First Aider and Fire Marshal coverage',
      'List mandatory training gaps',
      'Record refresher or new training bookings required',
      'Create follow-up tasks for outstanding actions',
      'Capture evidence and confirm compliance before closing'
    )
  ),
  'manager',
  'Health and Safety at Work Act 1974',
  true,
  true,
  true,
  array['text_note','pass_fail','repeatable_record'],
  'Review the live training matrix, identify gaps, create bookings, and document follow-up actions to maintain compliance.',
  null,
  false,
  null
);

-- Matrix link and summary
insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
select id, 'matrix_link', 'text', 'Training Matrix Reference', true, 1,
  'Enter the URL or location of the training matrix used for this review.',
  '/dashboard/training'
from task_templates where company_id is null and slug = 'training_compliance_management';

insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
select id, 'matrix_summary', 'text', 'Matrix Summary', true, 2,
  'Summarise key points after reviewing the matrix (expiring certificates, mandatory gaps, overall risk).',
  'e.g., 3 Food Safety renewals due within 30 days; Fire Marshal coverage short on late shift.'
from task_templates where company_id is null and slug = 'training_compliance_management';

-- Expiring certificates and gaps
insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
select id, 'expiring_certificates', 'text', 'Certificates Expiring Soon', true, 3,
  'List certificates expiring within the next 60 days.',
  'e.g., John - Food Safety (15/01); Sarah - First Aid (22/01).'
from task_templates where company_id is null and slug = 'training_compliance_management';

insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
select id, 'missing_mandatory_training', 'text', 'Mandatory Training Gaps', true, 4,
  'Identify staff missing mandatory training modules.',
  'e.g., Two new starters missing H&S induction; allergen refresher overdue for bar team.'
from task_templates where company_id is null and slug = 'training_compliance_management';

-- Specialist coverage
insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'specialist_coverage_ok', 'pass_fail', 'Specialist Coverage Adequate', true, 5,
  'Pass if First Aider and Fire Marshal coverage meets requirements.'
from task_templates where company_id is null and slug = 'training_compliance_management';

insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
select id, 'specialist_coverage_notes', 'text', 'Specialist Coverage Notes', true, 6,
  'Summarise current specialist coverage and any shortfalls.',
  'e.g., Late shift needs additional Fire Marshal coverage; refresher booked for Alex on 12/03.'
from task_templates where company_id is null and slug = 'training_compliance_management';

-- Training bookings and urgency
insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'training_booking_triggers', 'repeatable_record', 'Training Booking Items', false, 7,
  'Optional: capture each person flagged for refresher or new training and the action taken.'
from task_templates where company_id is null and slug = 'training_compliance_management';

insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
select id, 'training_bookings', 'text', 'Training Courses Booked', true, 8,
  'Record refresher or new training bookings and dates.',
  'e.g., Food Safety refresher booked for 3 staff on 15/01; First Aider course 22/02.'
from task_templates where company_id is null and slug = 'training_compliance_management';

insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text, options)
select id, 'training_urgency', 'select', 'Overall Training Urgency', true, 9,
  'Select the urgency level for addressing outstanding training actions.',
  jsonb_build_array(
    jsonb_build_object('value','routine','label','Routine - plan within 3 months'),
    jsonb_build_object('value','priority','label','Priority - schedule within 4 weeks'),
    jsonb_build_object('value','urgent','label','Urgent - book within 2 weeks'),
    jsonb_build_object('value','critical','label','Critical - immediate action required')
  )
from task_templates where company_id is null and slug = 'training_compliance_management';

-- Follow-up tracking
insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
select id, 'follow_up_tasks_created', 'text', 'Follow-up Tasks Created', true, 10,
  'List follow-up tasks created to track completion.',
  'e.g., Task to confirm attendance; task to update profiles with new certificates.'
from task_templates where company_id is null and slug = 'training_compliance_management';

insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'generate_follow_ups', 'pass_fail', 'Follow-up Tasks Generated', true, 11,
  'Pass when follow-up tasks have been created or updated.'
from task_templates where company_id is null and slug = 'training_compliance_management';

-- Final compliance confirmation
insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'full_compliance_achieved', 'pass_fail', 'Full Compliance Achieved', true, 12,
  'Pass when all mandatory training is current or scheduled and coverage requirements are met.'
from task_templates where company_id is null and slug = 'training_compliance_management';

insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
select id, 'compliance_evidence', 'text', 'Compliance Evidence', true, 13,
  'Document evidence confirming compliance (matrix updates, booking confirmations, etc.).',
  'e.g., All required bookings confirmed, matrix updated, compliance report exported.'
from task_templates where company_id is null and slug = 'training_compliance_management';

commit;
