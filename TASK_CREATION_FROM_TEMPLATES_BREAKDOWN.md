# Complete Breakdown: How Tasks Are Created From Templates

## Overview

The task creation system uses a **three-layer architecture**:

1. **Task Templates** - Blueprint definitions (reusable compliance templates)
2. **Site Checklists** - Site-specific configurations (how templates are configured per site)
3. **Checklist Tasks** - Actual task instances (the tasks users see and complete)

---

## Architecture Layers

### 1. Task Templates (`task_templates` table)

**Purpose**: Reusable compliance task blueprints that define:

- Task structure and requirements
- Evidence types needed (temperature, photos, checklists, etc.)
- Scheduling patterns (daily, weekly, monthly, etc.)
- Assignment rules
- Compliance standards

**Key Fields**:

```sql
- id (UUID)
- company_id (UUID) - NULL for global templates
- name, slug, description
- category (food_safety, h_and_s, fire, cleaning, compliance)
- frequency (daily, weekly, monthly, annually, triggered, once)
- dayparts (TEXT[]) - ['before_open', 'during_service', 'after_service']
- time_of_day (TEXT) - '09:00' or daypart name
- recurrence_pattern (JSONB) - Contains default_checklist_items, scheduling rules
- evidence_types (TEXT[]) - ['temperature', 'photo', 'checklist', 'pass_fail', etc.]
- instructions (TEXT) - Task steps/SOP content
- assigned_to_role, assigned_to_user_id
- asset_type, asset_id
- repeatable_field_name - For multi-record tasks (e.g., "fridge_name")
```

**Example Template**:

- **Name**: "Fridge/Freezer Temperature Check"
- **Frequency**: "daily"
- **Dayparts**: `['before_open', 'during_service', 'after_service']`
- **Evidence Types**: `['temperature', 'checklist']`
- **Repeatable Field**: "fridge_name"

---

### 2. Site Checklists (`site_checklists` table)

**Purpose**: Site-specific configurations that customize templates for a particular site. This is the **configuration layer** that bridges templates to actual tasks.

**Key Fields**:

```sql
- id (UUID)
- site_id (UUID) - Which site this configuration is for
- company_id (UUID)
- template_id (UUID) - Links to task_templates
- name (TEXT) - Custom name for this configuration
- frequency (TEXT) - daily, weekly, monthly, annually
- active (BOOLEAN) - Whether this configuration should generate tasks
- daypart_times (JSONB) - {"before_open": ["07:00"], "during_service": ["12:00"]}
- equipment_config (JSONB) - [{"assetId": "uuid", "equipment": "Fridge", "nickname": "F1"}]
- days_of_week (INTEGER[]) - [1,2,3,4,5] for weekly tasks
- date_of_month (INTEGER) - 1-31 for monthly tasks
- anniversary_date (DATE) - For annual tasks
```

**Unique Constraint**: `(site_id, template_id)` - Only one configuration per template per site

**Example Site Checklist**:

- **Template**: "Fridge/Freezer Temperature Check"
- **Site**: "Main Kitchen"
- **Daypart Times**: `{"before_open": ["07:00"], "during_service": ["12:00"], "after_service": ["17:00"]}`
- **Equipment Config**: `[{"assetId": "abc-123", "equipment": "Walk-in Fridge", "nickname": "F1"}]`
- **Frequency**: "daily"
- **Active**: true

---

### 3. Checklist Tasks (`checklist_tasks` table)

**Purpose**: The actual task instances that users see and complete. These are generated from `site_checklists` configurations.

**Key Fields**:

```sql
- id (UUID)
- template_id (UUID) - Links to task_templates
- site_checklist_id (UUID) - Links to site_checklists (for My Tasks)
- company_id, site_id
- custom_name (TEXT) - Task name
- custom_instructions (TEXT) - Task instructions
- due_date (DATE) - When task is due
- due_time (TEXT) - Specific time (e.g., "07:00")
- daypart (TEXT) - 'before_open', 'during_service', etc.
- status (TEXT) - 'pending', 'in_progress', 'completed', 'cancelled'
- priority (TEXT) - 'low', 'medium', 'high', 'critical'
- assigned_to_user_id, assigned_to_role
- task_data (JSONB) - Stores feature-specific data:
  - checklistItems: Array of checklist items
  - temperatures: Array of temperature readings
  - selectedAssets: Array of asset IDs
  - dayparts: Array of daypart configurations
  - photos, passFailStatus, etc.
- generated_at (TIMESTAMPTZ) - When task was created
- completed_at, completed_by
```

**Example Task**:

- **Custom Name**: "Fridge Temperature Check - Before Open"
- **Template**: "Fridge/Freezer Temperature Check"
- **Due Date**: "2026-01-28"
- **Due Time**: "07:00"
- **Daypart**: "before_open"
- **Task Data**: `{"temperatures": [{"assetId": "abc-123", "temp": null}], "checklistItems": [...]}`

---

## Task Creation Flow

### Path 1: Manual Task Configuration (User-Initiated)

**Location**: `src/components/templates/TaskFromTemplateModal.tsx`

**Steps**:

1. **User Opens Modal**:
   - User selects a template from Compliance or Templates page
   - `TaskFromTemplateModal` opens with `templateId`

2. **Template Loading**:

   ```typescript
   // Fetches template with all related data
   const { data: template } = await supabase
     .from("task_templates")
     .select("*, template_fields(*)")
     .eq("id", templateId)
     .single();
   ```

3. **Form Initialization**:
   - Template's `recurrence_pattern.default_checklist_items` populates checklist
   - Template's `dayparts` array populates daypart selector
   - Template's `evidence_types` determines which features are enabled
   - User can customize: name, instructions, dayparts, times, equipment selection

4. **User Fills Form**:
   - Selects site (if multi-site user)
   - Sets task name
   - Configures dayparts and times
   - Selects equipment/assets (if template requires it)
   - Adjusts checklist items
   - Sets priority

5. **Submission - Creates Site Checklist**:

   ```typescript
   // Builds site_checklist configuration
   const siteChecklistData = {
     template_id: templateId,
     company_id: companyId,
     site_id: selectedSiteId,
     name: formData.custom_name,
     frequency: template.frequency,
     active: true,
     daypart_times: daypartTimes, // {"before_open": ["07:00"], ...}
     equipment_config: equipmentConfig, // [{"assetId": "...", ...}]
     days_of_week: formData.days_of_week, // For weekly
     date_of_month: formData.date_of_month, // For monthly
     anniversary_date: formData.anniversary_date, // For annual
   };

   // Checks if configuration already exists
   const { data: existing } = await supabase
     .from("site_checklists")
     .select("id")
     .eq("site_id", selectedSiteId)
     .eq("template_id", templateId)
     .maybeSingle();

   if (existing) {
     // Updates existing configuration
     await supabase.from("site_checklists").update(siteChecklistData).eq("id", existing.id);
   } else {
     // Creates new configuration
     await supabase.from("site_checklists").insert(siteChecklistData);
   }
   ```

6. **Result**:
   - A `site_checklist` record is created/updated
   - **No task is created yet** - tasks are generated by the automated cron job
   - User is redirected to Compliance/Templates page

---

### Path 2: Automated Task Generation (Cron Job)

**Location**: `supabase/functions/generate-daily-tasks/index.ts`

**Trigger**: Runs daily via Supabase cron (typically at 3 AM)

**Process**:

#### Step 1: Fetch Active Site Checklists

```typescript
// For daily tasks
const { data: dailyConfigs } = await supabase
  .from("site_checklists")
  .select("*, task_templates(*)")
  .eq("frequency", "daily")
  .eq("active", true);
```

#### Step 2: Check If Task Already Exists

```typescript
async function taskExists(siteChecklistId, dueDate, dueTime) {
  const { data } = await supabase
    .from("checklist_tasks")
    .select("id")
    .eq("site_checklist_id", siteChecklistId)
    .eq("due_date", dueDate)
    .limit(1);

  if (dueTime) {
    query = query.eq("due_time", dueTime);
  }

  return data && data.length > 0;
}
```

#### Step 3: Create Task Instance

```typescript
async function createTask(params) {
  // 1. Build task_data from template and equipment_config
  let taskData = {};

  // 2. Populate checklist items from template
  if (params.template) {
    const recurrencePattern = params.template.recurrence_pattern;
    const defaultChecklistItems = recurrencePattern?.default_checklist_items || [];
    const evidenceTypes = params.template.evidence_types || [];

    if (evidenceTypes.includes("yes_no_checklist")) {
      taskData.yesNoChecklistItems = defaultChecklistItems.map((item) => ({
        text: item.text || item,
        answer: null,
      }));
    } else {
      taskData.checklistItems = defaultChecklistItems.map((item) =>
        typeof item === "string" ? item : item.text,
      );
    }
  }

  // 3. Populate equipment/asset data
  if (params.equipmentConfig) {
    taskData.selectedAssets = params.equipmentConfig.map((item) => item.assetId || item.id);

    // Map to repeatable field if template has one
    if (params.template?.repeatable_field_name) {
      taskData[params.template.repeatable_field_name] = params.equipmentConfig;
    }

    // Initialize temperatures if template requires temperature evidence
    if (params.template?.evidence_types?.includes("temperature")) {
      taskData.temperatures = params.equipmentConfig.map((item) => ({
        assetId: item.assetId || item.id,
        temp: null,
        nickname: item.nickname || null,
      }));
    }
  }

  // 4. Insert task into checklist_tasks
  await supabase.from("checklist_tasks").insert({
    site_checklist_id: params.siteChecklistId,
    template_id: params.templateId,
    company_id: params.companyId,
    site_id: params.siteId,
    due_date: params.dueDate, // Today's date
    due_time: params.dueTime,
    daypart: params.daypart,
    status: "pending",
    generated_at: today.toISOString(),
    task_data: taskData,
  });
}
```

#### Step 4: Handle Different Frequencies

**Daily Tasks**:

```typescript
for (const config of dailyConfigs) {
  // Multi-time tasks (SFBB temperature checks)
  if (config.daypart_times) {
    for (const [daypart, times] of Object.entries(config.daypart_times)) {
      const timeArray = Array.isArray(times) ? times : [times];
      for (const time of timeArray) {
        if (await taskExists(config.id, todayString, time)) continue;
        await createTask({
          siteChecklistId: config.id,
          templateId: config.template_id,
          companyId: config.company_id,
          siteId: config.site_id,
          dueDate: todayString,
          dueTime: time,
          daypart: daypart,
          equipmentConfig: config.equipment_config,
          template: config.task_templates
        });
      }
    }
  } else {
    // Single time task
    const time = config.task_templates?.time_of_day || '12:00';
    const daypart = config.task_templates?.dayparts?.[0] || 'anytime';
    await createTask({ ... });
  }
}
```

**Weekly Tasks**:

```typescript
const { data: weeklyConfigs } = await supabase
  .from('site_checklists')
  .select('*, task_templates(*)')
  .eq('frequency', 'weekly')
  .eq('active', true);

for (const config of weeklyConfigs) {
  const scheduledDays = config.days_of_week || [1]; // Default Monday
  const todayDayOfWeek = today.getDay(); // 0=Sunday, 6=Saturday

  if (!scheduledDays.includes(todayDayOfWeek)) continue;
  if (await taskExists(config.id, todayString, null)) continue;

  await createTask({
    dueDate: todayString,
    dueTime: null,
    daypart: 'anytime',
    ...
  });
}
```

**Monthly Tasks**:

```typescript
const todayDate = today.getDate();
for (const config of monthlyConfigs) {
  const scheduledDate = config.date_of_month || 1;
  if (todayDate !== scheduledDate) continue;
  // Create task...
}
```

**Annual Tasks**:

```typescript
for (const config of annualConfigs) {
  if (!config.anniversary_date) continue;
  const anniversaryDate = new Date(config.anniversary_date);
  const todayMonth = today.getMonth();
  const todayDay = today.getDate();

  if (todayMonth !== anniversaryDate.getMonth() || todayDay !== anniversaryDate.getDate()) continue;
  // Create task...
}
```

---

## Special Task Types (System-Generated)

The cron job also creates tasks from other sources (not from templates):

### 1. PPM Overdue Tasks

- **Source**: `assets` table where `next_service_date <= 14 days`
- **Template**: `ppm-overdue-generic`
- **Logic**: Creates tasks for assets with PPM schedules that are overdue or due soon

### 2. Certificate Expiry Tasks

- **Source**: `profiles` table (certificate expiry dates)
- **Template**: `certificate-renewal-generic`
- **Logic**: Creates tasks 30 days before certificate expiry

### 3. SOP Review Tasks

- **Source**: `sop_entries` table
- **Template**: `sop-review-generic`
- **Logic**: Creates tasks 30 days before SOP review date

### 4. Risk Assessment Review Tasks

- **Source**: `risk_assessments` table
- **Template**: `ra-review-generic`
- **Logic**: Creates tasks 30 days before RA review date

### 5. Document Expiry Tasks

- **Source**: `global_documents` table
- **Template**: `document-review-generic`
- **Logic**: Creates tasks 30 days before document expiry

### 6. Callout Follow-up Tasks

- **Source**: `callouts` table where `status = 'open'`
- **Template**: `callout-followup-generic`
- **Logic**: Creates follow-up tasks for open callouts

### 7. Messaging Tasks

- **Source**: `tasks` table (from messaging module)
- **Template**: `messaging-task-generic`
- **Logic**: Syncs messaging module tasks to checklist_tasks

**Note**: These system-generated tasks have `site_checklist_id = NULL` and use generic templates.

---

## Task Data Structure

The `task_data` JSONB field stores feature-specific data:

```typescript
{
  // Checklist items
  checklistItems: [
    { text: "Check temperature", completed: false },
    { text: "Record reading", completed: false }
  ],

  // Yes/No checklist
  yesNoChecklistItems: [
    { text: "Is equipment clean?", answer: null },
    { text: "Is equipment functioning?", answer: null }
  ],

  // Temperature logs
  temperatures: [
    {
      assetId: "abc-123",
      temp: 4.5,
      nickname: "F1",
      temp_min: 0,
      temp_max: 5
    }
  ],

  // Selected assets
  selectedAssets: ["abc-123", "def-456"],

  // Repeatable field (e.g., for multi-fridge tasks)
  fridge_name: [
    { assetId: "abc-123", equipment: "Walk-in Fridge", nickname: "F1" }
  ],

  // Dayparts (for multi-daypart tasks)
  dayparts: [
    { daypart: "before_open", due_time: "07:00" },
    { daypart: "during_service", due_time: "12:00" }
  ],

  // Photos
  photos: [
    { url: "https://...", fileName: "photo1.jpg" }
  ],

  // Pass/Fail
  passFailStatus: "pass" | "fail",

  // Source tracking (for system-generated tasks)
  source_type: "ppm_overdue" | "certificate_expiry" | "sop_review" | ...,
  source_id: "uuid-of-source-record"
}
```

---

## Key Differences: Manual vs Automated

| Aspect             | Manual Creation                | Automated Generation          |
| ------------------ | ------------------------------ | ----------------------------- |
| **What's Created** | `site_checklist` configuration | `checklist_tasks` instances   |
| **When**           | User clicks "Create Task"      | Daily cron job (3 AM)         |
| **Frequency**      | One-time action                | Continuous (daily)            |
| **User Action**    | Required                       | Automatic                     |
| **Result**         | Configuration saved            | Tasks appear in Today's Tasks |

---

## Multi-Daypart Tasks

For templates with multiple dayparts (e.g., SFBB temperature checks):

1. **Template Definition**:
   - `dayparts: ['before_open', 'during_service', 'after_service']`

2. **Site Checklist Configuration**:
   - `daypart_times: {"before_open": ["07:00"], "during_service": ["12:00"], "after_service": ["17:00"]}`

3. **Task Generation**:
   - Creates **one task per daypart per time**
   - Each task has its own `due_time` and `daypart`
   - All tasks share the same `site_checklist_id` and `template_id`

4. **Display**:
   - **Active Tasks Page**: Shows 1 task (grouped by template)
   - **Today's Tasks Page**: Shows 3 instances (one per daypart)

---

## Database Relationships

```
task_templates (1) ──< (many) site_checklists (1) ──< (many) checklist_tasks
     │                                                      │
     └──────────────────────────────────────────────────────┘
                    (direct reference via template_id)
```

- **One template** can have **many site_checklists** (one per site)
- **One site_checklist** can generate **many checklist_tasks** (one per day)
- **Tasks** also reference **templates directly** via `template_id`

---

## Summary

1. **Templates** define reusable task blueprints
2. **Site Checklists** configure templates for specific sites
3. **Tasks** are generated daily from active site_checklists
4. **Manual creation** creates configurations, not tasks
5. **Automated generation** creates actual task instances
6. **System tasks** are created from other sources (PPM, certificates, etc.)

The system ensures:

- ✅ No duplicate tasks (checks before creating)
- ✅ Tasks are site-specific
- ✅ Tasks inherit template features (checklists, temperatures, etc.)
- ✅ Tasks can be customized per site (equipment, times, dayparts)
- ✅ Tasks are generated automatically on schedule
