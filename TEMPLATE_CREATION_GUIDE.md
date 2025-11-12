# Complete Template Creation Guide

## Overview

This guide explains how to create new compliance task templates that automatically use the correct modular components. **No manual frontend editing required** - everything is driven by the template's database configuration.

## Quick Reference: Template Features Mapping

| Feature                    | Database Configuration                                                                  | Component Used              |
| -------------------------- | --------------------------------------------------------------------------------------- | --------------------------- |
| **Checklist**              | `evidence_types` includes `'text_note'`                                                 | `ChecklistFeature`          |
| **Yes/No Checklist**       | `evidence_types` includes `'yes_no_checklist'`                                          | `YesNoChecklistFeature`     |
| **Pass/Fail**              | `evidence_types` includes `'pass_fail'`                                                 | `PassFailFeature`           |
| **Temperature Logs**       | `evidence_types` includes `'temperature'`                                               | `TemperatureLoggingFeature` |
| **Photo Evidence**         | `evidence_types` includes `'photo'`                                                     | `PhotoEvidenceFeature`      |
| **Asset Selection**        | `repeatable_field_name` is set (NOT NULL)                                               | `AssetSelectionFeature`     |
| **Monitor/Callout**        | Auto-enabled if `temperature` OR `pass_fail` OR `triggers_contractor_on_failure = TRUE` | `MonitorCalloutModal`       |
| **SOP Upload**             | `requires_sop = TRUE`                                                                   | Built-in SOP upload         |
| **Risk Assessment Upload** | `requires_risk_assessment = TRUE`                                                       | Built-in RA upload          |
| **Document Upload**        | Currently disabled (hardcoded to `false`)                                               | -                           |
| **Library Dropdown**       | Currently disabled (hardcoded to `false`)                                               | -                           |

## Step-by-Step: Creating a New Template

### Step 1: Plan Your Template Features

Before writing SQL, decide which features you need:

**Example: Weekly Fridge Temperature Check**

- ✅ Temperature logs (multiple fridges)
- ✅ Asset selection (to link to fridge assets)
- ✅ Monitor/Callout (if temperature exceeds threshold)
- ❌ Checklist (not needed)
- ❌ Pass/Fail (not needed)

**Example: Monthly Fire Extinguisher Inspection**

- ✅ Checklist (pre-populated items)
- ✅ Pass/Fail (overall assessment)
- ✅ Monitor/Callout (if fails)
- ❌ Asset selection (locations are in select field, not assets)
- ❌ Temperature logs (not needed)

### Step 2: Write the SQL Migration

Use this template structure:

```sql
-- ============================================================================
-- Migration: YYYYMMDDHHMMSS_template_name.sql
-- Description: Adds [template name] template
-- ============================================================================

-- Clean up existing template if it exists
DELETE FROM template_repeatable_labels
WHERE template_id IN (SELECT id FROM task_templates WHERE slug = 'your_template_slug');

DELETE FROM template_fields
WHERE template_id IN (SELECT id FROM task_templates WHERE slug = 'your_template_slug');

DELETE FROM task_templates
WHERE slug = 'your_template_slug';

-- Create template
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
  evidence_types,                    -- CRITICAL: Controls which features show
  instructions,
  repeatable_field_name,             -- CRITICAL: NULL = no asset selection, set value = asset selection
  triggers_contractor_on_failure,
  contractor_type,
  is_active
) VALUES (
  NULL,                              -- NULL = available to all companies
  'Your Template Name',
  'your_template_slug',              -- Must be unique, lowercase, underscores
  'Description of what this template does',
  'fire',                            -- 'fire', 'food_safety', 'h_and_s', 'cleaning', 'compliance'
  'fire_safety',                     -- Audit category for reporting
  'monthly',                         -- 'daily', 'weekly', 'monthly', 'triggered', 'once'
  'before_open',                     -- Default time if not using daypart_times
  ARRAY['before_open'],              -- Dayparts for the task
  jsonb_build_object(
    'daypart_times', jsonb_build_object('before_open', '07:00'),
    'date_of_month', 1,              -- For monthly: day of month (1-31)
    'days', ARRAY[1],                -- For weekly: day of week (0=Sunday, 1=Monday, etc)
    'default_checklist_items', jsonb_build_array(
      'Checklist item 1',
      'Checklist item 2',
      'Checklist item 3'
    )
  ),
  'manager',                         -- Assigned role
  'Compliance Standard Name',
  TRUE,                              -- Is critical
  TRUE,                              -- Show in template library
  ARRAY['pass_fail', 'text_note'],  -- CRITICAL: See feature mapping table above
  'Detailed instructions...',
  NULL,                              -- CRITICAL: NULL = no asset selection, set to field name = asset selection
  TRUE,                              -- Trigger contractor on failure
  'fire_safety',                     -- Contractor type
  TRUE                               -- Is active
);
```

### Step 3: Configure Evidence Types (Features)

The `evidence_types` array controls which features are shown:

```sql
-- Checklist only
evidence_types = ARRAY['text_note']

-- Checklist + Pass/Fail
evidence_types = ARRAY['text_note', 'pass_fail']

-- Temperature logging
evidence_types = ARRAY['temperature']

-- Temperature + Pass/Fail
evidence_types = ARRAY['temperature', 'pass_fail']

-- Yes/No Checklist
evidence_types = ARRAY['yes_no_checklist']

-- Photo evidence
evidence_types = ARRAY['photo']

-- Multiple features
evidence_types = ARRAY['text_note', 'pass_fail', 'photo']
```

**Important Rules:**

- `'text_note'` = Checklist feature (auto-populates from `default_checklist_items`)
- `'yes_no_checklist'` = Yes/No checklist (overrides regular checklist)
- `'pass_fail'` = Pass/Fail buttons (auto-triggers monitor/callout on "Fail")
- `'temperature'` = Temperature logging (auto-links to assets if `repeatable_field_name` is set)
- `'photo'` = Photo upload feature

### Step 4: Configure Asset Selection

**Option A: No Asset Selection (Most Templates)**

```sql
repeatable_field_name = NULL  -- No asset selection UI
```

**Option B: Asset Selection Enabled**

```sql
repeatable_field_name = 'fridge_name'  -- Shows asset selection UI
-- Temperature logging will automatically link to selected assets
```

**When to Use Each:**

- **NULL**: Use when locations/items are managed via `template_fields` (select fields) or `template_repeatable_labels`
- **Set value**: Use when you need to select actual assets/equipment from the assets table (e.g., fridges, freezers)

### Step 5: Add Template Fields

Template fields define the data collection form:

```sql
-- Date field
INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT id, 'inspection_date', 'date', 'Inspection Date', TRUE, 1, 'Date of inspection'
FROM task_templates WHERE slug = 'your_template_slug';

-- Text field
INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT id, 'inspected_by', 'text', 'Inspected By', TRUE, 2, 'Name of inspector'
FROM task_templates WHERE slug = 'your_template_slug';

-- Select field (with options in JSONB)
INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text, options)
SELECT id, 'location', 'select', 'Location', TRUE, 3, 'Select location',
  jsonb_build_array(
    jsonb_build_object('value', 'Kitchen', 'label', 'Kitchen'),
    jsonb_build_object('value', 'Bar', 'label', 'Bar Area'),
    jsonb_build_object('value', 'Storage', 'label', 'Storage Room')
  )
FROM task_templates WHERE slug = 'your_template_slug';

-- Pass/Fail field (for individual items)
INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT id, 'pressure_gauge_ok', 'pass_fail', 'Pressure Gauge in Green Zone', TRUE, 10, 'PASS if in green zone'
FROM task_templates WHERE slug = 'your_template_slug';

-- Temperature field (with thresholds)
INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text, warn_threshold, fail_threshold)
SELECT id, 'temperature', 'temperature', 'Temperature Reading', TRUE, 5, 'Current temperature',
  4,    -- Warn if above 4°C
  8     -- Fail if above 8°C (triggers monitor/callout)
FROM task_templates WHERE slug = 'your_template_slug';

-- Number field
INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text, min_value, max_value)
SELECT id, 'quantity', 'number', 'Quantity', TRUE, 4, 'Number of items',
  0,    -- Minimum
  100   -- Maximum
FROM task_templates WHERE slug = 'your_template_slug';
```

**Field Types Available:**

- `'date'` - Date picker
- `'text'` - Text input
- `'number'` - Number input
- `'select'` - Dropdown (options in `options` JSONB field)
- `'pass_fail'` - Pass/Fail buttons
- `'temperature'` - Temperature input (with thresholds)

### Step 6: Configure Pre-populated Checklist Items

Checklist items are automatically loaded from `recurrence_pattern.default_checklist_items`:

```sql
recurrence_pattern = jsonb_build_object(
  'default_checklist_items', jsonb_build_array(
    'Check item 1',
    'Check item 2',
    'Check item 3',
    'Verify item 4 is correct',
    'Record findings in log'
  )
)
```

**Important:**

- Only works if `evidence_types` includes `'text_note'`
- Items are automatically loaded when creating a task from the template
- Users can add/remove/edit items

### Step 7: Configure Monitor/Callout

Monitor/Callout is **automatically enabled** when:

- `evidence_types` includes `'temperature'` OR
- `evidence_types` includes `'pass_fail'` OR
- `triggers_contractor_on_failure = TRUE`

**To enable contractor callouts:**

```sql
triggers_contractor_on_failure = TRUE,
contractor_type = 'fire_safety'  -- 'pest_control', 'fire_safety', 'equipment_repair', etc.
```

**How it works:**

- **Pass/Fail "Fail"** → Automatically triggers monitor/callout modal
- **Temperature exceeds fail_threshold** → Automatically triggers monitor/callout modal
- **Yes/No Checklist "No"** → Automatically triggers monitor/callout

### Step 8: Example Templates

#### Example 1: Temperature Logging Template (with Assets)

```sql
INSERT INTO task_templates (
  -- ... other fields ...
  evidence_types,
  repeatable_field_name,
  triggers_contractor_on_failure,
  contractor_type
) VALUES (
  -- ... other values ...
  ARRAY['temperature'],           -- Temperature logging feature
  'fridge_name',                  -- Asset selection enabled
  TRUE,                           -- Trigger contractor on failure
  'equipment_repair'              -- Contractor type
);
```

**Features that will show:**

- ✅ Asset Selection (because `repeatable_field_name` is set)
- ✅ Temperature Logging (auto-populated from selected assets)
- ✅ Monitor/Callout (auto-enabled for temperature)

#### Example 2: Checklist + Pass/Fail Template (No Assets)

```sql
INSERT INTO task_templates (
  -- ... other fields ...
  evidence_types,
  repeatable_field_name,
  recurrence_pattern,
  triggers_contractor_on_failure,
  contractor_type
) VALUES (
  -- ... other values ...
  ARRAY['text_note', 'pass_fail'],  -- Checklist + Pass/Fail
  NULL,                              -- NO asset selection
  jsonb_build_object(
    'default_checklist_items', jsonb_build_array(
      'Check item 1',
      'Check item 2',
      'Check item 3'
    )
  ),
  TRUE,                              -- Trigger contractor on failure
  'fire_safety'                      -- Contractor type
);
```

**Features that will show:**

- ✅ Checklist (pre-populated with 3 items)
- ✅ Pass/Fail (triggers monitor/callout on "Fail")
- ❌ Asset Selection (because `repeatable_field_name` is NULL)
- ❌ Libraries/Documents (hardcoded to false)

#### Example 3: Yes/No Checklist Template

```sql
INSERT INTO task_templates (
  -- ... other fields ...
  evidence_types,
  repeatable_field_name
) VALUES (
  -- ... other values ...
  ARRAY['yes_no_checklist'],  -- Yes/No checklist (overrides regular checklist)
  NULL                        -- NO asset selection
);
```

**Features that will show:**

- ✅ Yes/No Checklist (triggers monitor/callout on "No")
- ❌ Regular Checklist (disabled when yes_no_checklist is used)

## Common Patterns

### Pattern 1: Simple Checklist Template

```sql
evidence_types = ARRAY['text_note']
repeatable_field_name = NULL
recurrence_pattern = jsonb_build_object(
  'default_checklist_items', jsonb_build_array('Item 1', 'Item 2')
)
```

### Pattern 2: Temperature Monitoring Template

```sql
evidence_types = ARRAY['temperature']
repeatable_field_name = 'equipment_name'  -- Links to assets
triggers_contractor_on_failure = TRUE
contractor_type = 'equipment_repair'
```

### Pattern 3: Pass/Fail Inspection Template

```sql
evidence_types = ARRAY['text_note', 'pass_fail']
repeatable_field_name = NULL
triggers_contractor_on_failure = TRUE
contractor_type = 'fire_safety'
recurrence_pattern = jsonb_build_object(
  'default_checklist_items', jsonb_build_array('Check 1', 'Check 2')
)
```

### Pattern 4: Photo Evidence Template

```sql
evidence_types = ARRAY['photo', 'text_note']
repeatable_field_name = NULL
```

## Verification Checklist

Before finalizing your template, verify:

- [ ] `evidence_types` includes only the features you need
- [ ] `repeatable_field_name` is NULL if you don't need asset selection
- [ ] `default_checklist_items` is set if you want pre-populated checklists
- [ ] `triggers_contractor_on_failure` and `contractor_type` are set if failures should trigger callouts
- [ ] `category` matches one of: 'fire', 'food_safety', 'h_and_s', 'cleaning', 'compliance'
- [ ] `frequency` is set correctly ('daily', 'weekly', 'monthly', etc.)
- [ ] `recurrence_pattern` includes `date_of_month` for monthly, `days` for weekly
- [ ] Template fields are in correct `field_order`
- [ ] Select field options are in `options` JSONB (not `template_repeatable_labels`)

## Troubleshooting

### Problem: Asset selection showing when it shouldn't

**Solution:** Set `repeatable_field_name = NULL` in the template

### Problem: Checklist not pre-populating

**Solution:**

1. Ensure `evidence_types` includes `'text_note'`
2. Ensure `recurrence_pattern.default_checklist_items` is set
3. Check browser console for debug logs

### Problem: Monitor/Callout not triggering

**Solution:**

1. Ensure `triggers_contractor_on_failure = TRUE` OR
2. Ensure `evidence_types` includes `'pass_fail'` OR `'temperature'`

### Problem: Wrong features showing

**Solution:**

1. Check `evidence_types` array - only include what you need
2. Run verification migration to check database values
3. Check browser console for feature detection logs

## Testing Your Template

1. **Run the migration** in your Supabase dashboard
2. **Refresh your browser** (hard refresh: Ctrl+Shift+R)
3. **Open the template** in the compliance page
4. **Check browser console** for feature detection logs:
   ```
   🔍 Template feature detection: {
     templateName: "...",
     evidence_types: [...],
     enabledFeatures: {...}
   }
   ```
5. **Verify features** - only the features you configured should appear
6. **Test checklist** - should pre-populate from `default_checklist_items`
7. **Test monitor/callout** - should trigger on "Fail" or threshold breach

## Summary

**Key Points:**

- ✅ Features are automatically detected from `evidence_types` and `repeatable_field_name`
- ✅ No manual frontend editing needed
- ✅ Checklists auto-populate from `default_checklist_items`
- ✅ Monitor/Callout auto-triggers on failures/threshold breaches
- ✅ Temperature logs auto-link to assets when `repeatable_field_name` is set
- ✅ All components are modular and reusable

**Remember:**

- `evidence_types` = Which features to show
- `repeatable_field_name` = NULL means no asset selection
- `default_checklist_items` = Pre-populate checklist
- `triggers_contractor_on_failure` = Enable monitor/callout
