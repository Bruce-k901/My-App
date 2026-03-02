-- ============================================================================
-- Migration: Seed Protective Clothing Compliance Template
-- Description: Adds "Protective Clothing Compliance Check" template
-- Category: Food Safety / Personal Hygiene
-- Frequency: Daily (Start-of-shift inspection)
-- Priority: Medium
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
        WHERE company_id IS NULL AND slug = 'protective_clothing_compliance_check'
      );
    END IF;
    
    -- Delete template
    DELETE FROM public.task_templates 
    WHERE company_id IS NULL AND slug = 'protective_clothing_compliance_check';
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

    -- Insert template fields (only if template_fields table exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'template_fields') THEN
      INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
      SELECT t.id, 'department', 'text', 'Department', true, 1,
        'Select department: Kitchen, Prep, Service, or Delivery'
      FROM public.task_templates t
      WHERE t.company_id IS NULL AND t.slug = 'protective_clothing_compliance_check'
        AND NOT EXISTS (SELECT 1 FROM public.template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'department');

      INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
      SELECT t.id, 'staff_count_total', 'text', 'Total Staff Count', false, 2,
        'Total number of staff inspected'
      FROM public.task_templates t
      WHERE t.company_id IS NULL AND t.slug = 'protective_clothing_compliance_check'
        AND NOT EXISTS (SELECT 1 FROM public.template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'staff_count_total');

      INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
      SELECT t.id, 'staff_count_compliant', 'text', 'Compliant Staff Count', false, 3,
        'Number of staff found to be fully compliant'
      FROM public.task_templates t
      WHERE t.company_id IS NULL AND t.slug = 'protective_clothing_compliance_check'
        AND NOT EXISTS (SELECT 1 FROM public.template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'staff_count_compliant');

      INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
      SELECT t.id, 'staff_count_non_compliant', 'text', 'Non-Compliant Staff Count', false, 4,
        'Number of staff found with compliance issues'
      FROM public.task_templates t
      WHERE t.company_id IS NULL AND t.slug = 'protective_clothing_compliance_check'
        AND NOT EXISTS (SELECT 1 FROM public.template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'staff_count_non_compliant');

      INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
      SELECT t.id, 'overall_compliance', 'pass_fail', 'Overall Department Compliance', true, 5,
        'Did all staff meet protective clothing requirements?'
      FROM public.task_templates t
      WHERE t.company_id IS NULL AND t.slug = 'protective_clothing_compliance_check'
        AND NOT EXISTS (SELECT 1 FROM public.template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'overall_compliance');

      INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
      SELECT t.id, 'compliance_notes', 'text', 'Compliance Notes', false, 6,
        'Document specific observations, any non-compliance issues, and color coding verification.'
      FROM public.task_templates t
      WHERE t.company_id IS NULL AND t.slug = 'protective_clothing_compliance_check'
        AND NOT EXISTS (SELECT 1 FROM public.template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'compliance_notes');

      INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
      SELECT t.id, 'severity_level', 'text', 'Severity Level (if non-compliance)', false, 7,
        'Minor: Missing hat, minor jewellery. Major: Soiled clothing, no apron. Critical: Cross-contamination risk (wrong color coding).'
      FROM public.task_templates t
      WHERE t.company_id IS NULL AND t.slug = 'protective_clothing_compliance_check'
        AND NOT EXISTS (SELECT 1 FROM public.template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'severity_level');

      INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
      SELECT t.id, 'corrective_action_taken', 'text', 'Corrective Action Taken', false, 8,
        'Document actions taken (e.g., provided replacement PPE, documented uniform issue, notified laundry service).'
      FROM public.task_templates t
      WHERE t.company_id IS NULL AND t.slug = 'protective_clothing_compliance_check'
        AND NOT EXISTS (SELECT 1 FROM public.template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'corrective_action_taken');

      INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
      SELECT t.id, 'uniform_issue_log', 'text', 'Uniform Issue Log', false, 9,
        'Record any uniform issues, shortages, or laundry service notifications.'
      FROM public.task_templates t
      WHERE t.company_id IS NULL AND t.slug = 'protective_clothing_compliance_check'
        AND NOT EXISTS (SELECT 1 FROM public.template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'uniform_issue_log');

      INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
      SELECT t.id, 'inspector_initials', 'text', 'Inspector Initials', true, 10,
        'Initials of the person conducting this inspection.'
      FROM public.task_templates t
      WHERE t.company_id IS NULL AND t.slug = 'protective_clothing_compliance_check'
        AND NOT EXISTS (SELECT 1 FROM public.template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'inspector_initials');
    END IF;

    -- Verification
    DECLARE
      template_count INTEGER;
      field_count INTEGER;
    BEGIN
      SELECT COUNT(*) INTO template_count
      FROM public.task_templates
      WHERE company_id IS NULL AND slug = 'protective_clothing_compliance_check';
      
      IF template_count = 0 THEN
        RAISE NOTICE '⚠️ Template was not created (may not exist yet)';
      ELSE
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'template_fields') THEN
          SELECT COUNT(*) INTO field_count
          FROM public.template_fields tf
          JOIN public.task_templates tt ON tf.template_id = tt.id
          WHERE tt.company_id IS NULL AND tt.slug = 'protective_clothing_compliance_check';
          
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

