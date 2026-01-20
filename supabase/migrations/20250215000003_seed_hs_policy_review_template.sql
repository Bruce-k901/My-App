-- ============================================================================
-- Migration: Seed Health & Safety Policy Review Template
-- Description: Adds "Health & Safety Policy Review & Maintenance" template
-- Category: Health & Safety / Policy & Organisation
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
        WHERE company_id IS NULL AND slug = 'health_safety_policy_review_maintenance'
      );
    END IF;
    
    -- Delete template
    DELETE FROM public.task_templates 
    WHERE company_id IS NULL AND slug = 'health_safety_policy_review_maintenance';
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
  'Health & Safety Policy Review & Maintenance',
  'health_safety_policy_review_maintenance',
  'Annual review and maintenance of the Health & Safety Policy. Ensures policy remains current, legally compliant, and all staff are aware of requirements. Legal requirement under Health & Safety at Work Act 1974.',
  'h_and_s',
  'policy_organisation',
  'annually',
  ARRAY['anytime'],
  jsonb_build_object(
    'daypart_times', jsonb_build_object('anytime', '09:00'),
    'default_checklist_items', jsonb_build_array(
      'Current policy signed and dated by responsible person',
      'All staff have been made aware of policy',
      'Policy reflects current operations and risks',
      'Emergency procedures updated as needed',
      'Contact information current',
      'Changes in legislation incorporated'
    )
  ),
  'manager',
  'Health & Safety at Work Act 1974',
  true, -- High priority (is_critical) - Legal requirement
  true, -- Template library
  true, -- Active
  ARRAY['yes_no_checklist', 'text_note'],
  'Conduct annual review of Health & Safety Policy. Verify policy is current, signed, and all staff are aware. If non-compliant: Minor (out of date by <3 months) - schedule immediate review. Major (out of date by 3-12 months, missing signatures) - freeze policy until updated, schedule review, update and redistribute. Critical (no policy or >12 months outdated) - immediate policy creation/update required, obtain signatures, redistribute to all staff. Maintain version control and change log.',
      true -- Requires SOP link: "Policy Review Procedure"
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
      SELECT t.id, 'policy_version', 'text', 'Current Policy Version', true, 1,
        'Enter the current version number of the Health & Safety Policy (e.g., "3.2" or "2024.1")'
      FROM public.task_templates t
      WHERE t.company_id IS NULL AND t.slug = 'health_safety_policy_review_maintenance'
        AND NOT EXISTS (SELECT 1 FROM public.template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'policy_version');

      INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
      SELECT t.id, 'policy_date', 'date', 'Policy Date', true, 2,
        'Date when the current policy was issued or last reviewed'
      FROM public.task_templates t
      WHERE t.company_id IS NULL AND t.slug = 'health_safety_policy_review_maintenance'
        AND NOT EXISTS (SELECT 1 FROM public.template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'policy_date');

      INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
      SELECT t.id, 'signed_by', 'text', 'Signed By (Responsible Person)', true, 3,
        'Name and title of the responsible person who signed the policy'
      FROM public.task_templates t
      WHERE t.company_id IS NULL AND t.slug = 'health_safety_policy_review_maintenance'
        AND NOT EXISTS (SELECT 1 FROM public.template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'signed_by');

      INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
      SELECT t.id, 'signature_date', 'date', 'Signature Date', true, 4,
        'Date when the policy was signed by the responsible person'
      FROM public.task_templates t
      WHERE t.company_id IS NULL AND t.slug = 'health_safety_policy_review_maintenance'
        AND NOT EXISTS (SELECT 1 FROM public.template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'signature_date');

      INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
      SELECT t.id, 'staff_acknowledgement_status', 'text', 'Staff Acknowledgement Status', false, 5,
        'Document how staff have been made aware of the policy (e.g., "All staff trained", "Posted in staff room", "Included in induction")'
      FROM public.task_templates t
      WHERE t.company_id IS NULL AND t.slug = 'health_safety_policy_review_maintenance'
        AND NOT EXISTS (SELECT 1 FROM public.template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'staff_acknowledgement_status');

      INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
      SELECT t.id, 'policy_document_link', 'text', 'Policy Document Link/Reference', false, 6,
        'Link to or reference the current policy PDF in the document repository'
      FROM public.task_templates t
      WHERE t.company_id IS NULL AND t.slug = 'health_safety_policy_review_maintenance'
        AND NOT EXISTS (SELECT 1 FROM public.template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'policy_document_link');

      INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
      SELECT t.id, 'overall_compliance', 'pass_fail', 'Overall Policy Compliance', true, 7,
        'Is the Health & Safety Policy current, compliant, and properly maintained?'
      FROM public.task_templates t
      WHERE t.company_id IS NULL AND t.slug = 'health_safety_policy_review_maintenance'
        AND NOT EXISTS (SELECT 1 FROM public.template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'overall_compliance');

      INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
      SELECT t.id, 'review_notes', 'text', 'Review Notes', false, 8,
        'Document findings from the policy review, any changes needed, and verification of current operations and risks.'
      FROM public.task_templates t
      WHERE t.company_id IS NULL AND t.slug = 'health_safety_policy_review_maintenance'
        AND NOT EXISTS (SELECT 1 FROM public.template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'review_notes');

      INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
      SELECT t.id, 'severity_level', 'text', 'Severity Level (if non-compliance)', false, 9,
        'Minor: Out of date by <3 months. Major: Out of date by 3-12 months, missing signatures. Critical: No policy or >12 months outdated.'
      FROM public.task_templates t
      WHERE t.company_id IS NULL AND t.slug = 'health_safety_policy_review_maintenance'
        AND NOT EXISTS (SELECT 1 FROM public.template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'severity_level');

      INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
      SELECT t.id, 'corrective_action_taken', 'text', 'Corrective Action Taken', false, 10,
        'Document actions taken (e.g., scheduled policy review, updated and redistributed policy, obtained new signatures, froze policy until updated).'
      FROM public.task_templates t
      WHERE t.company_id IS NULL AND t.slug = 'health_safety_policy_review_maintenance'
        AND NOT EXISTS (SELECT 1 FROM public.template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'corrective_action_taken');

      INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
      SELECT t.id, 'change_log', 'text', 'Change Log', false, 11,
        'Record of policy updates, version history, and key changes made during this review.'
      FROM public.task_templates t
      WHERE t.company_id IS NULL AND t.slug = 'health_safety_policy_review_maintenance'
        AND NOT EXISTS (SELECT 1 FROM public.template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'change_log');

      INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
      SELECT t.id, 'reviewer_initials', 'text', 'Reviewer Initials', true, 12,
        'Initials of the person conducting this policy review.'
      FROM public.task_templates t
      WHERE t.company_id IS NULL AND t.slug = 'health_safety_policy_review_maintenance'
        AND NOT EXISTS (SELECT 1 FROM public.template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'reviewer_initials');
    END IF;

    -- Verification
    DECLARE
      template_count INTEGER;
      field_count INTEGER;
    BEGIN
      SELECT COUNT(*) INTO template_count
      FROM public.task_templates
      WHERE company_id IS NULL AND slug = 'health_safety_policy_review_maintenance';
      
      IF template_count = 0 THEN
        RAISE NOTICE '⚠️ Template was not created (may not exist yet)';
      ELSE
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'template_fields') THEN
          SELECT COUNT(*) INTO field_count
          FROM public.template_fields tf
          JOIN public.task_templates tt ON tf.template_id = tt.id
          WHERE tt.company_id IS NULL AND tt.slug = 'health_safety_policy_review_maintenance';
          
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

