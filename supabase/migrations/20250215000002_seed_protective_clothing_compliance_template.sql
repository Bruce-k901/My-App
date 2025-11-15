-- ============================================================================
-- Migration: Seed Protective Clothing Compliance Template
-- Description: Adds "Protective Clothing Compliance Check" template
-- Category: Food Safety / Personal Hygiene
-- Frequency: Daily (Start-of-shift inspection)
-- Priority: Medium
-- ============================================================================

BEGIN;

-- Clean up: Delete existing template and all its fields if it exists
DELETE FROM public.template_fields 
WHERE template_id IN (
  SELECT id FROM public.task_templates 
  WHERE company_id IS NULL AND slug = 'protective_clothing_compliance_check'
);

DELETE FROM public.task_templates 
WHERE company_id IS NULL AND slug = 'protective_clothing_compliance_check';

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
  'Protective Clothing Compliance Check',
  'protective_clothing_compliance_check',
  'Daily start-of-shift inspection to verify staff are wearing clean, appropriate protective clothing. Ensures proper PPE compliance to prevent cross-contamination.',
  'food_safety',
  'personal_hygiene',
  'daily',
  ARRAY['before_open'],
  jsonb_build_object(
    'daypart_times', jsonb_build_object('before_open', '08:00'),
    'default_checklist_items', jsonb_build_array(
      'Clean chef whites/aprons worn',
      'Hair restraint/hat properly worn',
      'No jewellery (except wedding band)',
      'Clean non-slip footwear',
      'Aprons changed between tasks',
      'No soiling/stains on clothing',
      'Correct color coding (raw vs ready-to-eat)'
    )
  ),
  'manager',
  'Food Safety Act 1990, Food Hygiene Regulations, HACCP',
  false, -- Medium priority (not critical)
  true, -- Template library
  true, -- Active
  ARRAY['yes_no_checklist', 'text_note'],
  'Conduct start-of-shift inspection of protective clothing compliance. Check all staff for proper PPE. If non-compliance found: Minor issues (missing hat, minor jewellery) - provide immediate correction with spare PPE. Major issues (soiled clothing, no apron) - require immediate change and document uniform issue. Critical issues (cross-contamination risk, wrong color coding) - immediate correction, document, and notify laundry service if shortages. Track compliance rates and maintain uniform issue log.',
  true -- Requires SOP link: "Uniform & PPE Policy"
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
  'department',
  'text',
  'Department',
  true,
  1,
  'Select department: Kitchen, Prep, Service, or Delivery'
FROM public.task_templates 
WHERE company_id IS NULL AND slug = 'protective_clothing_compliance_check';

INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT 
  id,
  'staff_count_total',
  'text',
  'Total Staff Count',
  false,
  2,
  'Total number of staff inspected'
FROM public.task_templates 
WHERE company_id IS NULL AND slug = 'protective_clothing_compliance_check';

INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT 
  id,
  'staff_count_compliant',
  'text',
  'Compliant Staff Count',
  false,
  3,
  'Number of staff found to be fully compliant'
FROM public.task_templates 
WHERE company_id IS NULL AND slug = 'protective_clothing_compliance_check';

INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT 
  id,
  'staff_count_non_compliant',
  'text',
  'Non-Compliant Staff Count',
  false,
  4,
  'Number of staff found with compliance issues'
FROM public.task_templates 
WHERE company_id IS NULL AND slug = 'protective_clothing_compliance_check';

INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT 
  id,
  'overall_compliance',
  'pass_fail',
  'Overall Department Compliance',
  true,
  5,
  'Did all staff meet protective clothing requirements?'
FROM public.task_templates 
WHERE company_id IS NULL AND slug = 'protective_clothing_compliance_check';

INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT 
  id,
  'compliance_notes',
  'text',
  'Compliance Notes',
  false,
  6,
  'Document specific observations, any non-compliance issues, and color coding verification.'
FROM public.task_templates 
WHERE company_id IS NULL AND slug = 'protective_clothing_compliance_check';

INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT 
  id,
  'severity_level',
  'text',
  'Severity Level (if non-compliance)',
  false,
  7,
  'Minor: Missing hat, minor jewellery. Major: Soiled clothing, no apron. Critical: Cross-contamination risk (wrong color coding).'
FROM public.task_templates 
WHERE company_id IS NULL AND slug = 'protective_clothing_compliance_check';

INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT 
  id,
  'corrective_action_taken',
  'text',
  'Corrective Action Taken',
  false,
  8,
  'Document actions taken (e.g., provided replacement PPE, documented uniform issue, notified laundry service).'
FROM public.task_templates 
WHERE company_id IS NULL AND slug = 'protective_clothing_compliance_check';

INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT 
  id,
  'uniform_issue_log',
  'text',
  'Uniform Issue Log',
  false,
  9,
  'Record any uniform issues, shortages, or laundry service notifications.'
FROM public.task_templates 
WHERE company_id IS NULL AND slug = 'protective_clothing_compliance_check';

INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT 
  id,
  'inspector_initials',
  'text',
  'Inspector Initials',
  true,
  10,
  'Initials of the person conducting this inspection.'
FROM public.task_templates 
WHERE company_id IS NULL AND slug = 'protective_clothing_compliance_check';

-- Verification
DO $$
DECLARE
  template_count INTEGER;
  field_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO template_count
  FROM public.task_templates
  WHERE company_id IS NULL AND slug = 'protective_clothing_compliance_check';
  
  IF template_count = 0 THEN
    RAISE EXCEPTION 'Template was not created!';
  END IF;
  
  SELECT COUNT(*) INTO field_count
  FROM public.template_fields tf
  JOIN public.task_templates tt ON tf.template_id = tt.id
  WHERE tt.company_id IS NULL AND tt.slug = 'protective_clothing_compliance_check';
  
  IF field_count < 4 THEN
    RAISE EXCEPTION 'Expected at least 4 fields, but found %', field_count;
  END IF;
  
  RAISE NOTICE '✅ Template seeded successfully: % fields created', field_count;
END $$;

COMMIT;

