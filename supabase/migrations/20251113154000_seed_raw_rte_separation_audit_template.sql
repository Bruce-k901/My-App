-- ============================================================================
-- Migration: Raw vs Ready-to-Eat Food Separation Audit Template
-- Description: Daily audit to prevent cross-contamination through proper storage separation
-- ============================================================================
-- Note: This migration will be skipped if required tables don't exist yet

DO $$
BEGIN
  -- Only proceed if required tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_templates')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'template_fields') THEN

    -- Clean up ALL existing templates with similar names/slugs (including relic templates)
    -- This removes old EHO import templates and any duplicates

    -- Remove template fields for all potential duplicates/relics
    DELETE FROM public.template_fields
    WHERE template_id IN (
      SELECT id FROM public.task_templates
      WHERE (
        -- Exact slug match
        (company_id IS NULL AND slug = 'raw_rte_separation_audit')
        -- Or old EHO import slugs
        OR slug = 'separate-raw-and-ready-to-eat-foods-7'
        OR slug LIKE '%separate%raw%ready%'
        OR slug LIKE '%raw%rte%'
        -- Or similar names (case insensitive)
        OR (name ILIKE '%raw%ready%to%eat%' AND slug != 'raw_rte_separation_audit')
        OR (name ILIKE '%separation%raw%' AND slug != 'raw_rte_separation_audit')
      )
    );

    -- Remove repeatable labels
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'template_repeatable_labels') THEN
      DELETE FROM public.template_repeatable_labels
      WHERE template_id IN (
        SELECT id FROM public.task_templates
        WHERE (
          (company_id IS NULL AND slug = 'raw_rte_separation_audit')
          OR slug = 'separate-raw-and-ready-to-eat-foods-7'
          OR slug LIKE '%separate%raw%ready%'
          OR slug LIKE '%raw%rte%'
          OR (name ILIKE '%raw%ready%to%eat%' AND slug != 'raw_rte_separation_audit')
          OR (name ILIKE '%separation%raw%' AND slug != 'raw_rte_separation_audit')
        )
      );
    END IF;

    -- Remove the templates themselves (including the correct one if it exists, so we can recreate it properly)
    DELETE FROM public.task_templates
    WHERE (
      (company_id IS NULL AND slug = 'raw_rte_separation_audit')
      OR slug = 'separate-raw-and-ready-to-eat-foods-7'
      OR slug LIKE '%separate%raw%ready%'
      OR slug LIKE '%raw%rte%'
      OR (name ILIKE '%raw%ready%to%eat%' AND slug != 'raw_rte_separation_audit')
      OR (name ILIKE '%separation%raw%' AND slug != 'raw_rte_separation_audit')
    );

    -- Create the template (always create, even if it was just deleted above)
    INSERT INTO public.task_templates (
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
  asset_type,
  requires_sop,
  triggers_contractor_on_failure,
  contractor_type
) VALUES (
  NULL, -- Global template available to all companies
  'Separation Audit: Raw vs Ready-to-Eat Foods',
  'raw_rte_separation_audit',
  'Daily audit to verify proper separation between raw and ready-to-eat foods in all storage areas. Prevents cross-contamination through correct storage organization, color-coding, and physical barriers.',
  'food_safety',
  'food_safety',
  'daily',
  '07:00',
  ARRAY['before_open'],
  jsonb_build_object(
    'daypart_times', jsonb_build_object('before_open', '07:00'),
    'default_checklist_items', jsonb_build_array(
      'Raw meats stored BELOW cooked/ready-to-eat items',
      'Drip trays present under raw meat storage',
      'Color-coded containers used correctly',
      'Dedicated utensils for raw vs ready-to-eat',
      'Physical barriers between zones where needed'
    )
  ),
  'kitchen_manager',
  'Food Safety Act 1990, Food Hygiene Regulations, HACCP',
  TRUE, -- Critical compliance task (high cross-contamination risk)
  TRUE, -- Library template
  TRUE, -- Active
  ARRAY['yes_no_checklist', 'photo'], -- Yes/No checklist with photo evidence
  'Conduct a systematic audit of storage areas to ensure proper separation between raw and ready-to-eat foods. Check storage organization, verify correct stacking order (raw below RTE), confirm color-coding systems, and inspect for physical barriers. Document any failures with before/after photos. Critical issues require immediate reorganization and re-check within 2 hours.',
  NULL, -- NO asset selection (repeatable_field_name = NULL)
  NULL, -- NO asset type filter
  TRUE, -- Requires SOP link
  FALSE, -- Does not trigger contractor (internal corrective action)
  NULL
);

-- ============================================================================
-- Template Fields (Yes/No Checklist Items)
-- ============================================================================

    -- Audit Information
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT id, 'audit_date', 'date', 'Audit Date', TRUE, 1,
      'Date when the separation audit was completed.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'raw_rte_separation_audit';

    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
    SELECT id, 'auditor_name', 'text', 'Auditor Name', TRUE, 2,
      'Name of the person conducting the separation audit.',
      'e.g., John Smith'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'raw_rte_separation_audit';

    -- Storage Location Selection
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, options)
    SELECT id, 'storage_location', 'select', 'Storage Location', TRUE, 3,
      'Select the storage area being audited.',
      jsonb_build_array(
        jsonb_build_object('value', 'walk_in_refrigerator', 'label', 'Walk-in Refrigerator'),
        jsonb_build_object('value', 'prep_line_refrigerator', 'label', 'Prep Line Refrigerator'),
        jsonb_build_object('value', 'sandwich_deli_counter', 'label', 'Sandwich/Deli Counter'),
        jsonb_build_object('value', 'display_refrigerator', 'label', 'Display Refrigerator'),
        jsonb_build_object('value', 'freezer_storage', 'label', 'Freezer Storage'),
        jsonb_build_object('value', 'other', 'label', 'Other Storage Area')
      )
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'raw_rte_separation_audit';

    -- Refrigerator Asset Selection (for tracking specific units)
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
    SELECT id, 'refrigerator_unit', 'text', 'Refrigerator Unit ID/Name', FALSE, 4,
      'Enter the specific refrigerator unit identifier or name for asset tracking.',
      'e.g., Walk-in Chiller #1, Prep Fridge A, Display Fridge Main'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'raw_rte_separation_audit';

    -- Overall Assessment (Pass/Fail for overall compliance)
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT id, 'overall_separation_compliant', 'pass_fail', 'Overall Separation Compliance', TRUE, 5,
      'Pass: All separation criteria met. Fail: One or more failures found requiring corrective action. Failures will trigger monitor/callout workflow.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'raw_rte_separation_audit';

-- Note: Yes/No checklist items come from default_checklist_items in recurrence_pattern above
-- They will appear as yes/no questions in the task completion modal

    -- Severity Assessment (if failure)
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, options)
    SELECT id, 'severity_level', 'select', 'Severity Level (if failure)', FALSE, 6,
      'Select the severity level if any failures were found.',
      jsonb_build_array(
        jsonb_build_object('value', 'minor', 'label', 'Minor: Incorrect container color'),
        jsonb_build_object('value', 'major', 'label', 'Major: Raw above ready-to-eat in same unit'),
        jsonb_build_object('value', 'critical', 'label', 'Critical: Direct contact between raw and ready-to-eat')
      )
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'raw_rte_separation_audit';

    -- Immediate Actions
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
    SELECT id, 'immediate_actions', 'text', 'Immediate Corrective Actions Taken', FALSE, 7,
      'Document all immediate actions taken to resolve separation issues (e.g., reorganization, staff briefing).',
      'e.g., Reorganized walk-in fridge - moved raw chicken to bottom shelf, separated from ready-to-eat salads. Briefed prep team on correct storage procedures.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'raw_rte_separation_audit';

    -- Re-check Required
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT id, 'recheck_required', 'pass_fail', 'Re-check Required (Critical Issues)', FALSE, 8,
      'YES: Re-check completed within 2 hours for critical issues. NO: Re-check still pending.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'raw_rte_separation_audit';

    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
    SELECT id, 'recheck_time', 'text', 'Re-check Time (if required)', FALSE, 9,
      'Enter the time when re-check was completed (for critical issues).',
      'e.g., 09:30'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'raw_rte_separation_audit';

    -- Escalation
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT id, 'manager_notified', 'pass_fail', 'Kitchen Manager Notified (Major/Critical)', FALSE, 10,
      'YES: Kitchen manager has been notified of major or critical issues. NO: Notification pending or not required.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'raw_rte_separation_audit';

    -- Staff Retraining
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT id, 'retraining_required', 'pass_fail', 'Staff Retraining Required', FALSE, 11,
      'YES: Staff retraining has been scheduled or completed. NO: Retraining not required or pending.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'raw_rte_separation_audit';

    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
    SELECT id, 'retraining_details', 'text', 'Retraining Details', FALSE, 12,
      'Document retraining actions taken or scheduled.',
      'e.g., Briefed all prep staff on separation procedures. Scheduled formal training session for Friday.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'raw_rte_separation_audit';

    -- Notes
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
    SELECT id, 'audit_notes', 'text', 'Additional Notes', FALSE, 13,
      'Any additional observations or notes from the audit.',
      'e.g., Overall good compliance. Minor color-coding issue addressed immediately.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'raw_rte_separation_audit';

    -- Photo Evidence (Required for each storage area)
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT id, 'before_photos', 'photo', 'Before Photos (if failure)', FALSE, 14,
      'Upload photos showing the separation issues found (mandatory for failures).'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'raw_rte_separation_audit';

    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT id, 'after_photos', 'photo', 'After Photos (corrective action)', FALSE, 15,
      'Upload photos showing the corrected storage organization (mandatory for failures).'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'raw_rte_separation_audit';

    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT id, 'compliance_photos', 'photo', 'Compliance Photos (if passing)', FALSE, 16,
      'Upload photos showing correct separation and storage organization (good practice documentation).'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'raw_rte_separation_audit';

    RAISE NOTICE 'Seeded raw_rte_separation_audit template';

  ELSE
    RAISE NOTICE '⚠️ Required tables (task_templates, template_fields) do not exist yet - skipping raw RTE separation template seed';
  END IF;
END $$;

