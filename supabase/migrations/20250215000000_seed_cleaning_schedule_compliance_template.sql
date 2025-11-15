-- ============================================================================
-- Migration: Seed Cleaning Schedule Compliance Template
-- Description: Adds "Verify Cleaning Schedule Compliance" (Manager's Audit) template
-- Category: Food Safety / Cleaning & Premises
-- Frequency: Daily (Manager's walkthrough)
-- Priority: High
-- ============================================================================

BEGIN;

-- Clean up: Delete existing template and all its fields if it exists
DELETE FROM public.template_fields 
WHERE template_id IN (
  SELECT id FROM public.task_templates 
  WHERE company_id IS NULL AND slug = 'cleaning_schedule_compliance_audit'
);

DELETE FROM public.task_templates 
WHERE company_id IS NULL AND slug = 'cleaning_schedule_compliance_audit';

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
  instructions
) VALUES (
  NULL, -- Global template library
  'Verify Cleaning Schedule Compliance',
  'cleaning_schedule_compliance_audit',
  'Daily manager audit to verify cleaning schedule compliance, chemical usage, and staff procedures.',
  'cleaning',
  'food_safety',
  'daily',
  ARRAY['anytime'],
  jsonb_build_object(
    'daypart_times', jsonb_build_object('anytime', '09:00'),
    'default_checklist_items', jsonb_build_array(
      'All scheduled cleaning tasks completed per rota',
      'Chemical dilution rates verified',
      'No missed areas or equipment',
      'Staff following correct procedures'
    )
  ),
  'manager',
  'Food Safety Act 1990, HACCP',
  true, -- High priority (is_critical)
  true, -- Template library
  true, -- Active
  ARRAY['yes_no_checklist', 'photo', 'pass_fail', 'text_note'],
  'Review completed cleaning tasks, verify chemical dilution rates, check for missed areas, and observe staff cleaning procedures. Link to cleaning logs and capture spot check photos.'
)
ON CONFLICT (COALESCE(company_id, '00000000-0000-0000-0000-000000000000'::uuid), slug) 
DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  instructions = EXCLUDED.instructions,
  recurrence_pattern = EXCLUDED.recurrence_pattern,
  updated_at = NOW();

-- Insert template fields for checklist items
INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT 
  id,
  'all_tasks_completed',
  'pass_fail',
  'All scheduled cleaning tasks completed per rota',
  true,
  1,
  'Verify all cleaning tasks scheduled for today have been completed according to the rota.'
FROM public.task_templates 
WHERE company_id IS NULL AND slug = 'cleaning_schedule_compliance_audit';

INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT 
  id,
  'chemical_dilution_verified',
  'pass_fail',
  'Chemical dilution rates verified',
  true,
  2,
  'Check that cleaning chemicals are being diluted according to manufacturer instructions and schedule requirements.'
FROM public.task_templates 
WHERE company_id IS NULL AND slug = 'cleaning_schedule_compliance_audit';

INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT 
  id,
  'no_missed_areas',
  'pass_fail',
  'No missed areas or equipment',
  true,
  3,
  'Confirm all areas and equipment listed in the cleaning schedule have been addressed.'
FROM public.task_templates 
WHERE company_id IS NULL AND slug = 'cleaning_schedule_compliance_audit';

INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT 
  id,
  'staff_procedures_correct',
  'pass_fail',
  'Staff following correct procedures',
  true,
  4,
  'Observe staff cleaning techniques and verify they are following the correct procedures.'
FROM public.task_templates 
WHERE company_id IS NULL AND slug = 'cleaning_schedule_compliance_audit';

INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT 
  id,
  'cleaning_log_review',
  'text',
  'Cleaning Log Review',
  false,
  5,
  'Link to or reference completed cleaning tasks from the cleaning log.'
FROM public.task_templates 
WHERE company_id IS NULL AND slug = 'cleaning_schedule_compliance_audit';

INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT 
  id,
  'spot_check_photos',
  'photo',
  'Spot Check Photos',
  false,
  6,
  'Capture random area verification photos to document cleaning compliance.'
FROM public.task_templates 
WHERE company_id IS NULL AND slug = 'cleaning_schedule_compliance_audit';

INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT 
  id,
  'staff_competency_notes',
  'text',
  'Staff Competency Observations',
  false,
  7,
  'Note observations about staff cleaning techniques and competency.'
FROM public.task_templates 
WHERE company_id IS NULL AND slug = 'cleaning_schedule_compliance_audit';

INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT 
  id,
  'chemical_audit_notes',
  'text',
  'Chemical Audit Notes',
  false,
  8,
  'Document chemical usage compared to schedule and verify proper storage.'
FROM public.task_templates 
WHERE company_id IS NULL AND slug = 'cleaning_schedule_compliance_audit';

INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT 
  id,
  'non_compliance_issues',
  'text',
  'Non-Compliance Issues Found',
  false,
  9,
  'Document any non-compliance issues discovered during the audit.'
FROM public.task_templates 
WHERE company_id IS NULL AND slug = 'cleaning_schedule_compliance_audit';

INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT 
  id,
  'corrective_actions',
  'text',
  'Corrective Actions Taken',
  false,
  10,
  'Document any immediate corrective actions taken (e.g., re-cleaning, retraining, updated logs).'
FROM public.task_templates 
WHERE company_id IS NULL AND slug = 'cleaning_schedule_compliance_audit';

INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT 
  id,
  'manager_initials',
  'text',
  'Manager Initials',
  true,
  11,
  'Manager completing this audit.'
FROM public.task_templates 
WHERE company_id IS NULL AND slug = 'cleaning_schedule_compliance_audit';

-- Verification
DO $$
DECLARE
  template_count INTEGER;
  field_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO template_count
  FROM public.task_templates
  WHERE company_id IS NULL AND slug = 'cleaning_schedule_compliance_audit';
  
  IF template_count = 0 THEN
    RAISE EXCEPTION 'Template was not created!';
  END IF;
  
  SELECT COUNT(*) INTO field_count
  FROM public.template_fields tf
  JOIN public.task_templates tt ON tf.template_id = tt.id
  WHERE tt.company_id IS NULL AND tt.slug = 'cleaning_schedule_compliance_audit';
  
  IF field_count < 4 THEN
    RAISE EXCEPTION 'Expected at least 4 fields, but found %', field_count;
  END IF;
  
  RAISE NOTICE '✅ Template seeded successfully: % fields created', field_count;
END $$;

COMMIT;

