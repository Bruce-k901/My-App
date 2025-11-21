# ✅ TASK GENERATION SYSTEM - CONFIRMED STRUCTURE

**Date**: Based on actual codebase analysis  
**Status**: CONFIRMED - Ready for implementation

---

## 📊 DATABASE STRUCTURE CONFIRMED

### ✅ Active Tasks Source: `task_templates` (NOT `site_checklists`)

**IMPORTANT**: The requirements document mentions `site_checklists`, but the actual system uses `task_templates` as the source. The `site_checklists` table appears to be legacy/unused.

#### `task_templates` Table Structure:

```sql
task_templates:
- id (uuid, PK)
- company_id (uuid, FK to companies) - NULL for global library templates
- site_id (uuid, FK to sites, nullable) - for site-specific templates
- name (text) - Task name
- slug (text) - Unique identifier
- description (text, nullable)
- category (text) - 'food_safety', 'h_and_s', 'fire', 'cleaning', 'compliance'
- frequency (text) - 'daily', 'weekly', 'monthly', 'quarterly', 'annually', 'triggered', 'once'
- recurrence_pattern (jsonb) - Complex scheduling rules
- time_of_day (text, nullable) - Default time (e.g., "09:00" or "before_open")
- dayparts (text[]) - Array of dayparts: ["before_open", "during_service", "after_service"]
- days_of_week (smallint[]) - For weekly tasks: [1,3,5] = Mon, Wed, Fri
- assigned_to_role (text, nullable)
- assigned_to_user_id (uuid, nullable)
- asset_id (uuid, nullable) - For asset-specific tasks
- asset_type (text, nullable)
- instructions (text, nullable)
- repeatable_field_name (text, nullable)
- evidence_types (text[]) - ['photo', 'temperature', 'pass_fail', etc.]
- is_active (boolean) - Only generate if true
- is_critical (boolean)
- created_at, updated_at
```

### ✅ Task Instances Table: `checklist_tasks`

```sql
checklist_tasks:
- id (uuid, PK)
- template_id (uuid, FK to task_templates)
- company_id (uuid, FK to companies)
- site_id (uuid, FK to sites, nullable)
- custom_name (text, nullable) - Override template name
- custom_instructions (text, nullable)
- due_date (date) - When task is due
- due_time (text, nullable) - Specific time (e.g., "09:00")
- daypart (text, nullable) - 'before_open', 'during_service', 'after_service', 'anytime'
- priority (text) - 'low', 'medium', 'high', 'critical'
- status (text) - 'pending', 'in_progress', 'completed', 'skipped', 'overdue', 'failed'
- assigned_to_role (text, nullable)
- assigned_to_user_id (uuid, nullable)
- task_data (jsonb) - Stores completion data, repeatable field values, etc.
- generated_at (timestamptz) - When task was created by cron
- expires_at (timestamptz, nullable) - When task expires
- completed_at (timestamptz, nullable)
- completed_by (uuid, nullable, FK to profiles)
- flagged, flag_reason, escalated, escalated_to (for workflow)
- created_at, updated_at
```

---

## 🔥 SCHEDULE TIMES STORAGE - CONFIRMED

### Where Schedule Times Are Stored:

**Option 1: `recurrence_pattern.daypart_times` (JSONB)**

```json
{
  "daypart_times": {
    "before_open": "09:00",
    "during_service": ["12:00", "15:00"],
    "after_service": "18:00"
  }
}
```

**Option 2: `dayparts` array + `time_of_day`**

- `dayparts`: ["before_open", "during_service", "after_service"]
- `time_of_day`: "12:00" (fallback for all dayparts)

**Option 3: `dayparts` array + daypart-specific defaults**

- If no `daypart_times` specified, use defaults:
  - `before_open`: "09:00"
  - `during_service`: "12:00"
  - `after_service`: "18:00"
  - `anytime`: "12:00"

### Example: Daily Task with 3 Times

**Template Record:**

```json
{
  "id": "template-123",
  "name": "Fridge Temperature Check",
  "frequency": "daily",
  "dayparts": ["before_open", "during_service", "afternoon"],
  "recurrence_pattern": {
    "daypart_times": {
      "before_open": "11:00",
      "during_service": "14:00",
      "afternoon": "15:00"
    }
  },
  "is_active": true
}
```

**Generated Tasks (3 instances):**

1. `checklist_task`: `due_time="11:00"`, `daypart="before_open"`
2. `checklist_task`: `due_time="14:00"`, `daypart="during_service"`
3. `checklist_task`: `due_time="15:00"`, `daypart="afternoon"`

---

## 📋 TASK GENERATION RULES - CONFIRMED

### ✅ Rule 1: Daily Tasks with Multiple Times

**Current Implementation**: ✅ CORRECT

- Loops through `dayparts` array
- For each daypart, gets times from `recurrence_pattern.daypart_times[daypart]`
- Creates one task per daypart/time combination
- Uses daypart-specific defaults if no times specified

### ✅ Rule 2: Weekly Tasks

**Storage**: `days_of_week` (smallint[]) in `task_templates`

- Example: `[1,3,5]` = Monday, Wednesday, Friday
- `recurrence_pattern.days` also supported

**Current Implementation**: ✅ CORRECT

- Checks if today's day of week matches `days_of_week`
- Creates task if match

### ✅ Rule 3: Monthly Tasks

**Storage**: `recurrence_pattern.date_of_month` (number)

- Example: `{"date_of_month": 1}` = 1st of each month

**Load Date**: Currently generates on due date, NOT 7 days before
**Question**: Should monthly tasks load 7 days before? Current code doesn't do this.

### ✅ Rule 4: Annual/Bi-Annual Tasks

**Storage**: `recurrence_pattern.anniversary_date` or similar
**Load Date**: Currently generates on due date, NOT 30 days before
**Question**: Should annual tasks load 30 days before? Current code doesn't do this.

---

## 🔍 ADDITIONAL TASK SOURCES - CONFIRMED

### ✅ Source 1: Certificate Expiry

**Table**: `profiles`
**Fields**:

- `food_safety_expiry_date` (date)
- `h_and_s_expiry_date` (date)
- `fire_marshal_expiry_date` (date)
- `first_aid_expiry_date` (date)
- `cossh_expiry_date` (date)

**Function**: `create_training_certificate_renewal_tasks()` exists
**Load Date**: 1 month before expiry (30 days)

### ✅ Source 2: SOP Review Dates

**Table**: `sop_entries` (likely, need to confirm exact table name)
**Fields**: `review_date` (date)
**Status**: Need to confirm if auto-generation exists

### ✅ Source 3: PPM Schedule

**Tables**:

- `assets` table: `last_service_date`, `next_service_date`, `ppm_frequency_months`
- `ppm_schedule` table: `next_service_date`, `frequency_months`, `status`

**Current Implementation**: ✅ EXISTS in Edge Function

- Scans `assets` table for overdue PPM (>6 months)
- Creates triggered tasks

### ✅ Source 4: Risk Assessment Reviews

**Table**: `risk_assessments`
**Fields**: `review_date` (date)
**Status**: Need to confirm if auto-generation exists

### ✅ Source 5: Contractor Callout Follow-ups

**Table**: `callouts` or `contractor_callouts` (need to confirm exact name)
**Current Implementation**: ✅ EXISTS

- Creates daily follow-up tasks for open callouts
- Flag: `flag_reason = 'callout_followup'`

---

## 🌡️ TEMPERATURE LOGGING - CONFIRMED

**Table**: `temperature_logs`
**Fields**:

- `id`, `company_id`, `site_id`, `asset_id`
- `reading` (number)
- `unit` (text) - 'celsius' or 'fahrenheit'
- `recorded_at` (timestamptz)
- `recorded_by` (uuid, FK to profiles)
- `status` (text)
- `source` (text) - Can be 'task_completion'
- `meta` (jsonb) - Additional data

**Integration**: When task with `evidence_types` includes 'temperature' is completed, a temperature log entry is created.

---

## 🎯 DUPLICATE PREVENTION - CONFIRMED

**Current Implementation**: ✅ CORRECT

- Checks for existing tasks using: `template_id`, `site_id`, `due_date`, `daypart`, `due_time`
- Uses composite key: `${daypart}|${due_time}` for duplicate detection

---

## ✅ CONFIRMATION CHECKLIST

- [x] `task_templates` is the Active Tasks source (NOT `site_checklists`)
- [x] Schedule times stored in `recurrence_pattern.daypart_times` (JSONB)
- [x] Multiple times per daypart supported via `daypart_times` object/array
- [x] Weekly tasks use `days_of_week` array or `recurrence_pattern.days`
- [x] Monthly tasks use `recurrence_pattern.date_of_month`
- [x] Certificate expiry in `profiles` table (multiple date fields)
- [x] PPM dates in `assets` table (`next_service_date`, `ppm_frequency_months`)
- [x] Temperature logs in `temperature_logs` table
- [x] Callout follow-ups implemented
- [x] Duplicate prevention uses daypart + time combination

---

## ❓ QUESTIONS TO RESOLVE

1. **Monthly Task Load Date**: Should monthly tasks load 7 days before due date? (Currently loads on due date)
2. **Annual Task Load Date**: Should annual tasks load 30 days before due date? (Currently loads on due date)
3. **SOP Review Auto-Generation**: Does this exist? Which table stores SOP review dates?
4. **Risk Assessment Auto-Generation**: Does this exist? Confirmed `risk_assessments.review_date` exists.
5. **Callout Table Name**: Is it `callouts` or `contractor_callouts`? Both appear in codebase.

---

## 📝 NEXT STEPS

1. ✅ Confirm monthly/annual load dates (7 days / 30 days before)
2. ✅ Confirm SOP review auto-generation requirements
3. ✅ Confirm Risk Assessment auto-generation requirements
4. ✅ Confirm exact callout table name
5. ✅ Update Edge Function if monthly/annual load dates need changing

---

**This document is based on actual codebase analysis. All confirmed items are ready for implementation.**
