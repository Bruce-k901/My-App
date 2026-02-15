-- ============================================================================
-- Migration: Seed Manual Handling Risk Assessment Template
-- Description: Adds "Manual Handling Risk Assessment" template
-- Category: Health & Safety / Risk Assessment
-- Frequency: Annual
-- Priority: Medium (Injury prevention)
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
        WHERE company_id IS NULL AND slug = 'manual_handling_risk_assessment'
      );
    END IF;
    
    -- Delete template
    DELETE FROM public.task_templates 
    WHERE company_id IS NULL AND slug = 'manual_handling_risk_assessment';
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
  'Manual Handling Risk Assessment',
  'manual_handling_risk_assessment',
  'Annual assessment of all manual handling tasks to identify risks, document weight limits, verify training, and ensure mechanical aids are available. Prevents musculoskeletal injuries through proper risk management and control measures.',
  'h_and_s',
  'risk_assessment',
  'annually',
  ARRAY['anytime'],
  jsonb_build_object(
    'daypart_times', jsonb_build_object('anytime', '09:00'),
    'default_checklist_items', jsonb_build_array(
      'All manual handling tasks identified',
      'Weight limits and frequencies documented',
      'Staff training records verified',
      'Mechanical aids available and functional',
      'Task rotation schedules in place',
      'Injury records reviewed for trends'
    )
  ),
  'manager',
  'Manual Handling Operations Regulations 1992',
  false, -- Medium priority (is_critical) - Injury prevention
  true, -- Template library
  true, -- Active
  ARRAY['yes_no_checklist', 'text_note'],
  'Conduct annual assessment of all manual handling tasks. Identify tasks, document weight limits and frequencies, verify staff training records, check mechanical aids availability and functionality, review task rotation schedules, and analyze injury records for trends. If non-compliant: Minor (missing documentation, minor improvements needed) - complete documentation, implement minor improvements. Major (high-risk tasks without controls, training gaps) - immediate equipment provision required, staff retraining scheduled, implement controls for high-risk tasks. Critical (immediate injury risk, no mechanical aids) - immediate restrictions on high-risk tasks, urgent equipment provision, task redesign for high-risk activities, management escalation. Maintain signed assessment documents, equipment maintenance records, and training certificates.',
  true -- Requires SOP link: "Safe Manual Handling Procedures"
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
        'Date when this manual handling risk assessment was conducted'
      FROM public.task_templates t
      WHERE t.company_id IS NULL AND t.slug = 'manual_handling_risk_assessment'
        AND NOT EXISTS (SELECT 1 FROM public.template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'assessment_date');

      INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
      SELECT t.id, 'review_date', 'date', 'Review Date', true, 2,
        'Date when this assessment should be reviewed (typically 12 months from assessment date)'
      FROM public.task_templates t
      WHERE t.company_id IS NULL AND t.slug = 'manual_handling_risk_assessment'
        AND NOT EXISTS (SELECT 1 FROM public.template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'review_date');

      INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
      SELECT t.id, 'manual_handling_tasks_identified', 'text', 'Manual Handling Tasks Identified', true, 3,
        'List all manual handling tasks identified in the workplace (e.g., lifting boxes, moving kegs, carrying trays, stacking chairs, handling deliveries)'
      FROM public.task_templates t
      WHERE t.company_id IS NULL AND t.slug = 'manual_handling_risk_assessment'
        AND NOT EXISTS (SELECT 1 FROM public.template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'manual_handling_tasks_identified');

      INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
      SELECT t.id, 'weight_limits_frequencies', 'text', 'Weight Limits and Frequencies Documented', true, 4,
        'Document weight limits and frequencies for each identified manual handling task'
      FROM public.task_templates t
      WHERE t.company_id IS NULL AND t.slug = 'manual_handling_risk_assessment'
        AND NOT EXISTS (SELECT 1 FROM public.template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'weight_limits_frequencies');

      INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
      SELECT t.id, 'staff_training_records_verified', 'text', 'Staff Training Records Verification', true, 5,
        'Document verification of staff training records for manual handling (link to training records, dates, certificates)'
      FROM public.task_templates t
      WHERE t.company_id IS NULL AND t.slug = 'manual_handling_risk_assessment'
        AND NOT EXISTS (SELECT 1 FROM public.template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'staff_training_records_verified');

      INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
      SELECT t.id, 'mechanical_aids_inventory', 'text', 'Mechanical Aids Available and Functional', true, 6,
        'List all mechanical aids available (trolleys, lifting equipment, etc.) and verify they are functional and accessible'
      FROM public.task_templates t
      WHERE t.company_id IS NULL AND t.slug = 'manual_handling_risk_assessment'
        AND NOT EXISTS (SELECT 1 FROM public.template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'mechanical_aids_inventory');

      INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
      SELECT t.id, 'task_rotation_schedules', 'text', 'Task Rotation Schedules', true, 7,
        'Document task rotation schedules in place to prevent repetitive strain injuries'
      FROM public.task_templates t
      WHERE t.company_id IS NULL AND t.slug = 'manual_handling_risk_assessment'
        AND NOT EXISTS (SELECT 1 FROM public.template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'task_rotation_schedules');

      INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
      SELECT t.id, 'injury_records_review', 'text', 'Injury Records Review for Trends', true, 8,
        'Document review of injury records to identify trends related to manual handling tasks'
      FROM public.task_templates t
      WHERE t.company_id IS NULL AND t.slug = 'manual_handling_risk_assessment'
        AND NOT EXISTS (SELECT 1 FROM public.template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'injury_records_review');

      INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
      SELECT t.id, 'high_risk_tasks_identified', 'text', 'High-Risk Tasks Identified', false, 9,
        'List any high-risk manual handling tasks identified that require immediate attention or controls'
      FROM public.task_templates t
      WHERE t.company_id IS NULL AND t.slug = 'manual_handling_risk_assessment'
        AND NOT EXISTS (SELECT 1 FROM public.template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'high_risk_tasks_identified');

      INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
      SELECT t.id, 'control_measures', 'text', 'Control Measures Implemented', false, 10,
        'Document control measures implemented to reduce manual handling risks (equipment, training, task redesign, rotation)'
      FROM public.task_templates t
      WHERE t.company_id IS NULL AND t.slug = 'manual_handling_risk_assessment'
        AND NOT EXISTS (SELECT 1 FROM public.template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'control_measures');

      INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
      SELECT t.id, 'equipment_maintenance_records', 'text', 'Equipment Maintenance Records Link', false, 11,
        'Reference or link to equipment maintenance records for mechanical aids'
      FROM public.task_templates t
      WHERE t.company_id IS NULL AND t.slug = 'manual_handling_risk_assessment'
        AND NOT EXISTS (SELECT 1 FROM public.template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'equipment_maintenance_records');

      INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
      SELECT t.id, 'assessment_document_reference', 'text', 'Assessment Document Reference/Link', false, 12,
        'Reference or link to the full manual handling risk assessment document'
      FROM public.task_templates t
      WHERE t.company_id IS NULL AND t.slug = 'manual_handling_risk_assessment'
        AND NOT EXISTS (SELECT 1 FROM public.template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'assessment_document_reference');

      INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
      SELECT t.id, 'overall_compliance', 'pass_fail', 'Overall Manual Handling Assessment Compliance', true, 13,
        'Is a current, comprehensive manual handling risk assessment in place and compliant?'
      FROM public.task_templates t
      WHERE t.company_id IS NULL AND t.slug = 'manual_handling_risk_assessment'
        AND NOT EXISTS (SELECT 1 FROM public.template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'overall_compliance');

      INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
      SELECT t.id, 'assessment_notes', 'text', 'Assessment Notes', false, 14,
        'Additional notes, findings, or observations from the manual handling risk assessment review'
      FROM public.task_templates t
      WHERE t.company_id IS NULL AND t.slug = 'manual_handling_risk_assessment'
        AND NOT EXISTS (SELECT 1 FROM public.template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'assessment_notes');

      INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
      SELECT t.id, 'severity_level', 'text', 'Severity Level (if non-compliance)', false, 15,
        'Minor: Missing documentation, minor improvements needed. Major: High-risk tasks without controls, training gaps. Critical: Immediate injury risk, no mechanical aids.'
      FROM public.task_templates t
      WHERE t.company_id IS NULL AND t.slug = 'manual_handling_risk_assessment'
        AND NOT EXISTS (SELECT 1 FROM public.template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'severity_level');

      INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
      SELECT t.id, 'corrective_action_taken', 'text', 'Corrective Action Taken', false, 16,
        'Document actions taken (e.g., immediate equipment provision, staff retraining, task redesign, temporary restrictions on high-risk tasks)'
      FROM public.task_templates t
      WHERE t.company_id IS NULL AND t.slug = 'manual_handling_risk_assessment'
        AND NOT EXISTS (SELECT 1 FROM public.template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'corrective_action_taken');

      INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
      SELECT t.id, 'assessor_name', 'text', 'Assessor Name', true, 17,
        'Name of the person who conducted this manual handling risk assessment review'
      FROM public.task_templates t
      WHERE t.company_id IS NULL AND t.slug = 'manual_handling_risk_assessment'
        AND NOT EXISTS (SELECT 1 FROM public.template_fields tf WHERE tf.template_id = t.id AND tf.field_name = 'assessor_name');
    END IF;

    -- Verification
    DECLARE
      template_count INTEGER;
      field_count INTEGER;
    BEGIN
      SELECT COUNT(*) INTO template_count
      FROM public.task_templates
      WHERE company_id IS NULL AND slug = 'manual_handling_risk_assessment';
      
      IF template_count = 0 THEN
        RAISE NOTICE '⚠️ Template was not created (may not exist yet)';
      ELSE
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'template_fields') THEN
          SELECT COUNT(*) INTO field_count
          FROM public.template_fields tf
          JOIN public.task_templates tt ON tf.template_id = tt.id
          WHERE tt.company_id IS NULL AND tt.slug = 'manual_handling_risk_assessment';
          
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

