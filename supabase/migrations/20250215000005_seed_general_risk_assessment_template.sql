-- ============================================================================
-- Migration: Seed General Workplace Risk Assessment Template
-- Description: Adds "General Workplace Risk Assessment" template
-- Category: Health & Safety / Risk Assessment
-- Frequency: Annual
-- Priority: High (Legal requirement)
-- Note: This migration will be skipped if task_templates table doesn't exist yet
-- ============================================================================

-- Clean up: Delete existing template and all its fields if it exists (only if tables exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_templates') THEN
    -- Delete template fields if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'template_fields') THEN
      DELETE FROM public.template_fields 
      WHERE template_id IN (
        SELECT id FROM public.task_templates 
        WHERE company_id IS NULL AND slug = 'general_workplace_risk_assessment'
      );
    END IF;
    
    -- Delete template
    DELETE FROM public.task_templates 
    WHERE company_id IS NULL AND slug = 'general_workplace_risk_assessment';
  END IF;
END $$;

-- Insert the template (with ON CONFLICT handling) - only if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_templates') THEN
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
  'General Workplace Risk Assessment',
  'general_workplace_risk_assessment',
  'Annual comprehensive risk assessment covering all work areas. Identifies hazards, rates risks, documents control measures, and ensures staff consultation. Legal requirement under Management of Health & Safety at Work Regulations 1999.',
  'h_and_s',
  'risk_assessment',
  'annually',
  ARRAY['anytime'],
  jsonb_build_object(
    'daypart_times', jsonb_build_object('anytime', '09:00'),
    'default_checklist_items', jsonb_build_array(
      'All work areas covered in assessment',
      'Hazards identified and rated',
      'Control measures documented',
      'Staff consulted during process',
      'Review date set and communicated',
      'Significant findings communicated to staff'
    )
  ),
  'manager',
  'Management of Health & Safety at Work Regulations 1999',
  true, -- High priority (is_critical) - Legal requirement
  true, -- Template library
  true, -- Active
  ARRAY['yes_no_checklist', 'text_note'],
  'Conduct comprehensive annual risk assessment covering all work areas. Identify hazards, rate risks using risk matrix (likelihood vs severity), document control measures, and ensure staff consultation. If non-compliant: Minor (missing minor areas, due for review soon) - schedule immediate assessment for missing areas. Major (key areas missing, outdated by 3-12 months) - schedule immediate full assessment, implement temporary control measures for high-risk areas. Critical (no current RA or >12 months outdated) - immediate full assessment required, implement interim controls, management escalation for urgent completion. Maintain signed risk assessment documents, staff consultation records, and action plans.',
  true -- Requires SOP link: "Risk Assessment Procedure"
)
    ON CONFLICT (COALESCE(company_id, '00000000-0000-0000-0000-000000000000'::uuid), slug) 
    DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      instructions = EXCLUDED.instructions,
      recurrence_pattern = EXCLUDED.recurrence_pattern,
      updated_at = NOW();

    -- Insert template fields (only if template_fields table exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'template_fields') THEN
      INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
      SELECT t.id, 'assessment_date', 'date', 'Assessment Date', true, 1,
        'Date when this risk assessment was conducted'
      FROM public.task_templates t
      WHERE t.company_id IS NULL AND t.slug = 'general_workplace_risk_assessment'
        AND NOT EXISTS (SELECT 1 FROM public.template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'assessment_date');

      INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
      SELECT t.id, 'review_date', 'date', 'Review Date', true, 2,
        'Date when this risk assessment should be reviewed (typically 12 months from assessment date)'
      FROM public.task_templates t
      WHERE t.company_id IS NULL AND t.slug = 'general_workplace_risk_assessment'
        AND NOT EXISTS (SELECT 1 FROM public.template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'review_date');

      INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
      SELECT t.id, 'assessed_areas', 'text', 'Areas Assessed', true, 3,
        'List all work areas covered in this assessment (e.g., Kitchen, Bar, Storage, Front of House, Office, Staff Room)'
      FROM public.task_templates t
      WHERE t.company_id IS NULL AND t.slug = 'general_workplace_risk_assessment'
        AND NOT EXISTS (SELECT 1 FROM public.template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'assessed_areas');

      INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
      SELECT t.id, 'hazards_identified', 'text', 'Hazards Identified', true, 4,
        'Document all hazards identified during the assessment'
      FROM public.task_templates t
      WHERE t.company_id IS NULL AND t.slug = 'general_workplace_risk_assessment'
        AND NOT EXISTS (SELECT 1 FROM public.template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'hazards_identified');

      INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
      SELECT t.id, 'risk_ratings', 'text', 'Risk Ratings', false, 5,
        'Document risk ratings using risk matrix (Likelihood vs Severity) for each identified hazard'
      FROM public.task_templates t
      WHERE t.company_id IS NULL AND t.slug = 'general_workplace_risk_assessment'
        AND NOT EXISTS (SELECT 1 FROM public.template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'risk_ratings');

      INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
      SELECT t.id, 'control_measures', 'text', 'Control Measures Documented', true, 6,
        'Document all control measures implemented or required for identified hazards'
      FROM public.task_templates t
      WHERE t.company_id IS NULL AND t.slug = 'general_workplace_risk_assessment'
        AND NOT EXISTS (SELECT 1 FROM public.template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'control_measures');

      INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
      SELECT t.id, 'staff_consultation', 'text', 'Staff Consultation Details', true, 7,
        'Document how staff were consulted during the risk assessment process (meetings, surveys, discussions)'
      FROM public.task_templates t
      WHERE t.company_id IS NULL AND t.slug = 'general_workplace_risk_assessment'
        AND NOT EXISTS (SELECT 1 FROM public.template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'staff_consultation');

      INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
      SELECT t.id, 'significant_findings_communicated', 'text', 'Significant Findings Communication', true, 8,
        'How and when significant findings were communicated to staff (noticeboard, meeting, training session)'
      FROM public.task_templates t
      WHERE t.company_id IS NULL AND t.slug = 'general_workplace_risk_assessment'
        AND NOT EXISTS (SELECT 1 FROM public.template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'significant_findings_communicated');

      INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
      SELECT t.id, 'action_plan', 'text', 'Action Plan / Follow-up Controls', false, 9,
        'Document any follow-up actions required with deadlines and responsible persons'
      FROM public.task_templates t
      WHERE t.company_id IS NULL AND t.slug = 'general_workplace_risk_assessment'
        AND NOT EXISTS (SELECT 1 FROM public.template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'action_plan');

      INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
      SELECT t.id, 'risk_assessment_document_reference', 'text', 'Risk Assessment Document Reference/Link', false, 10,
        'Reference or link to the full risk assessment PDF document'
      FROM public.task_templates t
      WHERE t.company_id IS NULL AND t.slug = 'general_workplace_risk_assessment'
        AND NOT EXISTS (SELECT 1 FROM public.template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'risk_assessment_document_reference');

      INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
      SELECT t.id, 'overall_compliance', 'pass_fail', 'Overall Risk Assessment Compliance', true, 11,
        'Is a current, comprehensive risk assessment in place and compliant?'
      FROM public.task_templates t
      WHERE t.company_id IS NULL AND t.slug = 'general_workplace_risk_assessment'
        AND NOT EXISTS (SELECT 1 FROM public.template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'overall_compliance');

      INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
      SELECT t.id, 'assessment_notes', 'text', 'Assessment Notes', false, 12,
        'Additional notes, findings, or observations from the risk assessment review'
      FROM public.task_templates t
      WHERE t.company_id IS NULL AND t.slug = 'general_workplace_risk_assessment'
        AND NOT EXISTS (SELECT 1 FROM public.template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'assessment_notes');

      INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
      SELECT t.id, 'severity_level', 'text', 'Severity Level (if non-compliance)', false, 13,
        'Minor: Missing minor areas, due for review soon. Major: Key areas missing, outdated by 3-12 months. Critical: No current RA or >12 months outdated.'
      FROM public.task_templates t
      WHERE t.company_id IS NULL AND t.slug = 'general_workplace_risk_assessment'
        AND NOT EXISTS (SELECT 1 FROM public.template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'severity_level');

      INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
      SELECT t.id, 'corrective_action_taken', 'text', 'Corrective Action Taken', false, 14,
        'Document actions taken (e.g., schedule immediate assessment, temporary control measures, management escalation)'
      FROM public.task_templates t
      WHERE t.company_id IS NULL AND t.slug = 'general_workplace_risk_assessment'
        AND NOT EXISTS (SELECT 1 FROM public.template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'corrective_action_taken');

      INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
      SELECT t.id, 'assessor_name', 'text', 'Assessor Name', true, 15,
        'Name of the person who conducted this risk assessment review'
      FROM public.task_templates t
      WHERE t.company_id IS NULL AND t.slug = 'general_workplace_risk_assessment'
        AND NOT EXISTS (SELECT 1 FROM public.template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'assessor_name');
    END IF;

    -- Verification
    DECLARE
      template_count INTEGER;
      field_count INTEGER;
    BEGIN
      SELECT COUNT(*) INTO template_count
      FROM public.task_templates
      WHERE company_id IS NULL AND slug = 'general_workplace_risk_assessment';
      
      IF template_count = 0 THEN
        RAISE NOTICE '⚠️ Template was not created (may not exist yet)';
      ELSE
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'template_fields') THEN
          SELECT COUNT(*) INTO field_count
          FROM public.template_fields tf
          JOIN public.task_templates tt ON tf.template_id = tt.id
          WHERE tt.company_id IS NULL AND tt.slug = 'general_workplace_risk_assessment';
          
          IF field_count < 4 THEN
            RAISE WARNING '⚠️ Expected at least 4 fields, but found %', field_count;
          ELSE
            RAISE NOTICE '✅ Template seeded successfully: % fields created', field_count;
          END IF;
        ELSE
          RAISE NOTICE '⚠️ template_fields table does not exist yet - skipping field verification';
        END IF;
      END IF;
    END;
  ELSE
    RAISE NOTICE '⚠️ task_templates table does not exist yet - skipping template creation';
  END IF;
END $$;

