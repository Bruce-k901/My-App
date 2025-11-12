-- ============================================================================
-- Migration: 20250205000015_add_food_poisoning_investigation_template.sql
-- Description: Comprehensive food poisoning incident management system
-- ============================================================================

-- Clean up existing template if it exists
DELETE FROM template_repeatable_labels 
WHERE template_id IN (SELECT id FROM task_templates WHERE slug = 'food_poisoning_investigation');

DELETE FROM template_fields 
WHERE template_id IN (SELECT id FROM task_templates WHERE slug = 'food_poisoning_investigation');

DELETE FROM task_templates 
WHERE slug = 'food_poisoning_investigation';

-- Create comprehensive food poisoning investigation template
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
  'Food Poisoning Incident Investigation',
  'food_poisoning_investigation',
  'Complete investigation and management of suspected food poisoning incidents',
  'food_safety',
  'food_safety',
  'triggered',
  'anytime',
  ARRAY['anytime'],
  jsonb_build_object(
    'default_checklist_items', jsonb_build_array(
      '🚨 PHASE 1: IMMEDIATE ACTIONS (First 2 Hours)',
      'Secure and isolate suspected food items',
      'Preserve samples for potential testing',
      'Document all affected persons details',
      'Review temperature logs for relevant items',
      'Notify management team immediately',
      '📋 PHASE 2: INITIAL ASSESSMENT (First 4 Hours)',
      'Assess if environmental health notification required',
      'Complete initial incident facts documentation',
      'Identify all potentially affected menu items',
      'Check staff health and fitness for work',
      'Secure CCTV and relevant documentation',
      '🔍 PHASE 3: INVESTIGATION (First 24 Hours)',
      'Complete detailed symptom pattern analysis',
      'Reconstruct food preparation timeline',
      'Interview relevant kitchen and service staff',
      'Review supplier delivery records and quality',
      'Document cleaning and hygiene procedures followed',
      '💬 PHASE 4: CUSTOMER MANAGEMENT (First 48 Hours)',
      'Send initial customer response',
      'Document all customer communications',
      'Prepare compensation strategy if appropriate',
      'Monitor social media and review platforms',
      'Update management on investigation progress',
      '🔄 PHASE 5: BUSINESS RECOVERY (Week 1)',
      'Review and update relevant procedures',
      'Conduct staff retraining if required',
      'Complete supplier review and follow-up',
      'Document lessons learned and improvements',
      'Close incident with final report'
    ),
    'auto_generate_tasks', jsonb_build_array(
      'immediate_response',
      'eho_notification',
      'customer_communication', 
      'procedure_review',
      'staff_briefing'
    )
  ),
  'manager',
  'Food Safety Act 1990, Food Hygiene Regulations',
  TRUE,
  TRUE,
  ARRAY['text_note', 'photo', 'pass_fail'],
  '🍽️ FOOD POISONING INCIDENT MANAGEMENT GUIDE

🚨 IMMEDIATE ACTIONS (First 2 Hours):

1. **PRESERVE EVIDENCE**
   • Isolate suspected food items - DO NOT DISPOSE
   • Label clearly: "DO NOT USE - UNDER INVESTIGATION"
   • Refrigerate samples if possible
   • Take photos of items, packaging, storage conditions

2. **DOCUMENT AFFECTED PERSONS**
   • Name, contact details, symptoms, onset time
   • What they ate, when they ate it
   • Any pre-existing medical conditions
   • Other people who ate same items (unaffected)

3. **INTERNAL NOTIFICATION**
   • Notify manager and designated food safety officer
   • Review temperature logs for relevant items
   • Check staff health records and fitness for work

📞 WHEN TO CONTACT ENVIRONMENTAL HEALTH:

**IMMEDIATE NOTIFICATION REQUIRED IF:**
• 2 or more linked cases from different households
• Person hospitalized or severe symptoms
• Involves vulnerable person (child, elderly, pregnant)
• Suspected food from your premises caused illness

**CONTACT DETAILS:**
• Local Environmental Health Office: [Find local number]
• Out of hours: Council emergency line
• Online reporting available for most councils

🔍 INVESTIGATION METHODOLOGY:

1. **SYMPTOM ANALYSIS**
   • Onset time (helps identify pathogen)
   • Duration and severity of symptoms
   • Specific symptoms (vomiting, diarrhea, fever etc.)

2. **FOOD TIMELINE RECONSTRUCTION**
   • 72-hour food history for affected persons
   • Compare with unaffected customers/staff
   • Identify common menu items

3. **KITCHEN INVESTIGATION**
   • Staff illness records
   • Food preparation practices
   • Temperature control compliance
   • Cleaning and hygiene procedures

💌 CUSTOMER COMMUNICATION STRATEGY:

**INITIAL RESPONSE (Template A):**
"Thank you for bringing this to our attention. We take all health concerns seriously and have immediately initiated our full investigation procedure. We will provide you with an update within 24 hours."

**FOLLOW-UP (Template B):**
"Our investigation is ongoing. We have preserved relevant samples and reviewed our procedures. We appreciate your patience as we work to identify the cause."

**RESOLUTION (Template C - No fault found):**
"Our comprehensive investigation found no issues with our food safety procedures. However, we value your feedback and would like to offer you a [voucher/refund] as a gesture of goodwill."

**RESOLUTION (Template D - Issue identified):**
"We have identified an area for improvement in our procedures and have taken immediate corrective action. We sincerely apologize and would like to offer you [appropriate compensation]."

⚠️ LEGAL & INSURANCE:

• **DO NOT ADMIT LIABILITY** in communications
• **Document everything** for insurance purposes
• **Preserve all evidence** for potential legal requirements
• **Contact your insurance provider** if significant claim anticipated

🎯 FOLLOW-UP TASKS WILL BE AUTOMATICALLY CREATED:

• Preserve evidence and samples
• Environmental health notification (if required)
• Customer communication management
• Procedure review and updates
• Staff briefing and retraining

Remember: Thorough documentation protects your business and helps prevent future incidents.',
  NULL,
  TRUE,
  'food_safety_consultant',
  TRUE,
  TRUE,
  TRUE
);

-- ============================================================================
-- INCIDENT DETAILS SECTION
-- ============================================================================

INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT id, 'incident_date', 'date', 'Incident Report Date', TRUE, 1, 
  'Date when the food poisoning concern was first reported.'
FROM task_templates WHERE slug = 'food_poisoning_investigation';

INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT id, 'reported_by_customer', 'text', 'Reported By (Customer Name)', TRUE, 2,
  'Name of customer who reported the concern.'
FROM task_templates WHERE slug = 'food_poisoning_investigation';

INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT id, 'customer_contact', 'text', 'Customer Contact Details', TRUE, 3,
  'Phone number and/or email address for follow-up.'
FROM task_templates WHERE slug = 'food_poisoning_investigation';

-- ============================================================================
-- SYMPTOM & TIMING ANALYSIS
-- ============================================================================

INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text, options)
SELECT id, 'symptom_onset', 'select', 'Symptom Onset Time After Eating', TRUE, 10,
  'Time between eating and first symptoms - helps identify potential cause.',
  jsonb_build_array(
    jsonb_build_object('value', '1-6_hours', 'label', '1-6 hours (Possible Staphylococcus, Bacillus)'),
    jsonb_build_object('value', '6-24_hours', 'label', '6-24 hours (Possible Clostridium, Salmonella)'),
    jsonb_build_object('value', '24-48_hours', 'label', '24-48 hours (Possible Norovirus, E.coli)'),
    jsonb_build_object('value', '2-5_days', 'label', '2-5 days (Possible Campylobacter, Listeria)'),
    jsonb_build_object('value', 'unknown', 'label', 'Unknown timing')
  )
FROM task_templates WHERE slug = 'food_poisoning_investigation';

INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text, options)
SELECT id, 'primary_symptoms', 'select', 'Primary Symptoms Reported', TRUE, 11,
  'Main symptoms experienced by affected person(s).',
  jsonb_build_array(
    jsonb_build_object('value', 'vomiting', 'label', '🤮 Vomiting (often rapid onset)'),
    jsonb_build_object('value', 'diarrhea', 'label', '💩 Diarrhea'),
    jsonb_build_object('value', 'nausea', 'label', '😵 Nausea'),
    jsonb_build_object('value', 'fever', 'label', '🌡️ Fever'),
    jsonb_build_object('value', 'abdominal_pain', 'label', '🩺 Abdominal Pain'),
    jsonb_build_object('value', 'other', 'label', '❓ Other Symptoms')
  )
FROM task_templates WHERE slug = 'food_poisoning_investigation';

INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT id, 'hospital_treatment', 'pass_fail', 'Hospital Treatment Required?', TRUE, 12,
  'YES if affected person required hospital treatment or medical attention.'
FROM task_templates WHERE slug = 'food_poisoning_investigation';

-- ============================================================================
-- FOOD CONSUMPTION INVESTIGATION
-- ============================================================================

INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
SELECT id, 'suspected_menu_items', 'text', 'Suspected Menu Items', TRUE, 20,
  'List all menu items consumed by affected person(s). Include specific dishes, ingredients, and preparation details.',
  'e.g., "Chicken Caesar Salad - contained raw egg in dressing, cooked chicken, fresh lettuce. Consumed at 7:30pm on 15/11/2024"'
FROM task_templates WHERE slug = 'food_poisoning_investigation';

INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT id, 'other_affected_persons', 'pass_fail', 'Other People Affected?', TRUE, 21,
  'YES if other customers or staff reported similar symptoms after consuming same/similar items.'
FROM task_templates WHERE slug = 'food_poisoning_investigation';

INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
SELECT id, 'unaffected_comparison', 'text', 'Unaffected Persons Comparison', FALSE, 22,
  'List people who ate similar items but did not get sick. This helps identify the specific cause.',
  'e.g., "Table 12 had same chicken salad - no issues. Table 14 had vegetarian option - no issues."'
FROM task_templates WHERE slug = 'food_poisoning_investigation';

-- ============================================================================
-- EVIDENCE PRESERVATION & ACTIONS
-- ============================================================================

INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT id, 'samples_preserved', 'pass_fail', 'Food Samples Preserved?', TRUE, 30,
  'YES if you have isolated and preserved samples of suspected food items.'
FROM task_templates WHERE slug = 'food_poisoning_investigation';

INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT id, 'eho_notified', 'pass_fail', 'Environmental Health Notified?', TRUE, 31,
  'YES if incident meets criteria for Environmental Health notification (multiple cases, hospitalization, etc.)'
FROM task_templates WHERE slug = 'food_poisoning_investigation';

INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
SELECT id, 'immediate_corrective_actions', 'text', 'Immediate Corrective Actions', TRUE, 32,
  'What immediate actions have been taken to prevent further incidents?',
  'e.g., "Removed suspect batch from service, increased temperature monitoring, staff retraining on specific procedure..."'
FROM task_templates WHERE slug = 'food_poisoning_investigation';

-- ============================================================================
-- CUSTOMER MANAGEMENT
-- ============================================================================

INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text, options)
SELECT id, 'customer_response_sent', 'select', 'Customer Response Sent', TRUE, 40,
  'Which customer communication template has been sent?',
  jsonb_build_array(
    jsonb_build_object('value', 'initial_acknowledgment', 'label', 'Template A - Initial Acknowledgment'),
    jsonb_build_object('value', 'investigation_update', 'label', 'Template B - Investigation Update'),
    jsonb_build_object('value', 'resolution_offer', 'label', 'Template C - Resolution Offer'),
    jsonb_build_object('value', 'not_sent', 'label', 'Not Yet Sent')
  )
FROM task_templates WHERE slug = 'food_poisoning_investigation';

INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text, options)
SELECT id, 'compensation_offered', 'select', 'Compensation Offered', FALSE, 41,
  'What type of compensation has been offered to the customer?',
  jsonb_build_array(
    jsonb_build_object('value', 'full_refund', 'label', 'Full Refund'),
    jsonb_build_object('value', 'voucher', 'label', 'Gift Voucher'),
    jsonb_build_object('value', 'future_discount', 'label', 'Future Discount'),
    jsonb_build_object('value', 'goodwill_gesture', 'label', 'Goodwill Gesture (No Admission)'),
    jsonb_build_object('value', 'none', 'label', 'No Compensation Offered')
  )
FROM task_templates WHERE slug = 'food_poisoning_investigation';

-- ============================================================================
-- FOLLOW-UP TASK SELECTION
-- ============================================================================

INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT id, 'generate_follow_up_tasks', 'pass_fail', 'Generate Follow-up Tasks', TRUE, 50,
  'YES to automatically create follow-up tasks for investigation, procedure updates, and staff training.'
FROM task_templates WHERE slug = 'food_poisoning_investigation';

INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT id, 'investigation_complete', 'pass_fail', 'Investigation Complete', TRUE, 60,
  'PASS when all investigation phases are complete and corrective actions implemented. FAIL if further action required.'
FROM task_templates WHERE slug = 'food_poisoning_investigation';

INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
SELECT id, 'final_report_summary', 'text', 'Final Investigation Summary', TRUE, 61,
  'Brief summary of investigation findings, root cause, and preventive measures implemented.',
  'e.g., "Investigation concluded issue was likely cross-contamination during preparation. Implemented new colour-coded cutting board system and additional staff training."'
FROM task_templates WHERE slug = 'food_poisoning_investigation';

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
  WHERE slug = 'food_poisoning_investigation';
  
  SELECT COUNT(*) INTO field_count
  FROM template_fields
  WHERE template_id = template_record.id;
  
  IF template_record.id IS NOT NULL THEN
    RAISE NOTICE '✅ Food Poisoning Investigation template created successfully';
    RAISE NOTICE '   Template ID: %', template_record.id;
    RAISE NOTICE '   Features: 5-phase investigation + Customer management + Auto-task generation';
    RAISE NOTICE '   Template fields: %', field_count;
    RAISE NOTICE '   ✅ Symptom analysis with pathogen identification guidance';
    RAISE NOTICE '   ✅ Customer communication templates';
    RAISE NOTICE '   ✅ Environmental health notification protocols';
    RAISE NOTICE '   ✅ Evidence preservation procedures';
    RAISE NOTICE '   ✅ Automatic follow-up task generation';
  ELSE
    RAISE WARNING '⚠️ Template creation may have failed. Template not found.';
  END IF;
END $$;

