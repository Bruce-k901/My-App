-- ============================================================================
-- Fix Raw vs RTE Separation Template - V2 (AGGRESSIVE CLEANUP)
-- Description: Removes ALL templates matching patterns and creates correct one
-- ============================================================================

begin;

-- Step 1: Find and remove ALL templates that could be relics
DO $$
DECLARE
  removed_count INTEGER := 0;
  template_ids UUID[];
  template_record RECORD;
BEGIN
  -- Find ALL templates that match ANY pattern (very aggressive)
  SELECT ARRAY_AGG(id) INTO template_ids
  FROM public.task_templates
  WHERE (
    -- Old EHO import slug
    slug = 'separate-raw-and-ready-to-eat-foods-7'
    -- Any slug with patterns
    OR slug LIKE '%separate%'
    OR slug LIKE '%raw%'
    OR slug LIKE '%rte%'
    OR slug LIKE '%separation%'
    OR slug LIKE '%ready%to%eat%'
    -- Any name with patterns (but be careful not to match unrelated templates)
    OR (name ILIKE '%raw%ready%to%eat%')
    OR (name ILIKE '%separation%raw%')
    OR (name ILIKE '%separate%raw%')
    OR (name ILIKE '%raw%vs%ready%')
    OR (name ILIKE '%raw%rte%')
    -- Basic descriptions (relic characteristic)
    OR (description ILIKE '%store raw meats below%')
  );
  
  -- Log what we found
  IF template_ids IS NOT NULL AND array_length(template_ids, 1) > 0 THEN
    RAISE NOTICE 'Found % potential relic template(s) to remove', array_length(template_ids, 1);
    
    -- Show what we're removing
    FOR template_record IN 
      SELECT id, name, slug, company_id 
      FROM public.task_templates 
      WHERE id = ANY(template_ids)
    LOOP
      RAISE NOTICE 'Removing: % (slug: %, company_id: %)', 
        template_record.name, 
        template_record.slug, 
        template_record.company_id;
    END LOOP;
    
    -- Remove template fields
    DELETE FROM public.template_fields WHERE template_id = ANY(template_ids);
    RAISE NOTICE 'Removed template fields';
    
    -- Remove repeatable labels
    DELETE FROM public.template_repeatable_labels WHERE template_id = ANY(template_ids);
    RAISE NOTICE 'Removed repeatable labels';
    
    -- Remove the templates
    DELETE FROM public.task_templates WHERE id = ANY(template_ids);
    GET DIAGNOSTICS removed_count = ROW_COUNT;
    RAISE NOTICE 'Removed % template(s)', removed_count;
  ELSE
    RAISE NOTICE 'No relic templates found';
  END IF;
END $$;

-- Step 2: Create the CORRECT template with proper structure
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
  repeatable_field_name,  -- NULL = no asset selection
  asset_type,
  requires_sop,
  triggers_contractor_on_failure,
  contractor_type
) VALUES (
  null, -- Global template
  'Separation Audit: Raw vs Ready-to-Eat Foods',
  'raw_rte_separation_audit',
  'Daily audit to verify proper separation between raw and ready-to-eat foods in all storage areas. Prevents cross-contamination through correct storage organization, color-coding, and physical barriers.',
  'food_safety',
  'food_safety',
  'daily',
  '07:00',
  array['before_open'],
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
  true,
  true,
  true,
  array['yes_no_checklist', 'photo'], -- Yes/No checklist + photos (NO assets)
  'Conduct a systematic audit of storage areas to ensure proper separation between raw and ready-to-eat foods. Check storage organization, verify correct stacking order (raw below RTE), confirm color-coding systems, and inspect for physical barriers. Document any failures with before/after photos. Critical issues require immediate reorganization and re-check within 2 hours.',
  null, -- NO asset selection (repeatable_field_name = NULL)
  null, -- NO asset type filter
  true, -- Requires SOP
  false, -- No contractor trigger
  null
);

-- Step 3: Add template fields (16 fields total)
INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT id, 'audit_date', 'date', 'Audit Date', true, 1,
  'Date when the separation audit was completed.'
FROM public.task_templates WHERE company_id IS NULL AND slug = 'raw_rte_separation_audit';

INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
SELECT id, 'auditor_name', 'text', 'Auditor Name', true, 2,
  'Name of the person conducting the separation audit.',
  'e.g., John Smith'
FROM public.task_templates WHERE company_id IS NULL AND slug = 'raw_rte_separation_audit';

INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, options)
SELECT id, 'storage_location', 'select', 'Storage Location', true, 3,
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

INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
SELECT id, 'refrigerator_unit', 'text', 'Refrigerator Unit ID/Name', false, 4,
  'Enter the specific refrigerator unit identifier or name for asset tracking.',
  'e.g., Walk-in Chiller #1, Prep Fridge A, Display Fridge Main'
FROM public.task_templates WHERE company_id IS NULL AND slug = 'raw_rte_separation_audit';

INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT id, 'overall_separation_compliant', 'pass_fail', 'Overall Separation Compliance', true, 5,
  'Pass: All separation criteria met. Fail: One or more failures found requiring corrective action. Failures will trigger monitor/callout workflow.'
FROM public.task_templates WHERE company_id IS NULL AND slug = 'raw_rte_separation_audit';

INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, options)
SELECT id, 'severity_level', 'select', 'Severity Level (if failure)', false, 6,
  'Select the severity level if any failures were found.',
  jsonb_build_array(
    jsonb_build_object('value', 'minor', 'label', 'Minor: Incorrect container color'),
    jsonb_build_object('value', 'major', 'label', 'Major: Raw above ready-to-eat in same unit'),
    jsonb_build_object('value', 'critical', 'label', 'Critical: Direct contact between raw and ready-to-eat')
  )
FROM public.task_templates WHERE company_id IS NULL AND slug = 'raw_rte_separation_audit';

INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
SELECT id, 'immediate_actions', 'text', 'Immediate Corrective Actions Taken', false, 7,
  'Document all immediate actions taken to resolve separation issues (e.g., reorganization, staff briefing).',
  'e.g., Reorganized walk-in fridge - moved raw chicken to bottom shelf, separated from ready-to-eat salads. Briefed prep team on correct storage procedures.'
FROM public.task_templates WHERE company_id IS NULL AND slug = 'raw_rte_separation_audit';

INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT id, 'recheck_required', 'pass_fail', 'Re-check Required (Critical Issues)', false, 8,
  'YES: Re-check completed within 2 hours for critical issues. NO: Re-check still pending.'
FROM public.task_templates WHERE company_id IS NULL AND slug = 'raw_rte_separation_audit';

INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
SELECT id, 'recheck_time', 'text', 'Re-check Time (if required)', false, 9,
  'Enter the time when re-check was completed (for critical issues).',
  'e.g., 09:30'
FROM public.task_templates WHERE company_id IS NULL AND slug = 'raw_rte_separation_audit';

INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT id, 'manager_notified', 'pass_fail', 'Kitchen Manager Notified (Major/Critical)', false, 10,
  'YES: Kitchen manager has been notified of major or critical issues. NO: Notification pending or not required.'
FROM public.task_templates WHERE company_id IS NULL AND slug = 'raw_rte_separation_audit';

INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT id, 'retraining_required', 'pass_fail', 'Staff Retraining Required', false, 11,
  'YES: Staff retraining has been scheduled or completed. NO: Retraining not required or pending.'
FROM public.task_templates WHERE company_id IS NULL AND slug = 'raw_rte_separation_audit';

INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
SELECT id, 'retraining_details', 'text', 'Retraining Details', false, 12,
  'Document retraining actions taken or scheduled.',
  'e.g., Briefed all prep staff on separation procedures. Scheduled formal training session for Friday.'
FROM public.task_templates WHERE company_id IS NULL AND slug = 'raw_rte_separation_audit';

INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
SELECT id, 'audit_notes', 'text', 'Additional Notes', false, 13,
  'Any additional observations or notes from the audit.',
  'e.g., Overall good compliance. Minor color-coding issue addressed immediately.'
FROM public.task_templates WHERE company_id IS NULL AND slug = 'raw_rte_separation_audit';

INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT id, 'before_photos', 'photo', 'Before Photos (if failure)', false, 14,
  'Upload photos showing the separation issues found (mandatory for failures).'
FROM public.task_templates WHERE company_id IS NULL AND slug = 'raw_rte_separation_audit';

INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT id, 'after_photos', 'photo', 'After Photos (corrective action)', false, 15,
  'Upload photos showing the corrected storage organization (mandatory for failures).'
FROM public.task_templates WHERE company_id IS NULL AND slug = 'raw_rte_separation_audit';

INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT id, 'compliance_photos', 'photo', 'Compliance Photos (if passing)', false, 16,
  'Upload photos showing correct separation and storage organization (good practice documentation).'
FROM public.task_templates WHERE company_id IS NULL AND slug = 'raw_rte_separation_audit';

-- Step 4: Verify template was created correctly
DO $$
DECLARE
  template_count INTEGER;
  field_count INTEGER;
  template_record RECORD;
BEGIN
  SELECT COUNT(*) INTO template_count
  FROM public.task_templates
  WHERE company_id IS NULL AND slug = 'raw_rte_separation_audit';
  
  IF template_count = 0 THEN
    RAISE EXCEPTION 'Template creation failed!';
  END IF;
  
  -- Get template details
  SELECT * INTO template_record
  FROM public.task_templates
  WHERE company_id IS NULL AND slug = 'raw_rte_separation_audit';
  
  -- Count fields
  SELECT COUNT(*) INTO field_count
  FROM public.template_fields
  WHERE template_id = template_record.id;
  
  -- Verify structure
  IF template_record.repeatable_field_name IS NOT NULL THEN
    RAISE WARNING 'Template has repeatable_field_name set to: %. This will enable asset selection. Setting to NULL.', template_record.repeatable_field_name;
    UPDATE public.task_templates
    SET repeatable_field_name = NULL, asset_type = NULL
    WHERE id = template_record.id;
  END IF;
  
  IF NOT ('yes_no_checklist' = ANY(template_record.evidence_types)) THEN
    RAISE WARNING 'Template missing yes_no_checklist in evidence_types. Current: %', template_record.evidence_types;
  END IF;
  
  RAISE NOTICE '✅ Template verified:';
  RAISE NOTICE '   Name: %', template_record.name;
  RAISE NOTICE '   Slug: %', template_record.slug;
  RAISE NOTICE '   Evidence Types: %', template_record.evidence_types;
  RAISE NOTICE '   Repeatable Field: %', template_record.repeatable_field_name;
  RAISE NOTICE '   Asset Type: %', template_record.asset_type;
  RAISE NOTICE '   Fields: %', field_count;
  RAISE NOTICE '   Active: %', template_record.is_active;
  RAISE NOTICE '   Library: %', template_record.is_template_library;
END $$;

commit;

