# Template Features Automation

## Problem

Templates were manually configured with features, leading to inconsistencies. Every time a new template was added, features had to be manually enabled/disabled, causing issues like:

- Asset selection showing when it shouldn't
- Libraries/documents appearing incorrectly
- Monitor/callout not being enabled when it should be
- Features not matching template configuration

## Solution

Created a **shared utility function** (`src/lib/template-features.ts`) that automatically determines which features should be enabled based on the template's database configuration.

## How It Works

### Automatic Feature Detection

The `getTemplateFeatures()` function reads the template's configuration and automatically enables/disables features:

| Feature              | Detection Rule                                                                   |
| -------------------- | -------------------------------------------------------------------------------- |
| **Asset Selection**  | Enabled if `repeatable_field_name` is set (not null)                             |
| **Checklist**        | Enabled if `text_note` is in `evidence_types` (and not `yes_no_checklist`)       |
| **Yes/No Checklist** | Enabled if `yes_no_checklist` is in `evidence_types`                             |
| **Pass/Fail**        | Enabled if `pass_fail` is in `evidence_types`                                    |
| **Temperature Logs** | Enabled if `temperature` is in `evidence_types`                                  |
| **Photo Evidence**   | Enabled if `photo` is in `evidence_types`                                        |
| **Monitor/Callout**  | Auto-enabled if `temperature` OR `pass_fail` OR `triggers_contractor_on_failure` |

### Template Configuration → Features

When you create a template in the database, set these fields correctly and features will be automatically enabled:

```sql
-- Example: Temperature template with monitoring
INSERT INTO task_templates (
  name,
  evidence_types,           -- ['temperature', 'photo']
  repeatable_field_name,    -- 'fridge_name' (triggers asset selection)
  triggers_contractor_on_failure,  -- TRUE (enables monitor/callout)
  ...
) VALUES (
  'Fridge Temperature Check',
  ARRAY['temperature', 'photo'],  -- Auto-enables: tempLogs, photoEvidence, monitorCallout
  'fridge_name',                  -- Auto-enables: assetSelection
  TRUE,                           -- Auto-enables: monitorCallout
  ...
);
```

### Features → Template Configuration

When saving a template via `MasterTemplateModal`, the `featuresToEvidenceTypes()` function converts features back to `evidence_types`:

```typescript
// User enables features in UI
const features = {
  tempLogs: true,
  photoEvidence: true,
  passFail: true,
};

// Automatically converts to evidence_types
const evidenceTypes = featuresToEvidenceTypes(features);
// Returns: ['temperature', 'photo', 'pass_fail']
```

## Usage

### In Components

Both `TaskFromTemplateModal` and `MasterTemplateModal` now use the shared utility:

```typescript
import { getTemplateFeatures } from "@/lib/template-features";

// Automatically determine features from template
const enabledFeatures = getTemplateFeatures(template);

// Features are now correctly enabled/disabled
if (enabledFeatures.assetSelection) {
  // Show asset selection UI
}
if (enabledFeatures.tempLogs) {
  // Show temperature logging UI
}
```

### When Creating Templates

**For templates with asset selection:**

```sql
-- Set repeatable_field_name to enable asset selection
repeatable_field_name = 'fridge_name'  -- Shows asset selection
```

**For templates WITHOUT asset selection:**

```sql
-- Set repeatable_field_name to NULL
repeatable_field_name = NULL  -- Hides asset selection
```

**For templates with call points (like fire alarm):**

```sql
-- Use NULL for repeatable_field_name (no asset selection)
-- But add template_repeatable_labels for call points
-- And create a select field that references them
repeatable_field_name = NULL
-- Then add labels:
INSERT INTO template_repeatable_labels (template_id, label, ...)
-- And create select field:
INSERT INTO template_fields (field_name, field_type, ...)
VALUES ('fire_alarm_call_point', 'select', ...)
```

## Benefits

1. **Consistency**: All templates use the same logic to determine features
2. **No Manual Configuration**: Features are automatically enabled based on database config
3. **Single Source of Truth**: Template configuration in database drives UI features
4. **Easy to Add Templates**: Just set the right database fields and features work automatically
5. **Maintainable**: Changes to feature logic only need to be made in one place

## Migration Guide

### Old Way (Manual)

```typescript
// Had to manually check each feature
const enabledFeatures = {
  checklist: evidenceTypes.includes("text_note"),
  passFail: evidenceTypes.includes("pass_fail"),
  // ... manually configured for each template
};
```

### New Way (Automatic)

```typescript
// Automatically determined from template config
const enabledFeatures = getTemplateFeatures(template);
```

## Testing

To verify features are working correctly:

1. **Check database template config**:

   ```sql
   SELECT name, evidence_types, repeatable_field_name, triggers_contractor_on_failure
   FROM task_templates
   WHERE slug = 'your_template_slug';
   ```

2. **Load template in UI**:
   - Open `TaskFromTemplateModal` with the template
   - Check console logs: `Template evidence_types:` and `Enabled features:`
   - Verify UI shows/hides features correctly

3. **Verify feature mapping**:
   - `repeatable_field_name = NULL` → Asset selection hidden
   - `evidence_types = ['temperature']` → Temperature logs enabled
   - `triggers_contractor_on_failure = TRUE` → Monitor/callout enabled

## Future Templates

When adding new templates, follow this checklist:

- [ ] Set `evidence_types` array correctly (temperature, photo, pass_fail, text_note, etc.)
- [ ] Set `repeatable_field_name` to NULL if no asset selection needed
- [ ] Set `repeatable_field_name` to field name if asset selection needed
- [ ] Set `triggers_contractor_on_failure = TRUE` if contractor callouts needed
- [ ] Add `template_repeatable_labels` if using select dropdowns (like fire alarm call points)
- [ ] Features will be automatically enabled - no manual configuration needed!

## Files Changed

1. **Created**: `src/lib/template-features.ts` - Shared utility for feature detection
2. **Updated**: `src/components/templates/TaskFromTemplateModal.tsx` - Uses shared utility
3. **Updated**: `src/components/templates/MasterTemplateModal.tsx` - Uses shared utility
