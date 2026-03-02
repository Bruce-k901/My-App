# Codebase Complexity Analysis - Cross-References

Generated: 2025-02-04

## 1. Components Using `task_templates` Table

### Frontend Components (React/TypeScript)

**Primary Components:**

- `src/components/templates/MasterTemplateModal.tsx` - Creates/edits templates
- `src/components/templates/TaskFromTemplateModal.tsx` - Creates tasks from templates
- `src/components/checklists/TaskCompletionModal.tsx` - Uses template data for completion
- `src/components/checklists/TaskCard.tsx` - Displays task with template info
- `src/components/checklists/CompletedTaskCard.tsx` - Shows completed task with template

**Page Components:**

- `src/app/dashboard/tasks/templates/page.tsx` - Templates list page
- `src/app/dashboard/checklists/page.tsx` - Today's tasks (uses templates)
- `src/app/dashboard/tasks/completed/page.tsx` - Completed tasks page
- `src/app/dashboard/tasks/active/page.tsx` - Active tasks page
- `src/app/dashboard/tasks/compliance/page.tsx` - Compliance templates
- `src/app/dashboard/tasks/my-tasks/page.tsx` - User's tasks

**Compliance Components (Legacy):**

- `src/components/compliance/TemperatureCheckTemplate.tsx`
- `src/components/compliance/ProbeCalibrationTemplate.tsx`
- `src/components/compliance/PATTestingTemplate.tsx`
- `src/components/compliance/HotHoldingTemplate.tsx`
- `src/components/compliance/FireAlarmTestTemplate.tsx`
- `src/components/compliance/ExtractionServiceTemplate.tsx`
- `src/components/compliance/EmergencyLightingTemplate.tsx`

### Backend/Server Components

- `supabase/functions/generate-daily-tasks/index.ts` - Edge function that reads templates and creates tasks
- `src/app/api/compliance/import-templates/route.ts` - API route for importing templates

### Database Files

- `supabase/migrations/001_create_checklist_schema.sql` - Creates task_templates table
- `supabase/migrations/001_create_task_template_schema.sql` - Alternative schema
- `supabase/migrations/20250202000003_setup_task_generation_cron.sql` - Cron job SQL function
- Multiple seed/migration files for template data

**Total Files Using `task_templates`: 79 files**

---

## 2. MasterTemplateModal → Task Instances Connection

### Flow Diagram

```
MasterTemplateModal
    ↓ (saves to)
task_templates table
    ↓ (read by)
generate-daily-tasks (Edge Function/Cron)
    ↓ (creates)
checklist_tasks table
    ↓ (displayed in)
Today's Tasks Page
```

### Detailed Connection Points

**1. MasterTemplateModal → task_templates**

- **File**: `src/components/templates/MasterTemplateModal.tsx`
- **Action**: `handleSave()` function (lines ~400-600)
- **Saves**:
  - Template configuration (name, description, category)
  - Scheduling (frequency, dayparts, recurrence_pattern)
  - Evidence types (converted from feature flags)
  - Assignment settings (role, user, site, asset)
  - Instructions and repeatable field config
- **Does NOT directly create task instances**

**2. task_templates → Task Generation**

- **File**: `supabase/functions/generate-daily-tasks/index.ts`
- **File**: `supabase/migrations/20250202000003_setup_task_generation_cron.sql`
- **Process**:
  1. Reads `task_templates` where `frequency = 'daily'` and `is_active = true`
  2. For each template, creates `checklist_tasks` records
  3. Handles multiple dayparts by creating separate task instances
  4. Handles multiple times per daypart
  5. Runs daily at 3 AM UTC via `pg_cron`

**3. Task Instance Creation Details**

- **Table Used**: `checklist_tasks` (NOT `task_instances` - that table exists in migrations but isn't used)
- **Fields Copied from Template**:
  - `template_id` → References template
  - `due_date` → Set to today's date
  - `due_time` → From template's `daypart_times` or `time_of_day`
  - `daypart` → Set per instance
  - `priority` → From template's `is_critical` flag
  - `assigned_to_role` → Copied from template
  - `site_id` → Copied from template (or all sites if null)

**4. Task Instances → Frontend Display**

- **Files**:
  - `src/app/dashboard/checklists/page.tsx` - Shows today's tasks
  - `src/components/checklists/TaskCard.tsx` - Individual task card
  - `src/components/checklists/TaskCompletionModal.tsx` - Task completion UI

### Key Finding: No Direct Connection

- `MasterTemplateModal` does NOT directly create `checklist_tasks`
- Task instances are created by automated cron job or edge function
- Connection is indirect: Template → Database → Cron → Task Instances

---

## 3. Files Importing from `@/lib/supabase`

**Total Files: 160 files**

### Category Breakdown

**Task/Checklist Related (12 files)**

- `src/components/templates/MasterTemplateModal.tsx`
- `src/components/templates/TaskFromTemplateModal.tsx`
- `src/components/checklists/TaskCompletionModal.tsx`
- `src/components/checklists/TaskCard.tsx`
- `src/components/checklists/CompletedTaskCard.tsx`
- `src/app/dashboard/checklists/page.tsx`
- `src/app/dashboard/tasks/completed/page.tsx`
- `src/app/dashboard/tasks/templates/page.tsx`
- `src/app/dashboard/tasks/compliance/page.tsx`
- `src/app/dashboard/tasks/active/page.tsx`
- `src/app/dashboard/tasks/my-tasks/page.tsx`
- `src/app/api/compliance/import-templates/route.ts`

**Library Management (10 files)**

- `src/app/dashboard/libraries/appliances/page.tsx`
- `src/app/dashboard/libraries/chemicals/ChemicalsClient.tsx`
- `src/app/dashboard/libraries/disposables/page.tsx`
- `src/app/dashboard/libraries/drinks/page.tsx`
- `src/app/dashboard/libraries/equipment/page.tsx`
- `src/app/dashboard/libraries/glassware/page.tsx`
- `src/app/dashboard/libraries/ingredients/page.tsx`
- `src/app/dashboard/libraries/packaging/page.tsx`
- `src/app/dashboard/libraries/ppe/page.tsx`
- `src/app/dashboard/libraries/serving-equipment/page.tsx`

**Assets & Sites (15 files)**

- `src/components/assets/AssetCard.tsx`
- `src/components/assets/AssetForm.tsx`
- `src/components/assets/AssetModal.tsx`
- `src/components/assets/AssetTable.tsx`
- `src/components/sites/SiteFormBase.tsx`
- `src/components/sites/SiteToolbar.tsx`
- `src/app/dashboard/assets/page.tsx`
- `src/app/dashboard/sites/page.tsx`
- `src/lib/fetchAssets.ts`
- And more...

**Compliance & SOPs (10 files)**

- `src/components/compliance/TemperatureCheckTemplate.tsx`
- `src/components/compliance/ProbeCalibrationTemplate.tsx`
- `src/app/dashboard/sops/closing-template/page.tsx`
- `src/app/dashboard/sops/opening-template/page.tsx`
- And more...

**Context & Hooks (8 files)**

- `src/context/AppContext.tsx`
- `src/hooks/usePPMRealtime.ts`
- `src/hooks/useData.ts`
- `src/hooks/useIngredientsLibrary.ts`
- And more...

**Dashboard Components (12 files)**

- `src/components/dashboard/ManagerDashboard.tsx`
- `src/components/dashboard/AdminDashboard.tsx`
- `src/components/dashboard/AlertsFeed.tsx`
- And more...

**Utilities & Helpers (5 files)**

- `src/lib/supabaseHelpers.ts`
- `src/lib/auth.ts`
- `src/lib/authHelpers.ts`
- And more...

**Reports & Logs (6 files)**

- `src/app/reports/temperature/page.tsx`
- `src/app/reports/incidents/page.tsx`
- `src/app/logs/temperature/page.tsx`
- And more...

**Remaining 82 files** - Various other features (users, organizations, incidents, contractors, etc.)

### Dependency Analysis

- **High Centralization**: `@/lib/supabase` is the single source for all database operations
- **Wide Usage**: Used in 160 files across the entire application
- **No Alternative**: No other database client imports found

---

## 4. `evidence_types` Usage Across Application

**Total Files: 39 files**

### Primary Usage Locations

**1. Template Creation/Editing**

- **File**: `src/components/templates/MasterTemplateModal.tsx`
  - **Lines**: 161-165, 405-410, 521
  - **Purpose**: Converts feature flags to evidence_types array
  - **Mapping**:
    - `tempLogs` → `'temperature'`
    - `photoEvidence` → `'photo'`
    - `passFail` → `'pass_fail'`
    - `yesNoChecklist` → `'yes_no_checklist'`
    - `checklist` → `'text_note'`

**2. Task Completion UI**

- **File**: `src/components/checklists/TaskCompletionModal.tsx`
  - **Lines**: 1404, 2070, 2075, 2317
  - **Purpose**: Conditionally renders UI sections based on evidence_types
  - **Usage**:
    - Determines workflow type (measurement vs simple_confirm)
    - Shows/hides temperature input fields
    - Controls asset selection visibility

**3. Type Definitions**

- **File**: `src/types/checklist.ts`
  - **Line**: 32
  - **Type**: `evidence_types: string[]`

**4. Database Schema**

- **Files**: Multiple migration files
  - `supabase/migrations/001_create_checklist_schema.sql` (line 44)
  - `supabase/migrations/001_create_task_template_schema.sql` (line 51)
  - `supabase/sql/create_task_templates_table.sql` (line 34)
- **Definition**: `TEXT[] DEFAULT '{}'` or `ARRAY[]::TEXT[]`

**5. Compliance Templates**

- **Files**: Multiple compliance component files
  - `src/components/compliance/TemperatureCheckTemplate.tsx`
  - `src/components/compliance/ProbeCalibrationTemplate.tsx`
  - And 5 more compliance components
- **Purpose**: Hardcoded evidence_types for specific compliance templates

**6. Seed Data**

- **Files**: Migration files seeding templates
  - `supabase/migrations/20250202000001_add_sfbb_temperature_template.sql`
  - `supabase/migrations/20250202000002_add_fridge_freezer_temperature_template.sql`
  - `supabase/migrations/20250204000001_add_hot_holding_temperature_template.sql`
- **Purpose**: Sets evidence_types when seeding compliance templates

### Evidence Types Values

Based on code analysis, valid values are:

- `'temperature'` - Temperature logging
- `'photo'` - Photo evidence
- `'pass_fail'` - Pass/fail checkbox
- `'yes_no_checklist'` - Yes/No checklist items
- `'text_note'` - Text notes/checklist
- `'signature'` - Signature capture (mentioned in comments)

### Usage Pattern

```typescript
// Check if template requires temperature evidence
if (template.evidence_types?.includes("temperature")) {
  // Show temperature input fields
}

// Check multiple evidence types
const hasPhoto = template.evidence_types?.includes("photo");
const hasNotes = template.evidence_types?.includes("text_note");
```

### Impact Analysis

- **High Coupling**: Evidence types directly control UI rendering
- **Template-Driven UI**: The entire task completion experience is driven by evidence_types
- **No Runtime Validation**: No TypeScript enum or constant for valid values
- **Scalability**: Adding new evidence types requires changes in multiple files

---

## Summary Statistics

| Metric                             | Count                             |
| ---------------------------------- | --------------------------------- |
| Files using `task_templates`       | 79                                |
| Files importing `@/lib/supabase`   | 160                               |
| Files using `evidence_types`       | 39                                |
| Components creating templates      | 1 (MasterTemplateModal)           |
| Components creating task instances | 1 (generate-daily-tasks function) |
| Components displaying tasks        | 8+                                |

---

## Complexity Insights

### High Complexity Areas

1. **Template → Task Generation Flow**
   - Indirect connection through cron job
   - Multiple dayparts/times handled in generation logic
   - No direct UI for manual task creation from template

2. **Evidence Types System**
   - Used throughout UI for conditional rendering
   - No centralized validation or constants
   - Hardcoded in multiple places

3. **Supabase Client Dependency**
   - 160 files depend on single import
   - High coupling to database client
   - No abstraction layer

### Recommendations

1. **Create Evidence Types Constants**

   ```typescript
   // src/constants/evidenceTypes.ts
   export const EVIDENCE_TYPES = {
     TEMPERATURE: "temperature",
     PHOTO: "photo",
     PASS_FAIL: "pass_fail",
     YES_NO_CHECKLIST: "yes_no_checklist",
     TEXT_NOTE: "text_note",
     SIGNATURE: "signature",
   } as const;
   ```

2. **Add Direct Task Creation UI**
   - Allow manual task creation from template
   - Bypass cron job for immediate needs

3. **Abstract Database Access**
   - Create repository pattern or service layer
   - Reduce direct Supabase dependencies

---

_Analysis completed: 2025-02-04_
