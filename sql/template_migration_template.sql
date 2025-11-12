-- ============================================================================
-- Template Migration Template
-- Copy this file and modify for each new template
-- ============================================================================

-- Migration: YYYYMMDDHHMMSS_add_your_template_name.sql
-- Description: Adds [Template Name] to compliance library
-- 
-- FEATURE CONFIGURATION GUIDE:
-- - evidence_types: Controls which features show (see TEMPLATE_CREATION_GUIDE.md)
-- - repeatable_field_name: NULL = no asset selection, set value = asset selection
-- - default_checklist_items: Pre-populates checklist (only if evidence_types includes 'text_note')
-- - triggers_contractor_on_failure: Auto-enables monitor/callout
-- 
-- Quick Reference: See TEMPLATE_QUICK_REFERENCE.md
-- Full Guide: See TEMPLATE_CREATION_GUIDE.md

-- ============================================================================
-- STEP 1: Clean up existing template (if updating)
-- ============================================================================
DELETE FROM template_repeatable_labels 
WHERE template_id IN (SELECT id FROM task_templates WHERE slug = 'your_template_slug');

DELETE FROM template_fields 
WHERE template_id IN (SELECT id FROM task_templates WHERE slug = 'your_template_slug');

DELETE FROM task_templates 
WHERE slug = 'your_template_slug';

-- ============================================================================
-- STEP 2: Create template
-- ============================================================================
INSERT INTO task_templates (
  company_id,                    -- NULL = global template, UUID = company-specific
  name,                          -- User-friendly name
  slug,                          -- URL-friendly identifier (snake_case)
  description,                   -- Brief description
  category,                      -- food_safety | h_and_s | fire | cleaning | compliance
  audit_category,                -- Usually same as category
  frequency,                     -- daily | weekly | monthly | triggered | once
  time_of_day,                   -- 'HH:MM' format or 'before_open', etc.
  dayparts,                      -- Array: ['before_open', 'during_service', 'after_service']
  recurrence_pattern,            -- JSONB with scheduling details
  assigned_to_role,              -- manager | chef | staff | etc.
  compliance_standard,           -- 'Food Safety Act 1990', 'Fire Safety Order 2005', etc.
  is_critical,                   -- TRUE for critical compliance tasks
  is_template_library,           -- TRUE for library templates
  evidence_types,                -- Array: ['pass_fail', 'photo', 'text_note', 'temperature']
  instructions,                  -- Detailed instructions (multi-line text)
  repeatable_field_name,         -- NULL = no asset selection, or field name like 'fridge_name'
  triggers_contractor_on_failure, -- TRUE if failure should trigger contractor callout
  contractor_type                -- 'pest_control', 'fire_engineer', 'equipment_repair', etc.
) VALUES (
  NULL,                          -- Global template (available to all companies)
  'Your Template Name Here',     -- e.g., 'Weekly Pest Control Inspection'
  'your_template_slug',          -- e.g., 'weekly_pest_control_inspection'
  'Brief description of what this template does',
  'food_safety',                 -- Change to match your category
  'food_safety',                 -- Usually same as category
  'weekly',                      -- Change frequency as needed
  '07:00',                       -- Change time as needed
  ARRAY['before_open'],          -- Change dayparts as needed
  jsonb_build_object(
    'daypart_times', jsonb_build_object('before_open', '07:00'),
    'default_checklist_items', jsonb_build_array(  -- OPTIONAL: Only if using checklist
      'Checklist item 1',
      'Checklist item 2',
      'Checklist item 3'
    )
  ),
  'manager',                     -- Change assigned role as needed
  'Food Safety Act 1990',        -- Change compliance standard as needed
  TRUE,                          -- TRUE for critical, FALSE for non-critical
  TRUE,                          -- TRUE for library templates
  ARRAY['pass_fail', 'photo', 'text_note'],  -- Change evidence types as needed
  'Purpose:
Brief purpose of this task

Importance:
Why this task is important for compliance

Method:
How to perform this task

Special Requirements:
Any special instructions or requirements',
  NULL,                          -- NULL = no asset selection, or 'field_name' for asset selection
  TRUE,                          -- TRUE if failure triggers contractor callout
  'pest_control'                 -- Change contractor type as needed (only if triggers_contractor_on_failure = TRUE)
);

-- ============================================================================
-- STEP 3: Add fields in logical order
-- ============================================================================

-- FIELD 1: Date (Identification - field_order: 1)
INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT id, 'check_date', 'date', 'Check Date', TRUE, 1, 
  'Date when the check was performed. Use today''s date for scheduled checks.'
FROM task_templates WHERE slug = 'your_template_slug';

-- FIELD 2: Primary data field (field_order: 2-10)
-- Example: Select field
INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT id, 'location', 'select', 'Location', TRUE, 2,
  'Select the location being checked. Rotate through all locations weekly.'
FROM task_templates WHERE slug = 'your_template_slug';

-- FIELD 3: Validation field - Pass/Fail (field_order: 11-15)
INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT id, 'overall_assessment', 'pass_fail', 'Overall Assessment', TRUE, 11,
  'PASS if everything is correct. FAIL if any issues found. FAILURE will trigger a contractor callout.'
FROM task_templates WHERE slug = 'your_template_slug';

-- FIELD 4: Documentation - Notes (field_order: 16-20)
INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
SELECT id, 'notes', 'text', 'Additional Notes', FALSE, 16,
  'Record any observations, issues, or actions taken. Be specific about what was found and what was done.',
  'Enter any additional observations...'
FROM task_templates WHERE slug = 'your_template_slug';

-- FIELD 5: Sign-off (field_order: 21-25)
INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT id, 'checked_by_initials', 'text', 'Checked By (Initials)', TRUE, 25,
  'Initials of the person who performed the check. This confirms the check was completed correctly.'
FROM task_templates WHERE slug = 'your_template_slug';

-- ============================================================================
-- STEP 4: Add repeatable labels (if using select dropdowns with predefined options)
-- ============================================================================
-- Only needed if you have a select field that should show predefined options
-- Example: Fire alarm call points, equipment locations, etc.

INSERT INTO template_repeatable_labels (template_id, label, label_value, is_default, display_order)
SELECT id, 'Location 1 - Front Entrance', 'Location 1 - Front Entrance', TRUE, 1
FROM task_templates WHERE slug = 'your_template_slug';

INSERT INTO template_repeatable_labels (template_id, label, label_value, is_default, display_order)
SELECT id, 'Location 2 - Kitchen', 'Location 2 - Kitchen', TRUE, 2
FROM task_templates WHERE slug = 'your_template_slug';

-- (Add more locations as needed...)

-- ============================================================================
-- STEP 5: Verification
-- ============================================================================
DO $$
DECLARE
  template_count INTEGER;
  field_count INTEGER;
  label_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO template_count
  FROM task_templates 
  WHERE slug = 'your_template_slug';
  
  SELECT COUNT(*) INTO field_count
  FROM template_fields
  WHERE template_id IN (SELECT id FROM task_templates WHERE slug = 'your_template_slug');
  
  SELECT COUNT(*) INTO label_count
  FROM template_repeatable_labels
  WHERE template_id IN (SELECT id FROM task_templates WHERE slug = 'your_template_slug');
  
  IF template_count = 1 THEN
    RAISE NOTICE '✅ Template created successfully';
    RAISE NOTICE '✅ Template fields created: %', field_count;
    RAISE NOTICE '✅ Repeatable labels created: %', label_count;
  ELSE
    RAISE WARNING '⚠️ Template creation may have failed. Template count: %', template_count;
  END IF;
END $$;

-- ============================================================================
-- FIELD TYPE REFERENCE
-- ============================================================================
-- Available field types:
--   'text'          - Free-form text input
--   'number'        - Numeric input (with min/max thresholds)
--   'select'        - Dropdown with options
--   'pass_fail'     - Pass/Fail buttons
--   'date'          - Date picker
--   'time'          - Time picker
--   'signature'     - Signature capture
--   'photo'         - Photo upload (usually handled via evidence_types)
--   'repeatable_record' - Multiple records (advanced)

-- ============================================================================
-- EVIDENCE TYPES REFERENCE
-- ============================================================================
-- Available evidence types (used in task_templates.evidence_types):
--   'temperature'     - Temperature logging (auto-enables monitor/callout)
--   'pass_fail'       - Pass/fail checks (auto-enables monitor/callout)
--   'photo'           - Photo evidence
--   'text_note'       - Text notes (enables checklist if no yes_no_checklist)
--   'yes_no_checklist' - Yes/No checklist (alternative to text_note checklist)

-- ============================================================================
-- QUICK DECISION GUIDE
-- ============================================================================
-- Need asset selection? → Set repeatable_field_name = 'field_name' (not NULL)
-- Need temperature logging? → Add 'temperature' to evidence_types
-- Need pass/fail buttons? → Add 'pass_fail' to evidence_types
-- Need checklist items? → Add 'text_note' to evidence_types + add default_checklist_items to recurrence_pattern
-- Need contractor callout on failure? → Set triggers_contractor_on_failure = TRUE
-- Need photo evidence? → Add 'photo' to evidence_types
-- Need call points/locations? → Create select field + add template_repeatable_labels

