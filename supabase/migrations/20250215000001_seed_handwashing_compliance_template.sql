-- ============================================================================
-- Migration: Seed Staff Handwashing Compliance Template
-- Description: Adds "Staff Handwashing Compliance Observation" template
-- Category: Food Safety / Personal Hygiene
-- Frequency: Daily (Random spot checks)
-- Priority: High
-- ============================================================================

BEGIN;

-- Clean up: Delete existing template and all its fields if it exists
DELETE FROM public.template_fields 
WHERE template_id IN (
  SELECT id FROM public.task_templates 
  WHERE company_id IS NULL AND slug = 'staff_handwashing_compliance_observation'
);

DELETE FROM public.task_templates 
WHERE company_id IS NULL AND slug = 'staff_handwashing_compliance_observation';

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
  'Staff Handwashing Compliance Observation',
  'staff_handwashing_compliance_observation',
  'Daily random spot checks to observe and verify staff handwashing compliance. Ensures proper handwashing procedures are followed to prevent food contamination.',
  'food_safety',
  'personal_hygiene',
  'daily',
  ARRAY['anytime'],
  jsonb_build_object(
    'daypart_times', jsonb_build_object('anytime', '09:00'),
    'default_checklist_items', jsonb_build_array(
      'Washes hands before starting work',
      'Washes hands after handling raw food',
      'Washes hands after touching face/hair',
      'Washes hands after handling waste',
      'Uses correct technique (20 seconds)',
      'Uses soap and disposable towels',
      'No jewellery/watches during prep'
    )
  ),
  'manager',
  'Food Safety Act 1990, Food Hygiene Regulations, HACCP',
  true, -- High priority (is_critical)
  true, -- Template library
  true, -- Active
  ARRAY['yes_no_checklist', 'text_note'],
  'Conduct discreet observations of staff handwashing practices. Observe without disrupting workflow. Document compliance with handwashing procedures. If non-compliance is observed: Minor issues (forgot one step) - provide quiet, immediate correction. Major issues (skipped handwash after raw food) - require immediate handwash and document. Critical issues (repeated non-compliance) - escalate for formal retraining. Link observations to staff training records. No photos required for privacy.',
  true -- Requires SOP link: "Handwashing Policy & Procedure"
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
  'observed_staff',
  'text',
  'Observed Staff Member',
  true,
  1,
  'Select or enter the name of the staff member being observed.'
FROM public.task_templates 
WHERE company_id IS NULL AND slug = 'staff_handwashing_compliance_observation';

INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT 
  id,
  'observation_time',
  'text',
  'Observation Time / Activity',
  false,
  2,
  'What activity or time prompted the handwashing observation? (e.g., "After handling raw chicken", "Before food prep", "After break")'
FROM public.task_templates 
WHERE company_id IS NULL AND slug = 'staff_handwashing_compliance_observation';

INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT 
  id,
  'overall_compliance',
  'pass_fail',
  'Overall Compliance',
  true,
  3,
  'Did the staff member demonstrate full compliance with handwashing procedures?'
FROM public.task_templates 
WHERE company_id IS NULL AND slug = 'staff_handwashing_compliance_observation';

INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT 
  id,
  'observation_notes',
  'text',
  'Observation Notes',
  false,
  4,
  'Document specific observations, any non-compliance issues, and actions taken.'
FROM public.task_templates 
WHERE company_id IS NULL AND slug = 'staff_handwashing_compliance_observation';

INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT 
  id,
  'severity_level',
  'text',
  'Severity Level (if non-compliance)',
  false,
  5,
  'Minor: Forgot one step, quick reminder. Major: Skipped handwash after raw food. Critical: Repeated non-compliance.'
FROM public.task_templates 
WHERE company_id IS NULL AND slug = 'staff_handwashing_compliance_observation';

INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT 
  id,
  'corrective_action_taken',
  'text',
  'Corrective Action Taken',
  false,
  6,
  'Document any immediate corrective actions (e.g., quiet correction, on-spot retraining, documented in training record).'
FROM public.task_templates 
WHERE company_id IS NULL AND slug = 'staff_handwashing_compliance_observation';

INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT 
  id,
  'training_record_updated',
  'text',
  'Training Record Updated',
  false,
  7,
  'Note if this observation was linked to staff training records or if formal retraining was scheduled.'
FROM public.task_templates 
WHERE company_id IS NULL AND slug = 'staff_handwashing_compliance_observation';

INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT 
  id,
  'observer_initials',
  'text',
  'Observer Initials',
  true,
  8,
  'Initials of the person conducting this observation.'
FROM public.task_templates 
WHERE company_id IS NULL AND slug = 'staff_handwashing_compliance_observation';

-- Verification
DO $$
DECLARE
  template_count INTEGER;
  field_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO template_count
  FROM public.task_templates
  WHERE company_id IS NULL AND slug = 'staff_handwashing_compliance_observation';
  
  IF template_count = 0 THEN
    RAISE EXCEPTION 'Template was not created!';
  END IF;
  
  SELECT COUNT(*) INTO field_count
  FROM public.template_fields tf
  JOIN public.task_templates tt ON tf.template_id = tt.id
  WHERE tt.company_id IS NULL AND tt.slug = 'staff_handwashing_compliance_observation';
  
  IF field_count < 4 THEN
    RAISE EXCEPTION 'Expected at least 4 fields, but found %', field_count;
  END IF;
  
  RAISE NOTICE '✅ Template seeded successfully: % fields created', field_count;
END $$;

COMMIT;

