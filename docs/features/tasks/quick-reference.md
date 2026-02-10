# Template Creation Quick Reference

## 🎯 One-Page Decision Guide

### Step 1: What Features Do You Need?

| I Need...               | SQL Configuration                                                                         |
| ----------------------- | ----------------------------------------------------------------------------------------- |
| **Checklist items**     | `evidence_types = ARRAY['text_note']` + `default_checklist_items` in `recurrence_pattern` |
| **Yes/No questions**    | `evidence_types = ARRAY['yes_no_checklist']`                                              |
| **Pass/Fail buttons**   | `evidence_types = ARRAY['pass_fail']`                                                     |
| **Temperature logging** | `evidence_types = ARRAY['temperature']`                                                   |
| **Photo uploads**       | `evidence_types = ARRAY['photo']`                                                         |
| **Asset selection**     | `repeatable_field_name = 'field_name'` (NOT NULL)                                         |
| **Monitor/Callout**     | Auto-enabled if `pass_fail` OR `temperature` OR `triggers_contractor_on_failure = TRUE`   |

### Step 2: Common Template Patterns

#### Pattern 1: Simple Checklist (No Assets)

```sql
evidence_types = ARRAY['text_note']
repeatable_field_name = NULL
recurrence_pattern = jsonb_build_object(
  'default_checklist_items', jsonb_build_array('Item 1', 'Item 2')
)
```

**Shows:** Checklist (pre-populated)

#### Pattern 2: Temperature Monitoring (With Assets)

```sql
evidence_types = ARRAY['temperature']
repeatable_field_name = 'fridge_name'
triggers_contractor_on_failure = TRUE
contractor_type = 'equipment_repair'
```

**Shows:** Asset Selection + Temperature Logs + Monitor/Callout

#### Pattern 3: Inspection with Pass/Fail

```sql
evidence_types = ARRAY['text_note', 'pass_fail']
repeatable_field_name = NULL
triggers_contractor_on_failure = TRUE
contractor_type = 'fire_safety'
recurrence_pattern = jsonb_build_object(
  'default_checklist_items', jsonb_build_array('Check 1', 'Check 2')
)
```

**Shows:** Checklist + Pass/Fail + Monitor/Callout

#### Pattern 4: Yes/No Checklist

```sql
evidence_types = ARRAY['yes_no_checklist']
repeatable_field_name = NULL
```

**Shows:** Yes/No Checklist (auto-triggers monitor/callout on "No")

### Step 3: Field Configuration

#### Select Field (Options in JSONB)

```sql
INSERT INTO template_fields (..., options)
SELECT ...,
  jsonb_build_array(
    jsonb_build_object('value', 'Option 1', 'label', 'Option 1'),
    jsonb_build_object('value', 'Option 2', 'label', 'Option 2')
  )
```

**Use for:** Dropdown selections (locations, types, etc.)

#### Temperature Field (With Thresholds)

```sql
INSERT INTO template_fields (..., warn_threshold, fail_threshold)
SELECT ..., 4, 8
```

**Triggers:** Monitor/Callout when temperature exceeds `fail_threshold`

#### Pass/Fail Field

```sql
INSERT INTO template_fields (..., field_type)
SELECT ..., 'pass_fail'
```

**Triggers:** Monitor/Callout when marked as "Fail"

### Step 4: Verification Checklist

Before finishing, verify:

- [ ] `evidence_types` includes only features you need
- [ ] `repeatable_field_name` is NULL if you don't need asset selection
- [ ] `default_checklist_items` is set if you want pre-populated checklist
- [ ] `triggers_contractor_on_failure` and `contractor_type` are set if needed
- [ ] Select field options are in `template_fields.options` (NOT `template_repeatable_labels`)

## 🚨 Common Mistakes to Avoid

1. **❌ Setting `repeatable_field_name` when you don't need assets**
   - ✅ **Fix:** Set to `NULL`

2. **❌ Using `template_repeatable_labels` for select field options**
   - ✅ **Fix:** Use `template_fields.options` JSONB instead

3. **❌ Forgetting `default_checklist_items`**
   - ✅ **Fix:** Add to `recurrence_pattern` if using checklist

4. **❌ Missing monitor/callout configuration**
   - ✅ **Fix:** Set `triggers_contractor_on_failure = TRUE` and `contractor_type`

5. **❌ Wrong `evidence_types`**
   - ✅ **Fix:** Only include features you actually need

## 📋 Complete Example: Fire Extinguisher Template

```sql
-- Template config
evidence_types = ARRAY['pass_fail', 'text_note']  -- Checklist + Pass/Fail
repeatable_field_name = NULL                       -- NO asset selection
triggers_contractor_on_failure = TRUE              -- Enable monitor/callout
contractor_type = 'fire_safety'                    -- Contractor type

-- Recurrence pattern
recurrence_pattern = jsonb_build_object(
  'default_checklist_items', jsonb_build_array(
    'Check pressure gauge in green zone',
    'Verify safety pin and seal intact',
    'Inspect for physical damage or corrosion'
  )
)

-- Select field (locations)
INSERT INTO template_fields (..., options)
SELECT ...,
  jsonb_build_array(
    jsonb_build_object('value', 'Kitchen', 'label', 'Kitchen'),
    jsonb_build_object('value', 'Bar', 'label', 'Bar Area')
  )
```

**Result:** Checklist (pre-populated) + Pass/Fail + Monitor/Callout, NO assets/libraries/documents

## 🔍 Debugging

If features aren't showing correctly:

1. Check browser console for `🔍 Template feature detection` log
2. Verify `evidence_types` in database matches what you expect
3. Verify `repeatable_field_name` is NULL if you don't want assets
4. Run verification migration to check database values
5. Hard refresh browser (Ctrl+Shift+R)

## 📚 Full Documentation

See `TEMPLATE_CREATION_GUIDE.md` for complete step-by-step instructions and examples.
