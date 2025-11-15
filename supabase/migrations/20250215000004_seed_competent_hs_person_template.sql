-- ============================================================================
-- Migration: Seed Competent Health & Safety Person Appointment Template
-- Description: Adds "Competent Health & Safety Person Appointment" template
-- Category: Health & Safety / Policy & Organisation
-- Frequency: Annual (or when role changes)
-- Priority: High (Legal requirement)
-- ============================================================================

BEGIN;

-- Clean up: Delete existing template and all its fields if it exists
DELETE FROM public.template_fields 
WHERE template_id IN (
  SELECT id FROM public.task_templates 
  WHERE company_id IS NULL AND slug = 'competent_health_safety_person_appointment'
);

DELETE FROM public.task_templates 
WHERE company_id IS NULL AND slug = 'competent_health_safety_person_appointment';

-- Insert the template (with ON CONFLICT handling)
INSERT INTO public.task_templates (
  company_id,
  name,
  slug,
  description,
  category,
  audit_category,
  frequency,
  dayparts,
  recurrence_pattern,
  assigned_to_role,
  compliance_standard,
  is_critical,
  is_template_library,
  is_active,
  evidence_types,
  instructions,
  requires_sop
) VALUES (
  NULL, -- Global template library
  'Competent Health & Safety Person Appointment',
  'competent_health_safety_person_appointment',
  'Annual verification that a competent Health & Safety person is formally appointed. Ensures legal compliance with Health & Safety at Work Act 1974 requirement for competent H&S supervision. Review appointment, training records, and ensure contact details are displayed to all staff.',
  'h_and_s',
  'policy_organisation',
  'annually',
  ARRAY['anytime'],
  jsonb_build_object(
    'daypart_times', jsonb_build_object('anytime', '09:00'),
    'default_checklist_items', jsonb_build_array(
      'Formal appointment letter in place',
      'Role responsibilities clearly defined',
      'Training/competence records current',
      'Contact details displayed to all staff',
      'Deputy appointed for cover',
      'Management support documented'
    )
  ),
  'manager',
  'Health & Safety at Work Act 1974',
  true, -- High priority (is_critical) - Legal requirement
  true, -- Template library
  true, -- Active
  ARRAY['yes_no_checklist', 'text_note'],
  'Verify that a competent Health & Safety person is formally appointed. Review appointment letter, training records, and ensure contact details are displayed. If non-compliant: Minor (deputy cover needed temporarily) - appoint deputy immediately. Major (role vacant <30 days, training lapsed) - urgent recruitment/training required, interim manager appointment. Critical (no appointed person >30 days) - executive escalation for urgent resolution, temporary designation of responsible manager. Maintain signed appointment letters, training certificates, and organizational charts.',
  true -- Requires SOP link: "H&S Role Responsibilities"
)
ON CONFLICT (COALESCE(company_id, '00000000-0000-0000-0000-000000000000'::uuid), slug) 
DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  instructions = EXCLUDED.instructions,
  recurrence_pattern = EXCLUDED.recurrence_pattern,
  updated_at = NOW();

-- Insert template fields
INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT 
  id,
  'appointed_person_name',
  'text',
  'Appointed Person Name',
  true,
  1,
  'Full name of the currently appointed competent Health & Safety person'
FROM public.task_templates 
WHERE company_id IS NULL AND slug = 'competent_health_safety_person_appointment';

INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT 
  id,
  'appointment_date',
  'date',
  'Appointment Date',
  true,
  2,
  'Date when the current appointment was made'
FROM public.task_templates 
WHERE company_id IS NULL AND slug = 'competent_health_safety_person_appointment';

INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT 
  id,
  'appointment_term_end_date',
  'date',
  'Appointment Term End Date',
  false,
  3,
  'End date of current appointment term (if applicable)'
FROM public.task_templates 
WHERE company_id IS NULL AND slug = 'competent_health_safety_person_appointment';

INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT 
  id,
  'appointment_letter_reference',
  'text',
  'Appointment Letter Reference/Link',
  false,
  4,
  'Reference or link to the formal appointment letter document'
FROM public.task_templates 
WHERE company_id IS NULL AND slug = 'competent_health_safety_person_appointment';

INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT 
  id,
  'role_responsibilities',
  'text',
  'Role Responsibilities Summary',
  false,
  5,
  'Summary of key responsibilities defined for this role'
FROM public.task_templates 
WHERE company_id IS NULL AND slug = 'competent_health_safety_person_appointment';

INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT 
  id,
  'training_records_link',
  'text',
  'Training/Competence Records Link',
  false,
  6,
  'Link to training records and competence certificates for the appointed person'
FROM public.task_templates 
WHERE company_id IS NULL AND slug = 'competent_health_safety_person_appointment';

INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT 
  id,
  'contact_details_displayed',
  'text',
  'Contact Details Display Status',
  false,
  7,
  'Where and how contact details are displayed to all staff (e.g., "Staff noticeboard", "Emergency contact list", "Intranet")'
FROM public.task_templates 
WHERE company_id IS NULL AND slug = 'competent_health_safety_person_appointment';

INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT 
  id,
  'deputy_appointed',
  'text',
  'Deputy Appointee',
  false,
  8,
  'Name of deputy appointed for cover (if applicable)'
FROM public.task_templates 
WHERE company_id IS NULL AND slug = 'competent_health_safety_person_appointment';

INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT 
  id,
  'management_support_documented',
  'text',
  'Management Support Documentation',
  false,
  9,
  'Documentation of management support and resources provided to the appointed person'
FROM public.task_templates 
WHERE company_id IS NULL AND slug = 'competent_health_safety_person_appointment';

INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT 
  id,
  'overall_compliance',
  'pass_fail',
  'Overall Appointment Compliance',
  true,
  10,
  'Is a competent Health & Safety person formally appointed and compliant?'
FROM public.task_templates 
WHERE company_id IS NULL AND slug = 'competent_health_safety_person_appointment';

INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT 
  id,
  'review_notes',
  'text',
  'Review Notes',
  false,
  11,
  'Document findings from the appointment review, any changes needed, or role updates.'
FROM public.task_templates 
WHERE company_id IS NULL AND slug = 'competent_health_safety_person_appointment';

INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT 
  id,
  'severity_level',
  'text',
  'Severity Level (if non-compliance)',
  false,
  12,
  'Minor: Deputy cover needed temporarily. Major: Role vacant <30 days, training lapsed. Critical: No appointed person >30 days.'
FROM public.task_templates 
WHERE company_id IS NULL AND slug = 'competent_health_safety_person_appointment';

INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT 
  id,
  'corrective_action_taken',
  'text',
  'Corrective Action Taken',
  false,
  13,
  'Document actions taken (e.g., urgent recruitment/training, interim manager appointment, executive escalation, temporary designation).'
FROM public.task_templates 
WHERE company_id IS NULL AND slug = 'competent_health_safety_person_appointment';

INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT 
  id,
  'reviewer_initials',
  'text',
  'Reviewer Initials',
  true,
  14,
  'Initials of the person conducting this appointment review.'
FROM public.task_templates 
WHERE company_id IS NULL AND slug = 'competent_health_safety_person_appointment';

-- Verification
DO $$
DECLARE
  template_count INTEGER;
  field_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO template_count
  FROM public.task_templates
  WHERE company_id IS NULL AND slug = 'competent_health_safety_person_appointment';
  
  IF template_count = 0 THEN
    RAISE EXCEPTION 'Template was not created!';
  END IF;
  
  SELECT COUNT(*) INTO field_count
  FROM public.template_fields tf
  JOIN public.task_templates tt ON tf.template_id = tt.id
  WHERE tt.company_id IS NULL AND tt.slug = 'competent_health_safety_person_appointment';
  
  IF field_count < 4 THEN
    RAISE EXCEPTION 'Expected at least 4 fields, but found %', field_count;
  END IF;
  
  RAISE NOTICE '✅ Template seeded successfully: % fields created', field_count;
END $$;

COMMIT;

