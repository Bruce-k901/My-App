-- ============================================================================
-- Migration: 20250207000004_add_food_labelling_audit_template.sql
-- Description: Comprehensive food labelling, dating and stock rotation audit
-- ============================================================================

-- Clean up existing template if it exists
DELETE FROM template_repeatable_labels 
WHERE template_id IN (SELECT id FROM task_templates WHERE slug = 'food_labelling_audit');

DELETE FROM template_fields 
WHERE template_id IN (SELECT id FROM task_templates WHERE slug = 'food_labelling_audit');

DELETE FROM task_templates 
WHERE slug = 'food_labelling_audit';

-- Create comprehensive food labelling audit template
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
  'Food Labelling & Dating Compliance Audit',
  'food_labelling_audit',
  'Comprehensive audit of food labelling, dating and stock rotation systems',
  'food_safety',
  'food_safety',
  'weekly',
  'before_open',
  ARRAY['before_open'],
  jsonb_build_object(
    'days', ARRAY[1],  -- Monday
    'daypart_times', jsonb_build_object('before_open', '07:00'),
    'default_checklist_items', jsonb_build_array(
      '🏷️ LABEL STOCK & AVAILABILITY',
      'Check date label supply in main kitchen',
      'Verify label stock in pastry/prep sections',
      'Confirm allergen labels available if used',
      'Check colour-coded labels available (if used)',
      '📝 LABEL CONTENT & FORMAT COMPLIANCE',
      'Verify labels show food name clearly',
      'Check preparation date included (DD/MM/YYYY)',
      'Confirm use-by date clearly marked',
      'Verify high-risk foods have correct shelf life',
      'Check allergen information included if required',
      '🔄 STOCK ROTATION & FIFO SYSTEM',
      'Verify FIFO system followed in fridge storage',
      'Check dry goods storage rotation correct',
      'Confirm frozen goods rotated properly',
      'Verify ready-to-eat foods correctly sequenced',
      'Check delivery day stocks rotated to front',
      '📅 DATE COMPLIANCE & OUT-OF-DATE CHECK',
      'Check all refrigerated foods within date',
      'Verify dry goods within best-before dates',
      'Confirm frozen goods within safe storage period',
      'Check prepared foods within safe shelf life',
      'Verify no out-of-date food present anywhere',
      '🚫 ANTI-TAMPERING & FOOD DEFENCE',
      'Check for evidence of label alteration',
      'Verify no date rewriting or correction fluid',
      'Confirm labels securely attached (not loose)',
      'Check no unauthorised date extensions',
      'Verify no food without labels present',
      '📊 HIGH-RISK FOOD FOCUS AREAS',
      'Check high-risk protein labelling (chicken, fish etc)',
      'Verify cooked rice/pasta labelled with short dates',
      'Confirm dairy products correctly dated',
      'Check prepared salads/sandwiches within safe life',
      'Verify vacuum-packed foods correctly dated'
    )
  ),
  'manager',
  'Food Safety Act 1990, Food Hygiene Regulations',
  TRUE,
  TRUE,
  ARRAY['text_note', 'pass_fail'],
  '🏷️ COMPREHENSIVE FOOD LABELLING AUDIT GUIDE

This audit ensures your food labelling, dating and stock rotation systems maintain full food safety compliance.

🎯 CRITICAL REQUIREMENTS:

1. **LABEL CONTENT (MUST INCLUDE):**
   - Food name/description
   - Preparation date (DD/MM/YYYY)
   - Use-by date (based on safe shelf life)
   - Allergen information if applicable

2. **SAFE SHELF LIFE GUIDELINES:**
   - High-risk foods: 1-3 days refrigerated
   - Cooked rice/pasta: Max 24 hours refrigerated
   - Prepared salads: 1-2 days
   - Raw meat/fish: Follow supplier guidance
   - Dry goods: Follow best-before dates

3. **STOCK ROTATION PRINCIPLES:**
   - FIFO (First In, First Out) mandatory
   - New deliveries placed behind existing stock
   - Regular checks of all storage areas
   - Immediate removal of out-of-date items

AUDIT METHODOLOGY:

1. SYSTEMATIC CHECK - Work through all storage areas methodically
2. RANDOM SAMPLING - Check multiple items in each category
3. DOCUMENT FINDINGS - Record both compliant and non-compliant items
4. IMMEDIATE ACTION - Remove any out-of-date food immediately
5. ROOT CAUSE - Identify why issues occurred (training, system, supervision)

COMMON COMPLIANCE FAILURES:

- Missing preparation dates
- Incorrect date format (MM/DD instead of DD/MM)
- Extended shelf life beyond safe limits
- Poor stock rotation leading to waste
- Evidence of date alteration or relabelling
- Inadequate label supplies causing non-compliance

CORRECTIVE ACTIONS:

- Immediate: Remove out-of-date food, restock labels
- Short-term: Retrain staff on labelling procedures
- Long-term: Review shelf life policies, improve stock systems

Remember: Proper labelling is your first line of defence in food safety.',
  NULL,
  FALSE,
  NULL,
  TRUE,
  FALSE,
  FALSE
);

-- ============================================================================
-- AUDIT BASIC INFORMATION
-- ============================================================================

INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT id, 'audit_date', 'date', 'Audit Date', TRUE, 1, 
  'Date when the food labelling audit was conducted.'
FROM task_templates WHERE slug = 'food_labelling_audit';

INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT id, 'auditor_name', 'text', 'Auditor Name', TRUE, 2,
  'Name of person conducting the audit.'
FROM task_templates WHERE slug = 'food_labelling_audit';

INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text, options)
SELECT id, 'areas_audited', 'select', 'Areas Audited', TRUE, 3,
  'Select which kitchen/storage areas were included in this audit.',
  jsonb_build_array(
    jsonb_build_object('value', 'main_kitchen', 'label', 'Main Kitchen Only'),
    jsonb_build_object('value', 'all_kitchen_areas', 'label', 'All Kitchen Areas'),
    jsonb_build_object('value', 'full_venue', 'label', 'Full Venue (Kitchen + Storage)'),
    jsonb_build_object('value', 'specific_section', 'label', 'Specific Section Focus')
  )
FROM task_templates WHERE slug = 'food_labelling_audit';

-- ============================================================================
-- LABEL STOCK & AVAILABILITY ASSESSMENT
-- ============================================================================

INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT id, 'label_stock_adequate', 'pass_fail', 'Label Stock Adequate', TRUE, 10,
  'PASS if sufficient date labels available in all kitchen sections. FAIL if any areas running low or out of labels.'
FROM task_templates WHERE slug = 'food_labelling_audit';

INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
SELECT id, 'label_stock_notes', 'text', 'Label Stock Notes', FALSE, 11,
  'Note any label supply issues or restocking requirements.',
  'e.g., "Date labels running low in pastry section, allergen labels need reordering, main kitchen stock adequate..."'
FROM task_templates WHERE slug = 'food_labelling_audit';

-- ============================================================================
-- LABEL CONTENT & FORMAT COMPLIANCE
-- ============================================================================

INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT id, 'label_content_correct', 'pass_fail', 'Label Content Correct', TRUE, 20,
  'PASS if all labels contain required information (food name, prep date, use-by date). FAIL if any labels missing required information.'
FROM task_templates WHERE slug = 'food_labelling_audit';

INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT id, 'date_format_consistent', 'pass_fail', 'Date Format Consistent', TRUE, 21,
  'PASS if all dates use consistent DD/MM/YYYY format. FAIL if mixed date formats or incorrect dating.'
FROM task_templates WHERE slug = 'food_labelling_audit';

INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT id, 'shelf_life_appropriate', 'pass_fail', 'Shelf Life Appropriate', TRUE, 22,
  'PASS if all use-by dates reflect safe shelf life for food type. FAIL if any dates extended beyond safe limits.'
FROM task_templates WHERE slug = 'food_labelling_audit';

-- ============================================================================
-- STOCK ROTATION & FIFO COMPLIANCE
-- ============================================================================

INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT id, 'fifo_system_working', 'pass_fail', 'FIFO System Working', TRUE, 30,
  'PASS if stock rotation system working correctly in all storage areas. FAIL if older stock found behind new deliveries.'
FROM task_templates WHERE slug = 'food_labelling_audit';

INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
SELECT id, 'rotation_issues_found', 'text', 'Stock Rotation Issues', FALSE, 31,
  'Describe any stock rotation problems found.',
  'e.g., "Older chicken found behind new delivery in fridge, dry goods not rotated in storage room, frozen peas older stock at front..."'
FROM task_templates WHERE slug = 'food_labelling_audit';

-- ============================================================================
-- DATE COMPLIANCE & OUT-OF-DATE MANAGEMENT
-- ============================================================================

INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT id, 'no_out_of_date_food', 'pass_fail', 'No Out-of-Date Food Present', TRUE, 40,
  'PASS if no out-of-date food found during audit. FAIL if any expired food discovered.'
FROM task_templates WHERE slug = 'food_labelling_audit';

INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
SELECT id, 'out_of_date_items', 'text', 'Out-of-Date Items Found', FALSE, 41,
  'List any out-of-date food items discovered and immediate actions taken.',
  'e.g., "2x prepared salads expired yesterday - disposed, 1x chicken stock 2 days over - discarded, no other out-of-date items found"'
FROM task_templates WHERE slug = 'food_labelling_audit';

-- ============================================================================
-- ANTI-TAMPERING & FOOD DEFENCE
-- ============================================================================

INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT id, 'no_tampering_evidence', 'pass_fail', 'No Evidence of Tampering', TRUE, 50,
  'PASS if no evidence of label alteration, date rewriting or unauthorised date extensions. FAIL if any tampering suspected.'
FROM task_templates WHERE slug = 'food_labelling_audit';

INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT id, 'all_food_labelled', 'pass_fail', 'All Food Correctly Labelled', TRUE, 51,
  'PASS if all food items in storage have appropriate labels. FAIL if any unlabelled food found.'
FROM task_templates WHERE slug = 'food_labelling_audit';

-- ============================================================================
-- CORRECTIVE ACTIONS & FOLLOW-UP
-- ============================================================================

INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
SELECT id, 'immediate_actions_taken', 'text', 'Immediate Corrective Actions', TRUE, 60,
  'List immediate actions taken to address any issues found.',
  'e.g., "Disposed of out-of-date salads, restocked label supplies, retrained junior staff on dating procedures, reorganised fridge storage..."'
FROM task_templates WHERE slug = 'food_labelling_audit';

INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
SELECT id, 'follow_up_actions_required', 'text', 'Follow-up Actions Required', FALSE, 61,
  'List any ongoing actions or monitoring required.',
  'e.g., "Monitor pastry section label usage, follow-up training scheduled, review shelf life policy for high-risk items..."'
FROM task_templates WHERE slug = 'food_labelling_audit';

INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT id, 'generate_follow_up_tasks', 'pass_fail', 'Generate Follow-up Tasks', TRUE, 62,
  'YES to automatically create follow-up tasks for corrective actions and training requirements.'
FROM task_templates WHERE slug = 'food_labelling_audit';

INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
SELECT id, 'failure_notes', 'text', 'Failure Notes', FALSE, 63,
  'If any checks fail, record what was found, immediate containment, and who was notified. Required when marking FAIL.',
  'Explain why the check failed and the corrective action taken...'
FROM task_templates WHERE slug = 'food_labelling_audit';

-- ============================================================================
-- OVERALL COMPLIANCE ASSESSMENT
-- ============================================================================

INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT id, 'overall_compliance_met', 'pass_fail', 'Overall Labelling Compliance Met', TRUE, 70,
  'PASS if all labelling, dating and stock rotation systems compliant. FAIL if any critical food safety issues identified.'
FROM task_templates WHERE slug = 'food_labelling_audit';

INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
SELECT id, 'compliance_summary', 'text', 'Compliance Summary', TRUE, 71,
  'Brief summary of audit findings and overall compliance status.',
  'e.g., "Good overall compliance. Minor stock rotation issues addressed. Label supplies adequate. No out-of-date food present. Staff training effective."'
FROM task_templates WHERE slug = 'food_labelling_audit';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  template_record RECORD;
  field_count INTEGER;
BEGIN
  SELECT * INTO template_record
  FROM task_templates 
  WHERE slug = 'food_labelling_audit';
  
  SELECT COUNT(*) INTO field_count
  FROM template_fields
  WHERE template_id = template_record.id;
  
  IF template_record.id IS NOT NULL THEN
    RAISE NOTICE 'Food Labelling Audit template created successfully';
    RAISE NOTICE '   Template ID: %', template_record.id;
    RAISE NOTICE '   Features: 35-point checklist + Stock monitoring + Anti-tampering checks';
    RAISE NOTICE '   Template fields: %', field_count;
    RAISE NOTICE '   - Label stock level monitoring';
    RAISE NOTICE '   - FIFO system verification';
    RAISE NOTICE '   - Out-of-date food detection';
    RAISE NOTICE '   - Anti-tampering safeguards';
    RAISE NOTICE '   - Corrective action tracking';
  ELSE
    RAISE WARNING 'Template creation may have failed. Template not found.';
  END IF;
END $$;
