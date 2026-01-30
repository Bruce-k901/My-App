-- ============================================================================
-- Migration: Food Labelling & Dating Audit Template
-- Description: Comprehensive audit template for food labelling, dating, and stock rotation
-- ============================================================================
-- Note: This migration will be skipped if required tables don't exist yet

DO $$
BEGIN
  -- Only proceed if required tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_templates')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'template_fields') THEN

    -- Clean up existing template if it exists (by slug)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'template_repeatable_labels') THEN
      DELETE FROM public.template_repeatable_labels
      WHERE template_id IN (
        SELECT id FROM public.task_templates
        WHERE company_id IS NULL
          AND slug = 'food_labelling_dating_audit'
      );
    END IF;

    DELETE FROM public.template_fields
    WHERE template_id IN (
      SELECT id FROM public.task_templates
      WHERE company_id IS NULL
        AND slug = 'food_labelling_dating_audit'
    );

    DELETE FROM public.task_templates
    WHERE company_id IS NULL
      AND slug = 'food_labelling_dating_audit';

    -- Create the template
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
  triggers_contractor_on_failure,
  contractor_type
) VALUES (
  NULL, -- Global template available to all companies
  'Food Labelling & Dating Compliance Audit',
  'food_labelling_dating_audit',
  'Comprehensive audit of food labelling, dating, and stock rotation systems. Ensures labels never run out, correct usage, FIFO system working, no expired food, and no evidence of tampering or relabelling.',
  'food_safety',
  'food_safety',
  'weekly',
  'before_open',
  array['before_open'],
  jsonb_build_object(
    'days', ARRAY[1], -- Monday
    'daypart_times', jsonb_build_object('before_open', '07:00'),
    'default_checklist_items', jsonb_build_array(
      'Verify label supply adequate for all kitchen sections',
      'Check labels contain: food name, prep date, use-by date',
      'Confirm date format consistent (DD/MM/YYYY)',
      'Verify FIFO system followed in all storage',
      'Check no out-of-date food present',
      'Inspect for evidence of relabelling or date alteration',
      'Verify high-risk foods labelled correctly',
      'Check allergen information clearly marked where required'
    )
  ),
  'manager',
  'Food Safety Act 1990, Food Hygiene Regulations, HACCP',
  TRUE, -- Critical compliance task
  TRUE, -- Library template
  TRUE, -- Active
  ARRAY['text_note', 'pass_fail', 'photo'],
  'Conduct a systematic audit of food labelling, dating, and stock rotation. Check label stock levels, verify correct label usage, confirm FIFO rotation, identify any out-of-date items, and check for evidence of tampering. Document all findings and create follow-up tasks as needed.',
  NULL, -- Not a repeatable field task
  FALSE, -- Does not trigger contractor
  NULL
);

-- ============================================================================
-- Template Fields (Checklist Items)
-- ============================================================================

    -- Audit Information
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT id, 'audit_date', 'date', 'Audit Date', TRUE, 1,
      'Date when the food labelling and dating audit was completed.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'food_labelling_dating_audit';

    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
    SELECT id, 'auditor_name', 'text', 'Auditor Name', TRUE, 2,
      'Name of the person conducting the audit.',
      'e.g., John Smith'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'food_labelling_dating_audit';

    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, options)
    SELECT id, 'areas_covered', 'select', 'Areas Covered', TRUE, 3,
      'Select all areas audited during this inspection.',
      jsonb_build_array(
        jsonb_build_object('value', 'main_kitchen', 'label', 'Main Kitchen'),
        jsonb_build_object('value', 'prep_areas', 'label', 'Prep Areas'),
        jsonb_build_object('value', 'storage_areas', 'label', 'Storage Areas (Chilled/Frozen/Dry)'),
        jsonb_build_object('value', 'display_areas', 'label', 'Display Areas'),
        jsonb_build_object('value', 'all_areas', 'label', 'All Kitchen Areas')
      )
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'food_labelling_dating_audit';

    -- 1. Label Stock Management
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT id, 'label_stock_adequate', 'pass_fail', 'Label Stock Adequate', TRUE, 4,
      'Pass: Sufficient label supplies available in all kitchen sections. Fail: Labels running low or out of stock in any area.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'food_labelling_dating_audit';

    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
    SELECT id, 'label_stock_notes', 'text', 'Label Stock Notes', FALSE, 5,
      'Record any label supply issues, locations where stock is low, or restocking needs.',
      'e.g., Allergen labels running low in pastry section, need to order more by Friday.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'food_labelling_dating_audit';

    -- 2. Correct Usage - Labels Applied Properly
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT id, 'labels_contain_required_info', 'pass_fail', 'Labels Contain Required Info', TRUE, 6,
      'Pass: All labels include food name, prep date, and use-by date. Fail: Missing required information on any labels.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'food_labelling_dating_audit';

    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT id, 'date_format_consistent', 'pass_fail', 'Date Format Consistent (DD/MM/YYYY)', TRUE, 7,
      'Pass: All labels use consistent DD/MM/YYYY date format. Fail: Inconsistent or incorrect date formats found.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'food_labelling_dating_audit';

    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
    SELECT id, 'label_usage_issues', 'text', 'Label Usage Issues', FALSE, 8,
      'Document any instances of incorrect label usage, missing information, or format inconsistencies.',
      'e.g., Three containers missing prep dates, two labels using MM/DD/YYYY format instead of DD/MM/YYYY.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'food_labelling_dating_audit';

    -- 3. Stock Rotation - FIFO System
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT id, 'fifo_system_working', 'pass_fail', 'FIFO System Working Correctly', TRUE, 9,
      'Pass: FIFO (First In, First Out) rotation is being followed in all storage areas. Fail: Older stock found behind newer stock.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'food_labelling_dating_audit';

    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
    SELECT id, 'rotation_issues_found', 'text', 'Stock Rotation Issues', FALSE, 10,
      'Describe any FIFO violations or stock rotation problems identified.',
      'e.g., Older milk cartons found behind newer ones in walk-in fridge, older prepared salads behind new batch in prep fridge.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'food_labelling_dating_audit';

    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT id, 'high_risk_foods_rotated', 'pass_fail', 'High-Risk Foods Rotated Correctly', TRUE, 11,
      'Pass: High-risk foods (cooked meats, rice, dairy, prepared salads) are properly rotated. Fail: High-risk items not following FIFO.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'food_labelling_dating_audit';

    -- 4. Out-of-Date Management
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT id, 'no_out_of_date_food', 'pass_fail', 'No Out-of-Date Food Present', TRUE, 12,
      'Pass: No expired food found during audit. Fail: Out-of-date items discovered.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'food_labelling_dating_audit';

    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
    SELECT id, 'out_of_date_items_found', 'text', 'Out-of-Date Items Found', FALSE, 13,
      'List any expired items discovered, their locations, and disposal actions taken.',
      'e.g., Two prepared salads expired yesterday in prep fridge - removed and disposed of immediately.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'food_labelling_dating_audit';

    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT id, 'all_food_labelled', 'pass_fail', 'All Food Items Labelled', TRUE, 14,
      'Pass: Every food item checked has a proper label. Fail: Unlabelled items found.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'food_labelling_dating_audit';

    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
    SELECT id, 'unlabelled_items', 'text', 'Unlabelled Items', FALSE, 15,
      'List any unlabelled food items found and actions taken.',
      'e.g., Three containers in prep fridge missing labels - labelled immediately with correct dates.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'food_labelling_dating_audit';

    -- 5. Anti-Tampering - No Relabelling Evidence
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT id, 'no_tampering_evidence', 'pass_fail', 'No Evidence of Relabelling or Date Changing', TRUE, 16,
      'Pass: No signs of tampering, relabelling, or date alteration found. Fail: Evidence of tampering detected.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'food_labelling_dating_audit';

    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
    SELECT id, 'tampering_evidence', 'text', 'Tampering Evidence (if found)', FALSE, 17,
      'Document any evidence of relabelling, date alteration, or tampering discovered.',
      'e.g., Label appears to have been removed and replaced, date looks altered.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'food_labelling_dating_audit';

    -- 6. High-Risk Foods Labelling
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT id, 'high_risk_foods_labelled', 'pass_fail', 'High-Risk Foods Labelled Correctly', TRUE, 18,
      'Pass: All high-risk foods (cooked meats, rice, prepared salads, dairy) are correctly labelled. Fail: High-risk items missing proper labels.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'food_labelling_dating_audit';

    -- 7. Allergen Information
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT id, 'allergen_info_marked', 'pass_fail', 'Allergen Information Clearly Marked', TRUE, 19,
      'Pass: Allergen information is clearly marked on labels where required. Fail: Missing or unclear allergen information.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'food_labelling_dating_audit';

    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
    SELECT id, 'allergen_issues', 'text', 'Allergen Labelling Issues', FALSE, 20,
      'Document any allergen labelling problems or missing allergen information.',
      'e.g., Prepared sandwich missing allergen label, contains nuts but not marked.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'food_labelling_dating_audit';

    -- 8. Corrective Actions
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
    SELECT id, 'immediate_actions_taken', 'text', 'Immediate Corrective Actions Taken', TRUE, 21,
      'Record all immediate actions taken to resolve issues identified during the audit.',
      'e.g., Removed expired stock, restocked labels in prep area, relabelled unlabelled items, briefed team on FIFO procedures.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'food_labelling_dating_audit';

    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
    SELECT id, 'follow_up_actions_required', 'text', 'Follow-up Actions Required', FALSE, 22,
      'List any further actions, training, or system improvements needed to prevent recurrence of issues.',
      'e.g., Order additional label stock, schedule refresher training on labelling procedures for night shift, review FIFO training materials.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'food_labelling_dating_audit';

    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT id, 'follow_up_tasks_created', 'pass_fail', 'Follow-up Tasks Created', TRUE, 23,
      'Pass: Follow-up tasks have been created or assigned to address identified issues. Fail: Follow-up tasks still need to be created.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'food_labelling_dating_audit';

    -- 9. Overall Assessment
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT id, 'overall_compliance_met', 'pass_fail', 'Overall Compliance Met', TRUE, 24,
      'Pass: Labelling, dating, and stock rotation systems are compliant. Fail: Major compliance issues remain unresolved.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'food_labelling_dating_audit';

    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
    SELECT id, 'compliance_summary', 'text', 'Compliance Summary', TRUE, 25,
      'Provide a brief summary of audit findings, overall compliance status, and key areas for improvement.',
      'e.g., Good overall compliance with labelling and dating. Minor FIFO rotation issues identified and addressed immediately. All staff briefed on correct procedures.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'food_labelling_dating_audit';

    -- Photo evidence field for documentation
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT id, 'audit_photos', 'photo', 'Audit Photos', FALSE, 26,
      'Upload photos of any issues found, corrective actions taken, or examples of good practice.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'food_labelling_dating_audit';

    RAISE NOTICE 'Seeded food_labelling_dating_audit template';

  ELSE
    RAISE NOTICE '⚠️ Required tables (task_templates, template_fields) do not exist yet - skipping food labelling template seed';
  END IF;
END $$;

