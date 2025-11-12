# Template Fields Best Practices Guide

## Overview

This guide shows you the **best way to structure template_fields** for your 30+ templates. Follow these patterns to ensure consistent, user-friendly forms that provide clear instructions.

## Field Types Available

| Field Type          | Use Case                         | Example                                            |
| ------------------- | -------------------------------- | -------------------------------------------------- |
| `text`              | Free-form text input             | Notes, observations, names, descriptions           |
| `number`            | Numeric values                   | Quantities, counts, measurements (not temperature) |
| `select`            | Dropdown with predefined options | Call points, locations, status options             |
| `pass_fail`         | Pass/Fail buttons                | Compliance checks, equipment status                |
| `date`              | Date picker                      | Test dates, service dates, expiry dates            |
| `time`              | Time picker                      | Service times, check times                         |
| `signature`         | Signature capture                | Manager approval, completion sign-off              |
| `photo`             | Photo upload                     | Evidence, condition documentation                  |
| `repeatable_record` | Multiple records of same type    | Multiple fridges, multiple extinguishers           |

## Field Ordering Strategy

**Always order fields logically:**

1. **Identification** (date, time, location) - field_order: 1-3
2. **Primary Data** (measurements, selections) - field_order: 4-10
3. **Validation** (pass/fail, status) - field_order: 11-15
4. **Documentation** (notes, photos) - field_order: 16-20
5. **Sign-off** (initials, signature) - field_order: 21-25

## Best Practices by Field Type

### 1. Text Fields

**Use for:** Notes, observations, descriptions, names

```sql
INSERT INTO template_fields (
  template_id, field_name, field_type, label,
  required, field_order, help_text, placeholder
)
SELECT
  id,
  'notes',                    -- field_name: lowercase, snake_case
  'text',                     -- field_type
  'Additional Notes',         -- label: User-friendly, Title Case
  FALSE,                      -- required: Usually optional for notes
  16,                         -- field_order: Late in form (documentation section)
  'Record any observations, issues, or actions taken. Be specific about what was found and what was done.',  -- help_text: Clear, actionable
  'Enter any additional observations...'  -- placeholder: Hint for what to enter
FROM task_templates WHERE slug = 'your_template';
```

**Best Practices:**

- ✅ Use `placeholder` to give examples
- ✅ Use `help_text` to explain when/why to use the field
- ✅ Make notes fields `required = FALSE` (optional)
- ✅ Use descriptive `field_name` (e.g., `equipment_issues`, not `field1`)

### 2. Pass/Fail Fields

**Use for:** Compliance checks, equipment status, critical validations

```sql
INSERT INTO template_fields (
  template_id, field_name, field_type, label,
  required, field_order, help_text
)
SELECT
  id,
  'overall_assessment',                    -- field_name
  'pass_fail',                             -- field_type: Shows Pass/Fail buttons
  'Overall Assessment',                    -- label
  TRUE,                                    -- required: Always required for pass/fail
  11,                                      -- field_order: Validation section
  'PASS if everything is correct. FAIL if any issues found. FAILURE will trigger a contractor callout.'  -- help_text: Explain consequences
FROM task_templates WHERE slug = 'your_template';
```

**Best Practices:**

- ✅ Always `required = TRUE` for pass/fail fields
- ✅ Explain consequences in `help_text` (especially if triggers callout)
- ✅ Use clear labels that indicate what's being assessed
- ✅ Place in validation section (field_order 11-15)

### 3. Select Fields (Dropdowns)

**Use for:** Predefined options, locations, call points, equipment types

```sql
-- Option 1: Simple select with static options
INSERT INTO template_fields (
  template_id, field_name, field_type, label,
  required, field_order, help_text, options
)
SELECT
  id,
  'fire_alarm_call_point',
  'select',
  'Fire Alarm Call Point',
  TRUE,
  2,
  'Select the call point being tested this week. Rotate through all call points.',
  jsonb_build_array(  -- options: JSONB array of objects
    jsonb_build_object('value', 'call_point_1', 'label', 'Call Point 1 - Front Entrance'),
    jsonb_build_object('value', 'call_point_2', 'label', 'Call Point 2 - Kitchen'),
    jsonb_build_object('value', 'call_point_3', 'label', 'Call Point 3 - Bar Area')
  )
FROM task_templates WHERE slug = 'fire_alarm_test_weekly';

-- Option 2: Use template_repeatable_labels (better for dynamic lists)
-- First, add labels to template_repeatable_labels
-- Then reference them in the select field (system will auto-populate)
```

**Best Practices:**

- ✅ Use `template_repeatable_labels` for lists that might change (like call points)
- ✅ Use static `options` for fixed lists (like status options)
- ✅ Provide clear labels in dropdown
- ✅ Use `help_text` to explain selection logic (e.g., "Rotate through all options")

### 4. Date Fields

**Use for:** Test dates, service dates, expiry dates, check dates

```sql
INSERT INTO template_fields (
  template_id, field_name, field_type, label,
  required, field_order, help_text
)
SELECT
  id,
  'test_date',
  'date',
  'Test Date',
  TRUE,
  1,  -- field_order: Always early (identification)
  'Date when the test was performed. Use today''s date for scheduled tests.'
FROM task_templates WHERE slug = 'your_template';
```

**Best Practices:**

- ✅ Always `required = TRUE` for dates
- ✅ Place early in form (field_order 1-3)
- ✅ Explain what date to use (today, scheduled date, etc.)

### 5. Number Fields (with Thresholds)

**Use for:** Quantities, counts, measurements (NOT temperature - use temperature field type)

```sql
INSERT INTO template_fields (
  template_id, field_name, field_type, label,
  required, field_order, help_text,
  min_value, max_value, warn_threshold, fail_threshold
)
SELECT
  id,
  'item_count',
  'number',
  'Number of Items Checked',
  TRUE,
  4,
  'Enter the total number of items inspected. Must be between 1 and 100.',
  1,      -- min_value: Minimum allowed
  100,    -- max_value: Maximum allowed
  10,     -- warn_threshold: Warning if below this
  5       -- fail_threshold: Fail if below this
FROM task_templates WHERE slug = 'your_template';
```

**Best Practices:**

- ✅ Set `min_value` and `max_value` for validation
- ✅ Use `warn_threshold` for warnings (yellow alert)
- ✅ Use `fail_threshold` for failures (red alert, triggers callout if configured)
- ✅ Explain ranges in `help_text`

### 6. Temperature Fields

**Note:** Temperature fields are special - they're handled via `evidence_types = ['temperature']`, not as a separate field type. However, you can create a number field for temperature with thresholds:

```sql
-- For temperature logging, use evidence_types = ['temperature'] in task_templates
-- The system automatically provides temperature input with monitoring

-- If you need a specific temperature field, use number type with thresholds:
INSERT INTO template_fields (
  template_id, field_name, field_type, label,
  required, field_order, help_text,
  min_value, max_value, warn_threshold, fail_threshold
)
SELECT
  id,
  'target_temperature',
  'number',
  'Target Temperature (°C)',
  TRUE,
  5,
  'Enter the target temperature. Safe range: 0-5°C. Warning if outside 1-4°C. Fail if outside 0-5°C.',
  0,      -- min_value: Absolute minimum
  5,      -- max_value: Absolute maximum
  1,      -- warn_threshold: Warn if below 1°C
  0       -- fail_threshold: Fail if below 0°C (or use max_value for upper threshold)
FROM task_templates WHERE slug = 'your_template';
```

### 7. Signature Fields

**Use for:** Manager approval, completion sign-off

```sql
INSERT INTO template_fields (
  template_id, field_name, field_type, label,
  required, field_order, help_text
)
SELECT
  id,
  'manager_signature',
  'signature',
  'Manager Signature',
  TRUE,
  25,  -- field_order: Always last (sign-off)
  'Sign to confirm this task has been completed correctly and all checks are satisfactory.'
FROM task_templates WHERE slug = 'your_template';
```

**Best Practices:**

- ✅ Always `required = TRUE` for signatures
- ✅ Place last in form (field_order 21-25)
- ✅ Explain what signing confirms

## Complete Template Example

### Example: Fire Alarm Test Template

```sql
-- Step 1: Create template
INSERT INTO task_templates (
  name, slug, description, category, audit_category,
  frequency, time_of_day, dayparts,
  evidence_types, instructions,
  repeatable_field_name,  -- NULL = no asset selection
  triggers_contractor_on_failure, contractor_type,
  is_critical, is_template_library
) VALUES (
  'Test fire alarms and emergency lighting',
  'fire_alarm_test_weekly',
  'Weekly testing of fire alarms and emergency lighting systems',
  'h_and_s',
  'fire_safety',
  'weekly',
  '09:00',
  ARRAY['before_open'],
  ARRAY['pass_fail', 'photo', 'text_note'],  -- Evidence types
  'Purpose: Test fire alarm system...',      -- Instructions
  NULL,                                      -- No asset selection
  TRUE,                                      -- Triggers callout on failure
  'fire_engineer',                          -- Contractor type
  TRUE,                                      -- Critical
  TRUE                                       -- Library template
);

-- Step 2: Add fields in logical order

-- Field 1: Date (Identification)
INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT id, 'test_date', 'date', 'Test Date', TRUE, 1,
  'Date when the fire alarm test was performed. Use today''s date for scheduled tests.'
FROM task_templates WHERE slug = 'fire_alarm_test_weekly';

-- Field 2: Call Point Selection (Primary Data)
INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT id, 'fire_alarm_call_point', 'select', 'Fire Alarm Call Point', TRUE, 2,
  'Select the call point being tested this week. Rotate through all call points to ensure comprehensive testing.'
FROM task_templates WHERE slug = 'fire_alarm_test_weekly';

-- Field 3: Primary Validation (Pass/Fail)
INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT id, 'alarm_activated', 'pass_fail', 'Alarm Activated Successfully', TRUE, 3,
  'PASS if alarm activated when call point was pressed. FAIL if alarm did not activate - this will trigger a fire engineer callout immediately.'
FROM task_templates WHERE slug = 'fire_alarm_test_weekly';

-- Field 4: Secondary Validation (Pass/Fail)
INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT id, 'all_staff_heard', 'pass_fail', 'All Staff Heard the Alarm', TRUE, 4,
  'PASS if all staff confirmed they heard the alarm. FAIL if alarm could not be heard in all areas (toilets, storerooms, etc.).'
FROM task_templates WHERE slug = 'fire_alarm_test_weekly';

-- Field 5: Documentation (Notes)
INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
SELECT id, 'issues', 'text', 'Issues or Observations', FALSE, 16,
  'Record any issues, observations, or additional notes about the test. Be specific about any problems found.',
  'Enter any issues found during the test...'
FROM task_templates WHERE slug = 'fire_alarm_test_weekly';

-- Field 6: Sign-off (Initials)
INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT id, 'manager_initials', 'text', 'Tested By (Initials)', TRUE, 25,
  'Initials of the person who performed the test. This confirms the test was completed correctly.'
FROM task_templates WHERE slug = 'fire_alarm_test_weekly';

-- Step 3: Add repeatable labels for call points (if using select dropdown)
INSERT INTO template_repeatable_labels (template_id, label, label_value, is_default, display_order)
SELECT id, 'Call Point 1 - Front Entrance', 'Call Point 1 - Front Entrance', TRUE, 1
FROM task_templates WHERE slug = 'fire_alarm_test_weekly';
-- (Repeat for other call points...)
```

## Help Text Writing Guide

### Good Help Text Examples

**✅ DO:**

- "PASS if alarm activated when call point was pressed. FAIL if alarm did not activate - this will trigger a fire engineer callout immediately."
- "Enter the target temperature. Safe range: 0-5°C. Warning if outside 1-4°C. Fail if outside 0-5°C."
- "Select the call point being tested this week. Rotate through all call points to ensure comprehensive testing."

**❌ DON'T:**

- "Enter value" (too vague)
- "Pass or fail" (doesn't explain when to use each)
- "Select option" (doesn't explain selection logic)

### Help Text Formula

```
[What to enter/select] + [Acceptable values/ranges] + [Consequences/warnings]
```

**Examples:**

- "Enter temperature in °C. Safe range: 0-5°C. **FAIL if outside range triggers callout.**"
- "Select location from dropdown. **Rotate through all locations weekly.**"
- "PASS if condition is met. **FAIL triggers contractor callout immediately.**"

## Field Naming Conventions

### Field Names (snake_case, lowercase)

| Use Case      | Naming Pattern                    | Example                                                |
| ------------- | --------------------------------- | ------------------------------------------------------ |
| Date fields   | `*_date`                          | `test_date`, `service_date`, `expiry_date`             |
| Time fields   | `*_time`                          | `check_time`, `service_time`                           |
| Status fields | `*_status`                        | `equipment_status`, `overall_status`                   |
| Pass/Fail     | `*_result` or descriptive         | `alarm_activated`, `test_result`, `overall_assessment` |
| Notes         | `notes`, `observations`, `issues` | `notes`, `additional_notes`, `issues`                  |
| Signature     | `*_signature` or `*_initials`     | `manager_signature`, `manager_initials`                |
| Selection     | Descriptive                       | `fire_alarm_call_point`, `location`, `equipment_type`  |

### Labels (Title Case, User-Friendly)

| Field Name              | Label                          |
| ----------------------- | ------------------------------ |
| `test_date`             | `Test Date`                    |
| `fire_alarm_call_point` | `Fire Alarm Call Point`        |
| `alarm_activated`       | `Alarm Activated Successfully` |
| `manager_initials`      | `Tested By (Initials)`         |
| `overall_assessment`    | `Overall Assessment`           |

## Common Patterns

### Pattern 1: Temperature Logging Template

```sql
-- Template config
evidence_types = ARRAY['temperature', 'photo']
repeatable_field_name = 'fridge_name'  -- Shows asset selection
triggers_contractor_on_failure = TRUE

-- Fields (in order):
-- 1. Date
-- 2. (Asset selection handled automatically via repeatable_field_name)
-- 3. Temperature (handled automatically via evidence_types)
-- 4. Photo (handled automatically via evidence_types)
-- 5. Notes (optional)
-- 6. Initials
```

### Pattern 2: Inspection Checklist Template

```sql
-- Template config
evidence_types = ARRAY['pass_fail', 'photo', 'text_note']
repeatable_field_name = NULL  -- No asset selection
triggers_contractor_on_failure = TRUE

-- Fields (in order):
-- 1. Date
-- 2. Overall Assessment (pass_fail) - CRITICAL
-- 3. Notes (text)
-- 4. Photo (handled automatically)
-- 5. Initials
```

### Pattern 3: Service/Maintenance Template

```sql
-- Template config
evidence_types = ARRAY['photo', 'text_note']
repeatable_field_name = NULL

-- Fields (in order):
-- 1. Service Date
-- 2. Service Provider (text or select)
-- 3. Service Description (text)
-- 4. Next Service Due (date)
-- 5. Notes (text)
-- 6. Photos (handled automatically)
-- 7. Signature
```

## Quick Reference Checklist

When creating a new template, use this checklist:

- [ ] **Date field** (field_order: 1) - Always include, always required
- [ ] **Primary data fields** (field_order: 2-10) - Measurements, selections
- [ ] **Validation fields** (field_order: 11-15) - Pass/fail, status checks
- [ ] **Documentation fields** (field_order: 16-20) - Notes, observations
- [ ] **Sign-off field** (field_order: 21-25) - Initials or signature
- [ ] **Help text** - Clear, actionable, explains consequences
- [ ] **Required flags** - Set appropriately (dates and validations = TRUE)
- [ ] **Field names** - snake_case, descriptive
- [ ] **Labels** - Title Case, user-friendly
- [ ] **Placeholders** - Helpful examples for text fields

## Migration Template

Use this as a starting point for your migrations:

```sql
-- Migration: YYYYMMDDHHMMSS_add_your_template.sql
-- Description: Adds [Template Name] to compliance library

-- Clean up existing template if it exists
DELETE FROM template_repeatable_labels
WHERE template_id IN (SELECT id FROM task_templates WHERE slug = 'your_template_slug');

DELETE FROM template_fields
WHERE template_id IN (SELECT id FROM task_templates WHERE slug = 'your_template_slug');

DELETE FROM task_templates
WHERE slug = 'your_template_slug';

-- Create template
INSERT INTO task_templates (
  company_id, name, slug, description, category, audit_category,
  frequency, time_of_day, dayparts, recurrence_pattern,
  assigned_to_role, compliance_standard, is_critical, is_template_library,
  evidence_types, instructions,
  repeatable_field_name, triggers_contractor_on_failure, contractor_type
) VALUES (
  NULL,  -- Global template
  'Your Template Name',
  'your_template_slug',
  'Description of what this template does',
  'category',  -- food_safety, h_and_s, fire, cleaning, compliance
  'audit_category',
  'frequency',  -- daily, weekly, monthly, triggered
  'HH:MM',  -- Time
  ARRAY['before_open'],  -- Dayparts
  jsonb_build_object(
    'daypart_times', jsonb_build_object('before_open', 'HH:MM'),
    'default_checklist_items', jsonb_build_array(  -- If using checklist
      'Item 1',
      'Item 2'
    )
  ),
  'manager',  -- Assigned role
  'Compliance Standard',
  TRUE,  -- Critical?
  TRUE,  -- Library template
  ARRAY['pass_fail', 'photo', 'text_note'],  -- Evidence types
  'Instructions...',
  NULL,  -- repeatable_field_name (NULL = no asset selection)
  TRUE,  -- Triggers contractor on failure?
  'contractor_type'  -- If triggers_contractor_on_failure = TRUE
);

-- Add fields (use SELECT pattern for template_id)
-- Field 1: Date
INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT id, 'check_date', 'date', 'Check Date', TRUE, 1,
  'Date when the check was performed.'
FROM task_templates WHERE slug = 'your_template_slug';

-- Field 2: Primary data field
-- (Add more fields following the pattern above)

-- Add repeatable labels if needed
INSERT INTO template_repeatable_labels (template_id, label, label_value, is_default, display_order)
SELECT id, 'Label 1', 'Label 1', TRUE, 1
FROM task_templates WHERE slug = 'your_template_slug';

-- Verify
DO $$
DECLARE
  template_count INTEGER;
  field_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO template_count FROM task_templates WHERE slug = 'your_template_slug';
  SELECT COUNT(*) INTO field_count FROM template_fields
  WHERE template_id IN (SELECT id FROM task_templates WHERE slug = 'your_template_slug');

  IF template_count = 1 THEN
    RAISE NOTICE '✅ Template created: % fields', field_count;
  END IF;
END $$;
```

## Summary

**Key Principles:**

1. **Order fields logically**: Identification → Data → Validation → Documentation → Sign-off
2. **Write helpful help_text**: Explain what, when, why, and consequences
3. **Use appropriate field types**: Match the data type to the field type
4. **Set required flags correctly**: Dates and validations = TRUE, notes = FALSE
5. **Use descriptive names**: snake_case for field_name, Title Case for labels
6. **Consider user experience**: Place critical fields first, optional fields last

Follow these patterns and your 30+ templates will be consistent, user-friendly, and maintainable!
