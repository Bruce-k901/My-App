-- ============================================================================
-- Migration: 20250205000009_add_workplace_inspection_template.sql
-- Description: Comprehensive monthly health & safety workplace inspection
-- ============================================================================

-- Clean up existing template if it exists
DELETE FROM template_repeatable_labels 
WHERE template_id IN (SELECT id FROM task_templates WHERE slug = 'workplace_inspection');

DELETE FROM template_fields 
WHERE template_id IN (SELECT id FROM task_templates WHERE slug = 'workplace_inspection');

DELETE FROM task_templates 
WHERE slug = 'workplace_inspection';

-- Create comprehensive workplace inspection template
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
  'Monthly Health & Safety Workplace Inspection',
  'workplace_inspection',
  'Comprehensive safety walkthrough of all venue areas',
  'h_and_s',  -- FIXED: Changed from 'health_safety' to 'h_and_s' to match schema constraint
  'health_safety',  -- audit_category can be 'health_safety' for reporting
  'monthly',
  'before_open',
  ARRAY['before_open'],
  jsonb_build_object(
    'date_of_month', 1,
    'daypart_times', jsonb_build_object('before_open', '07:00'),
    'default_checklist_items', jsonb_build_array(
      '=== KITCHEN SAFETY ===',
      'Floors clean, dry and non-slip',
      'No trip hazards from cables or equipment',
      'Guarding on all slicing/dicing equipment',
      'Fire extinguishers accessible and charged',
      'No excessive grease buildup on extraction',
      'Electrical equipment PAT tested',
      'Knives stored safely when not in use',
      '=== FOOD SAFETY & HYGIENE ===',
      'Food storage areas clean and organized',
      'Temperature controls working (fridges/freezers)',
      'Pest control measures effective (no signs)',
      'Cleaning chemicals stored securely',
      'Handwashing facilities fully stocked',
      'Food separation practices followed',
      'Waste management areas clean',
      '=== FRONT OF HOUSE SAFETY ===',
      'Clear emergency exits and routes',
      'No broken furniture or fixtures',
      'Flooring in good condition (no tears/slips)',
      'Glassware handling procedures followed',
      'Customer area lighting adequate',
      'Spill kits accessible and stocked',
      '=== STAFF WELFARE ===',
      'Staff facilities clean and functional',
      'First aid kits fully stocked',
      'PPE available where required',
      'Manual handling equipment available',
      'Rest areas maintained and clean',
      'Drinking water available',
      '=== FIRE SAFETY ===',
      'Fire exits clear and unobstructed',
      'Emergency lighting functional',
      'Fire alarm test records up to date',
      'Evacuation procedures displayed',
      'Assembly points clearly marked'
    ),
    -- Add visibility windows for monthly tasks (default: 7 days before, 7 days after)
    'visibility_window_days_before', 7,
    'visibility_window_days_after', 7,
    'grace_period_days', 3  -- Becomes overdue after 3 days past due
  ),
  'manager',
  'Health and Safety at Work Act 1974',
  TRUE,
  TRUE,
  ARRAY['text_note', 'pass_fail', 'photo'],  -- Checklist + Pass/Fail + Photos
  'Purpose:
Identify and address health and safety hazards throughout the workplace to prevent accidents and ensure legal compliance.

Importance:
Proactive hazard identification is a legal requirement under the Health and Safety at Work Act 1974. Regular inspections prevent accidents, protect staff and customers, and demonstrate due diligence.

Method:
1. Conduct systematic walkthrough of all areas (kitchen, storage, front of house, staff areas)
2. Use the comprehensive checklist to assess each safety category
3. Take photos of any hazards found
4. Document findings and assign corrective actions
5. Follow up on critical issues immediately

Special Requirements:
- Address critical hazards immediately (blocked exits, electrical hazards, etc.)
- Assign responsibility and deadlines for corrective actions
- Escalate serious issues to senior management
- Maintain inspection records for insurance and regulatory compliance',
  NULL,  -- No asset selection
  TRUE,  -- Trigger contractor for serious safety issues
  'safety_consultant',
  TRUE,
  FALSE,  -- No SOP upload required
  FALSE   -- No risk assessment upload required
);

-- Add template fields
INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT id, 'inspection_date', 'date', 'Inspection Date', TRUE, 1, 
  'Date when the workplace inspection was conducted.'
FROM task_templates WHERE slug = 'workplace_inspection';

INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT id, 'inspected_by', 'text', 'Inspected By', TRUE, 2,
  'Name of the manager conducting the inspection.'
FROM task_templates WHERE slug = 'workplace_inspection';

-- FIXED: Select field with options in JSONB
INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text, options)
SELECT id, 'venue_area', 'select', 'Venue Area', TRUE, 3,
  'Primary area being inspected (rotate through all areas monthly).',
  jsonb_build_array(
    jsonb_build_object('value', 'Main Kitchen & Storage', 'label', 'Main Kitchen & Storage'),
    jsonb_build_object('value', 'Front of House & Bar', 'label', 'Front of House & Bar'),
    jsonb_build_object('value', 'Staff & Admin Areas', 'label', 'Staff & Admin Areas'),
    jsonb_build_object('value', 'External & Delivery Areas', 'label', 'External & Delivery Areas'),
    jsonb_build_object('value', 'Full Venue Inspection', 'label', 'Full Venue Inspection')
  )
FROM task_templates WHERE slug = 'workplace_inspection';

-- Category Assessments
INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT id, 'kitchen_safety_ok', 'pass_fail', 'Kitchen Safety - All Satisfactory', TRUE, 10,
  'PASS if all kitchen safety items are satisfactory. FAIL if any critical kitchen hazards found.'
FROM task_templates WHERE slug = 'workplace_inspection';

INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT id, 'food_safety_ok', 'pass_fail', 'Food Safety & Hygiene - All Satisfactory', TRUE, 11,
  'PASS if all food safety items are satisfactory. FAIL if any hygiene hazards found.'
FROM task_templates WHERE slug = 'workplace_inspection';

INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT id, 'front_of_house_ok', 'pass_fail', 'Front of House Safety - All Satisfactory', TRUE, 12,
  'PASS if all front of house safety items are satisfactory. FAIL if any customer area hazards found.'
FROM task_templates WHERE slug = 'workplace_inspection';

INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT id, 'staff_welfare_ok', 'pass_fail', 'Staff Welfare - All Satisfactory', TRUE, 13,
  'PASS if all staff welfare items are satisfactory. FAIL if any staff facility issues found.'
FROM task_templates WHERE slug = 'workplace_inspection';

INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT id, 'fire_safety_ok', 'pass_fail', 'Fire Safety - All Satisfactory', TRUE, 14,
  'PASS if all fire safety items are satisfactory. FAIL if any fire safety issues found.'
FROM task_templates WHERE slug = 'workplace_inspection';

-- Overall Assessment
INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT id, 'overall_safety_ok', 'pass_fail', 'Overall Workplace Safety Assessment', TRUE, 20,
  'PASS if workplace meets all health and safety standards. FAIL if critical safety issues found - will trigger safety consultant callout.'
FROM task_templates WHERE slug = 'workplace_inspection';

-- Hazard Documentation
INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
SELECT id, 'hazards_found', 'text', 'Hazards Identified', FALSE, 21,
  'List any safety hazards found during inspection. Be specific about location and risk.',
  'e.g., Wet floor near dishwash area, blocked fire exit in storage, damaged electrical cable in kitchen...'
FROM task_templates WHERE slug = 'workplace_inspection';

INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
SELECT id, 'corrective_actions', 'text', 'Corrective Actions Taken', FALSE, 22,
  'Record immediate actions taken and any follow-up required.',
  'e.g., Cleared blocked exit, arranged electrical repair, scheduled deep clean...'
FROM task_templates WHERE slug = 'workplace_inspection';

INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT id, 'next_inspection_focus', 'text', 'Next Inspection Focus Area', FALSE, 23,
  'Note any areas that need special attention in the next inspection.'
FROM task_templates WHERE slug = 'workplace_inspection';

-- Verification
DO $$
DECLARE
  template_record RECORD;
  field_count INTEGER;
BEGIN
  SELECT * INTO template_record
  FROM task_templates 
  WHERE slug = 'workplace_inspection';
  
  SELECT COUNT(*) INTO field_count
  FROM template_fields
  WHERE template_id = template_record.id;
  
  IF template_record.id IS NOT NULL THEN
    RAISE NOTICE '✅ Workplace Inspection template created successfully';
    RAISE NOTICE '   Template ID: %', template_record.id;
    RAISE NOTICE '   Category: %', template_record.category;
    RAISE NOTICE '   Evidence types: %', template_record.evidence_types;
    RAISE NOTICE '   Triggers contractor: %', template_record.triggers_contractor_on_failure;
    RAISE NOTICE '   Contractor type: %', template_record.contractor_type;
    RAISE NOTICE '   Template fields: %', field_count;
    RAISE NOTICE '   ✓ Features: Comprehensive checklist (35 items) + Category assessments + Photos';
    RAISE NOTICE '   ✓ Safety categories: Kitchen, Food, Front of House, Staff Welfare, Fire Safety';
    
    -- Check visibility windows
    IF template_record.recurrence_pattern IS NOT NULL AND 
       template_record.recurrence_pattern ? 'visibility_window_days_before' THEN
      RAISE NOTICE '   ✓ Visibility window: % days before, % days after',
        template_record.recurrence_pattern->>'visibility_window_days_before',
        template_record.recurrence_pattern->>'visibility_window_days_after';
      RAISE NOTICE '   ✓ Grace period: % days',
        template_record.recurrence_pattern->>'grace_period_days';
    END IF;
    
    -- Check default checklist items count
    IF template_record.recurrence_pattern IS NOT NULL AND 
       template_record.recurrence_pattern ? 'default_checklist_items' THEN
      RAISE NOTICE '   ✓ Default checklist items: %',
        jsonb_array_length(template_record.recurrence_pattern->'default_checklist_items');
    END IF;
  ELSE
    RAISE WARNING '⚠️ Template creation may have failed. Template not found.';
  END IF;
END $$;

