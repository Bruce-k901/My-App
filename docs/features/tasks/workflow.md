# Custom Template Builder Workflow

This document describes the custom template builder workflow, including how templates are created, configured, and used to generate tasks.

## Overview

The template system consists of three main components:

1. **Template Builder** (`MasterTemplateModal`) - Creates/edits template definitions
2. **Task Configuration** (`TaskFromTemplateModal`) - Configures templates for specific sites with checklist items
3. **Task Generation** (`generate-daily-tasks` edge function) - Creates task instances from configurations

## Data Flow

```
task_templates (Template Definition)
       │
       ▼
site_checklists (Site Configuration)
       │
       ▼
checklist_tasks (Task Instances)
```

## Key Tables

### task_templates

Stores the template definitions:

- `id` - Unique identifier
- `name` - Template name
- `slug` - URL-safe identifier (unique per company)
- `company_id` - Owner company
- `site_id` - Optional site restriction
- `evidence_types` - Array of feature types (e.g., `['text_note', 'photo']`)
- `recurrence_pattern` - JSON object containing:
  - `daypart_times` - Scheduled times
  - `default_checklist_items` - Pre-defined checklist items
  - `weeklyDays`, `monthlyDay`, `annualDate` - Scheduling options
- `is_active` - **Set to `false` for custom templates** (prevents old cron from auto-creating tasks)
- `is_template_library` - `false` for user-created, `true` for library templates

### site_checklists

Stores site-specific configurations:

- `template_id` - Links to task_templates
- `site_id` - Target site
- `equipment_config` - Selected assets/equipment
- `daypart_times` - Site-specific times
- `active` - Whether this configuration is active

### checklist_tasks

Individual task instances:

- `template_id` - Links to task_templates
- `site_checklist_id` - Links to site_checklists (for recurring tasks)
- `task_data` - JSON containing:
  - `checklistItems` - Array of `{ text, completed }` objects
  - `yesNoChecklistItems` - Array of `{ text, answer }` objects
  - `temperatures`, `photos`, etc.

## Feature Mapping

Features are stored as `evidence_types` in the database:

| UI Feature       | evidence_types Value |
| ---------------- | -------------------- |
| Checklist        | `text_note`          |
| Yes/No Checklist | `yes_no_checklist`   |
| Pass/Fail        | `pass_fail`          |
| Temperature Logs | `temperature`        |
| Photo Evidence   | `photo`              |

### Feature Detection Logic

When loading a template for editing, `getTemplateFeatures()` detects features:

```typescript
// From src/lib/template-features.ts
checklist: hasTextNote && !hasYesNoChecklist, // Only if text_note present AND yes_no_checklist absent
yesNoChecklist: evidenceTypes.includes('yes_no_checklist'),
passFail: evidenceTypes.includes('pass_fail'),
tempLogs: evidenceTypes.includes('temperature'),
photoEvidence: evidenceTypes.includes('photo'),
```

## Workflow Steps

### 1. Create Template (MasterTemplateModal)

1. User opens Template Builder from My Templates page
2. User configures:
   - Template name
   - Frequency and scheduling
   - Features (checklist, photo evidence, etc.)
   - Site assignment
3. On save:
   - Template is created with `is_active: false` and `is_template_library: false`
   - `evidence_types` array is populated based on selected features
   - User is redirected to configure the template for their site

### 2. Configure Template (TaskFromTemplateModal)

1. User clicks on template card in My Templates
2. User can:
   - Rename the task
   - Add checklist items (if checklist feature enabled)
   - Select assets/equipment
   - Set specific times
3. On save:
   - `site_checklists` record is created/updated
   - **NEW**: Checklist items are saved back to template's `recurrence_pattern.default_checklist_items`
   - This ensures future tasks get the same items

### 3. Task Generation (generate-daily-tasks Edge Function)

The cron function runs daily and:

1. Queries `site_checklists` for active configurations
2. For each configuration:
   - Checks if task already exists for today
   - Reads `default_checklist_items` from template's `recurrence_pattern`
   - Creates `checklist_tasks` record with items in `task_data`

## Important Flags

### is_active

- **Custom templates**: Set to `false` to prevent the old cron from auto-creating tasks
- The edge function uses `site_checklists.active` instead

### is_template_library

- `false` - User-created templates (shown in My Templates)
- `true` - Library templates (shown in Template Library)

## Common Issues & Solutions

### Templates Not Appearing in My Templates

**Issue**: Query was filtering by `is_active: true`
**Solution**: Removed the filter since custom templates have `is_active: false`

### Checklist Feature Missing When Reopening Template

**Issue**: `evidence_types` may not include `text_note`
**Debug**: Check browser console for logs:

```
📋 Loading template for editing: { evidence_types: [...] }
```

### Tasks Created Without Checklist Items

**Issue**: Items weren't being saved to template's `recurrence_pattern.default_checklist_items`
**Solution**: Added code in `TaskFromTemplateModal` to save items back to template

## File Locations

- Template Builder: `src/components/templates/MasterTemplateModal.tsx`
- Task Configuration: `src/components/templates/TaskFromTemplateModal.tsx`
- Feature Utilities: `src/lib/template-features.ts`
- My Templates Page: `src/app/dashboard/my_templates/page.tsx`
- Task Generation: `supabase/functions/generate-daily-tasks/index.ts`

## Debug Logging

Both modals include console logging to help diagnose issues:

### MasterTemplateModal

```javascript
// When loading template
📋 Loading template for editing: { templateId, evidence_types, detectedFeatures }

// When saving template
💾 Saving template with features: { selectedFeatures, evidenceTypes }
```

### TaskFromTemplateModal

```javascript
// When loading checklist items
📋 Found default_checklist_items: { isArray, count, items }

// When saving checklist items to template
✅ Saved default_checklist_items to template: [...]
```

## Future Improvements

1. Add ability to edit default checklist items directly in MasterTemplateModal
2. Allow copying templates between sites
3. Add template version history
