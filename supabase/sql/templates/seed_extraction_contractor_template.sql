-- ============================================================================
-- Seed: extraction_system_contractor_verification_template (sanitised)
-- ============================================================================
begin;

delete from template_repeatable_labels
where template_id in (
  select id from task_templates
  where company_id is null
    and slug = 'extraction_system_contractor_verification'
);

delete from template_fields
where template_id in (
  select id from task_templates
  where company_id is null
    and slug = 'extraction_system_contractor_verification'
);

delete from task_templates
where company_id is null
  and slug = 'extraction_system_contractor_verification';

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
  contractor_type,
  requires_sop,
  requires_risk_assessment
) values (
  null,
  'Extraction System Contractor Verification',
  'extraction_system_contractor_verification',
  'Verify contractor extraction cleaning has been completed and documented.',
  'h_and_s',
  'health_safety',
  'monthly',
  'before_open',
  array['before_open'],
  jsonb_build_object(
    'daypart_times', jsonb_build_object('before_open','07:00'),
    'date_of_month', 1,
    'months', array[1,7],
    'default_checklist_items', jsonb_build_array(
      'Schedule qualified contractor service',
      'Verify certificate and insurance details',
      'Confirm work meets safety standards',
      'Capture and upload the service certificate',
      'Record next service due date',
      'File physical documentation'
    ),
    'visibility_window_days_before', 14,
    'visibility_window_days_after', 14,
    'grace_period_days', 7
  ),
  'manager',
  'Health and Safety at Work Act 1974',
  true,
  true,
  true,
  array['text_note','pass_fail','photo'],
  'Confirm the extraction system has been serviced by a qualified contractor, capture certificate details, and plan the next service.',
  null,
  true,
  'duct_cleaning',
  true,
  true
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
  'verification_date',
  'date',
  'Verification Date',
  true,
  1,
  'Date the contractor service was verified.'
from task_templates
where company_id is null
  and slug = 'extraction_system_contractor_verification';

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
  'contractor_company',
  'text',
  'Contractor Company',
  true,
  2,
  'Name of the contractor providing extraction cleaning.'
from task_templates
where company_id is null
  and slug = 'extraction_system_contractor_verification';

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
  'service_date',
  'date',
  'Service Date',
  true,
  3,
  'Date the professional service was carried out.'
from task_templates
where company_id is null
  and slug = 'extraction_system_contractor_verification';

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
  'next_service_due',
  'date',
  'Next Service Due Date',
  true,
  4,
  'Date the next service should be scheduled.'
from task_templates
where company_id is null
  and slug = 'extraction_system_contractor_verification';

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
  'certificate_received',
  'pass_fail',
  'Service Certificate Received',
  true,
  5,
  'Pass if a service certificate has been provided.'
from task_templates
where company_id is null
  and slug = 'extraction_system_contractor_verification';

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
  'contractor_qualified',
  'pass_fail',
  'Contractor Qualified & Insured',
  true,
  6,
  'Pass if contractor holds required qualifications and insurance.'
from task_templates
where company_id is null
  and slug = 'extraction_system_contractor_verification';

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
  'work_completed',
  'pass_fail',
  'Work Completed to Standard',
  true,
  7,
  'Pass if extraction cleaning meets required standard.'
from task_templates
where company_id is null
  and slug = 'extraction_system_contractor_verification';

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
  'verification_complete',
  'pass_fail',
  'Verification Complete',
  true,
  8,
  'Pass if all documentation is complete. Fail to trigger follow-up actions.'
from task_templates
where company_id is null
  and slug = 'extraction_system_contractor_verification';

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
  'verification_notes',
  'text',
  'Verification Notes',
  false,
  9,
  'Record observations or follow-up actions.'
from task_templates
where company_id is null
  and slug = 'extraction_system_contractor_verification';

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
  'verified_by',
  'text',
  'Verified By (Name)',
  true,
  10,
  'Manager verifying the contractor service.'
from task_templates
where company_id is null
  and slug = 'extraction_system_contractor_verification';

commit;
