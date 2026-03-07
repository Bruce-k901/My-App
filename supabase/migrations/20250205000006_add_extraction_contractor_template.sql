-- ============================================================================
-- Migration: 20250205000006_add_extraction_contractor_template.sql
-- Description: Contractor service verification with document upload
-- Features: Checklist, Pass/Fail, Document uploads, Visibility windows
-- Note: This migration will be skipped if task_templates table doesn't exist yet
-- ============================================================================

-- Clean up existing template (only if tables exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_templates') THEN
    -- Delete repeatable labels if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'template_repeatable_labels') THEN
      DELETE FROM template_repeatable_labels 
      WHERE template_id IN (SELECT id FROM task_templates WHERE slug = 'extraction_system_contractor_verification');
    END IF;
    
    -- Delete template fields if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'template_fields') THEN
      DELETE FROM template_fields 
      WHERE template_id IN (SELECT id FROM task_templates WHERE slug = 'extraction_system_contractor_verification');
    END IF;
    
    -- Delete template
    DELETE FROM task_templates 
    WHERE slug = 'extraction_system_contractor_verification';
  END IF;
END $$;

-- Create contractor verification template (only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_templates') THEN
    INSERT INTO task_templates (
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
  contractor_type,
  is_active,
  requires_sop,
  requires_risk_assessment
) VALUES (
  NULL,
  'Extraction System Contractor Verification',
  'extraction_system_contractor_verification',
  'Verify extraction system professional service and upload certificates',
  'h_and_s',
  'health_safety',
  'monthly',  -- Using monthly with months array for biannual (Jan, Jul)
  'before_open',
  ARRAY['before_open'],
  jsonb_build_object(
    'daypart_times', jsonb_build_object('before_open', '07:00'),
    'date_of_month', 1,  -- First of the month
    'months', ARRAY[1, 7],  -- January and July (biannual)
    'default_checklist_items', jsonb_build_array(
      'Schedule professional extraction cleaning',
      'Receive service completion certificate',
      'Verify contractor is qualified and insured',
      'Check work meets safety standards',
      'Upload service certificate to system',
      'Update next service due date',
      'File physical copy in compliance records'
    ),
    'visibility_window_days_before', 14,    -- Show in feed 2 weeks before due
    'visibility_window_days_after', 14,     -- Stay in feed 2 weeks after due
    'grace_period_days', 7                  -- Becomes "late" after 7 days past due
  ),
  'manager',
  'Health and Safety at Work Act 1974',
  TRUE,
  TRUE,
  ARRAY['text_note', 'pass_fail'],  -- Checklist + Pass/Fail
  'Purpose: Verify professional extraction cleaning service has been completed and documented.

Importance: Legal requirement for commercial kitchens. Proper extraction cleaning prevents fire hazards and ensures compliance with health and safety regulations.

Method:
1. Schedule professional extraction cleaning service
2. Receive and verify service completion certificate
3. Verify contractor qualifications and insurance
4. Check work meets safety standards
5. Upload certificate to system
6. Update next service due date
7. File physical copy in compliance records

Special Requirements:
- Service must be performed by qualified contractor
- Certificate must show date, contractor details, and service scope
- Keep certificate for minimum 5 years for compliance records',
  NULL,                              -- No asset selection
  TRUE,                              -- Trigger contractor on failure
  'duct_cleaning',                   -- Contractor type
  TRUE,                              -- Is active
  TRUE,                              -- Enable document upload (SOP/document section)
      TRUE                               -- Enable risk assessment upload (for certificates)
    );
  END IF;
END $$;

-- Add template fields for contractor verification (only if both tables exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_templates')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'template_fields') THEN
    INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT t.id, 'verification_date', 'date', 'Verification Date', TRUE, 1, 
      'Date when contractor service was verified.'
    FROM task_templates t
    WHERE t.slug = 'extraction_system_contractor_verification'
      AND NOT EXISTS (SELECT 1 FROM template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'verification_date');

    INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT t.id, 'contractor_company', 'text', 'Contractor Company', TRUE, 2,
      'Name of the professional extraction cleaning company.'
    FROM task_templates t
    WHERE t.slug = 'extraction_system_contractor_verification'
      AND NOT EXISTS (SELECT 1 FROM template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'contractor_company');

    INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT t.id, 'service_date', 'date', 'Service Date', TRUE, 3,
      'Date when professional service was performed.'
    FROM task_templates t
    WHERE t.slug = 'extraction_system_contractor_verification'
      AND NOT EXISTS (SELECT 1 FROM template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'service_date');

    INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT t.id, 'next_service_due', 'date', 'Next Service Due Date', TRUE, 4,
      'Date when next professional service is due.'
    FROM task_templates t
    WHERE t.slug = 'extraction_system_contractor_verification'
      AND NOT EXISTS (SELECT 1 FROM template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'next_service_due');

    -- Verification checklist items
    INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT t.id, 'certificate_received', 'pass_fail', 'Service Certificate Received', TRUE, 10,
      'PASS if professional service certificate was provided. FAIL if no certificate.'
    FROM task_templates t
    WHERE t.slug = 'extraction_system_contractor_verification'
      AND NOT EXISTS (SELECT 1 FROM template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'certificate_received');

    INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT t.id, 'contractor_qualified', 'pass_fail', 'Contractor Qualified & Insured', TRUE, 11,
      'PASS if contractor has appropriate qualifications and insurance. FAIL if unqualified.'
    FROM task_templates t
    WHERE t.slug = 'extraction_system_contractor_verification'
      AND NOT EXISTS (SELECT 1 FROM template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'contractor_qualified');

    INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT t.id, 'work_completed', 'pass_fail', 'Work Completed to Standard', TRUE, 12,
      'PASS if extraction cleaning was completed properly. FAIL if issues found.'
    FROM task_templates t
    WHERE t.slug = 'extraction_system_contractor_verification'
      AND NOT EXISTS (SELECT 1 FROM template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'work_completed');

    -- Overall verification
    INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT t.id, 'verification_complete', 'pass_fail', 'Verification Complete', TRUE, 20,
      'PASS if all contractor work is verified and documented. FAIL if issues - triggers follow-up.'
    FROM task_templates t
    WHERE t.slug = 'extraction_system_contractor_verification'
      AND NOT EXISTS (SELECT 1 FROM template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'verification_complete');

    INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
    SELECT t.id, 'verification_notes', 'text', 'Verification Notes', FALSE, 21,
      'Record any observations or follow-up actions required.',
      'e.g., Certificate missing insurance details, follow-up with contractor...'
    FROM task_templates t
    WHERE t.slug = 'extraction_system_contractor_verification'
      AND NOT EXISTS (SELECT 1 FROM template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'verification_notes');

    INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT t.id, 'verified_by', 'text', 'Verified By (Name)', TRUE, 22,
      'Manager who verified the contractor work.'
    FROM task_templates t
    WHERE t.slug = 'extraction_system_contractor_verification'
      AND NOT EXISTS (SELECT 1 FROM template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'verified_by');
  END IF;
END $$;

-- Verification (only if tables exist)
DO $$
DECLARE
  template_record RECORD;
  field_count INTEGER;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_templates') THEN
    SELECT * INTO template_record
    FROM task_templates
    WHERE slug = 'extraction_system_contractor_verification';
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'template_fields') THEN
      SELECT COUNT(*) INTO field_count
      FROM template_fields
      WHERE template_id = template_record.id;
    ELSE
      field_count := 0;
    END IF;
  
    IF template_record.id IS NOT NULL THEN
      RAISE NOTICE '✅ Extraction System Contractor Verification template created:';
      RAISE NOTICE '   Template ID: %', template_record.id;
      RAISE NOTICE '   Evidence types: %', template_record.evidence_types;
      RAISE NOTICE '   Requires SOP: %', template_record.requires_sop;
      RAISE NOTICE '   Requires Risk Assessment: %', template_record.requires_risk_assessment;
      RAISE NOTICE '   Visibility window before: % days', (template_record.recurrence_pattern->>'visibility_window_days_before');
      RAISE NOTICE '   Visibility window after: % days', (template_record.recurrence_pattern->>'visibility_window_days_after');
      RAISE NOTICE '   Grace period: % days', (template_record.recurrence_pattern->>'grace_period_days');
      RAISE NOTICE '   Template fields: %', field_count;
    ELSE
      RAISE NOTICE '⚠️ Template not found (may not exist yet)';
    END IF;
  ELSE
    RAISE NOTICE '⚠️ task_templates table does not exist yet - skipping verification';
  END IF;
END $$;

