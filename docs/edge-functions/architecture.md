# Edge Function Architecture Guide

## Overview

The `generate-daily-tasks` Edge Function runs daily (via cron) and creates task instances in `checklist_tasks` from multiple sources.

## Architecture Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. MY TASKS (site_checklists)                               │
│    - User-configured recurring tasks                        │
│    - Daily, Weekly, Monthly, Annual                         │
│    - Multi-time support (e.g., 3x daily fridge checks)      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. SYSTEM-GENERATED TASKS                                   │
│    - PPM Overdue (from assets/ppm_schedule)                 │
│    - Certificate Expiry (from profiles)                     │
│    - SOP Review (from sop_entries)                          │
│    - RA Review (from risk_assessments)                      │
│    - Callout Follow-up (from callouts)                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Edge Function: generate-daily-tasks                         │
│ Reads from all sources above                                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Creates task instances in: checklist_tasks                  │
│ - Links to site_checklist_id (if from My Tasks)            │
│ - Links to template_id (generic templates for system tasks) │
│ - Sets due_date = today                                     │
│ - Sets status = 'pending'                                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ TODAY'S TASKS Page                                          │
│ Shows: checklist_tasks WHERE due_date = today               │
└─────────────────────────────────────────────────────────────┘
```

## Task Generation Sources

### 1. My Tasks (site_checklists) ✅ IMPLEMENTED

**Source Table**: `site_checklists`
**Frequency**: Daily, Weekly, Monthly, Annual
**Logic**:

- Daily: Creates tasks for today based on `daypart_times` or `time_of_day`
- Weekly: Creates tasks if today matches `days_of_week` array
- Monthly: Creates tasks if today's date matches `date_of_month`
- Annual: Creates tasks if today matches `anniversary_date`

**Example**:

```typescript
// Daily task with 3 times
{
  frequency: 'daily',
  daypart_times: {
    'before_open': ['07:00'],
    'during_service': ['12:00'],
    'after_service': ['17:00']
  }
}
// Creates 3 tasks for today
```

### 2. PPM Overdue ✅ IMPLEMENTED

**Source Table**: `assets` + `ppm_schedule`
**Logic**:

- Find assets where `next_service_date <= today` OR `last_service_date < 6 months ago`
- Create task using `ppm-overdue-generic` template
- Task name: `"PPM Required: {asset_name}"`

### 3. Certificate Expiry ❌ MISSING

**Source Table**: `profiles`
**Fields**:

- `food_safety_expiry_date`
- `h_and_s_expiry_date`
- `fire_marshal_expiry_date`
- `first_aid_expiry_date`
- `cossh_expiry_date`

**Logic**:

- Create tasks 30 days before expiry date
- Use `certificate-renewal-generic` template
- Task name: `"{Certificate Type} Certificate Expiring: {staff_name}"`
- Store in `task_data`: `{ source_type: 'certificate_expiry', certificate_type: 'food_safety', profile_id: '...', expiry_date: '...' }`

**Query**:

```sql
SELECT id, full_name, site_id, company_id,
  food_safety_expiry_date, h_and_s_expiry_date,
  fire_marshal_expiry_date, first_aid_expiry_date, cossh_expiry_date
FROM profiles
WHERE company_id = ?
  AND (
    food_safety_expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
    OR h_and_s_expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
    OR fire_marshal_expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
    OR first_aid_expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
    OR cossh_expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
  )
```

### 4. SOP Review ❌ MISSING

**Source Table**: `sop_entries`
**Fields**:

- `review_date` (if exists) OR calculate from `updated_at + 1 year`
- `company_id`, `site_id`

**Logic**:

- Create tasks 30 days before review date
- Use `sop-review-generic` template
- Task name: `"SOP Review Due: {sop_title} ({ref_code})"`
- Store in `task_data`: `{ source_type: 'sop_review', sop_id: '...', review_date: '...' }`

**Query**:

```sql
SELECT id, title, ref_code, company_id, site_id,
  COALESCE((sop_data->>'review_date')::date, (updated_at + INTERVAL '1 year')::date) as review_date
FROM sop_entries
WHERE company_id = ?
  AND COALESCE((sop_data->>'review_date')::date, (updated_at + INTERVAL '1 year')::date)
    BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
```

### 5. Risk Assessment Review ❌ MISSING

**Source Table**: `risk_assessments`
**Fields**: `next_review_date`, `company_id`, `site_id`, `title`, `ref_code`

**Logic**:

- Create tasks 30 days before `next_review_date`
- Use `ra-review-generic` template
- Task name: `"Risk Assessment Review Due: {title} ({ref_code})"`
- Store in `task_data`: `{ source_type: 'ra_review', ra_id: '...', review_date: '...' }`

**Query**:

```sql
SELECT id, title, ref_code, company_id, site_id, next_review_date
FROM risk_assessments
WHERE company_id = ?
  AND next_review_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
  AND status != 'Archived'
```

### 6. Callout Follow-up ✅ IMPLEMENTED

**Source Table**: `callouts` + `contractor_callouts`
**Logic**:

- Find open callouts (`status = 'open'`)
- Create task using `callout-followup-generic` template
- Task name: `"Follow up: {asset_name} Callout"`

## Generic Templates Required

These templates must exist in `task_templates` with `company_id = NULL` (global):

1. **`certificate-renewal-generic`** - For certificate expiry tasks
2. **`sop-review-generic`** - For SOP review tasks
3. **`ra-review-generic`** - For RA review tasks
4. **`ppm-overdue-generic`** - For PPM overdue tasks ✅
5. **`callout-followup-generic`** - For callout follow-up tasks ✅

## Task Creation Rules

### For site_checklists (My Tasks):

- **MUST** set `site_checklist_id` (links to configuration)
- **MUST** set `template_id` (from site_checklist)
- **MUST** set `due_time` and `daypart` for daily tasks
- **MUST** include `equipment_config` in `task_data` if present

### For System-Generated Tasks:

- **MUST NOT** set `site_checklist_id` (NULL)
- **MUST** set `template_id` (generic template)
- **MUST** set `custom_name` (descriptive task name)
- **MUST** set `task_data.source_type` (identifies source)
- **MUST** set `task_data.source_id` (links to original record)
- **SHOULD** set `due_time = null` (no specific time)

## Duplicate Prevention

### For site_checklists:

Check: `site_checklist_id + due_date + due_time`

### For System Tasks:

Check: `custom_name + site_id + due_date` OR `task_data.source_type + task_data.source_id + due_date`

## Important Notes

1. **System tasks only appear in "Today's Tasks"** - they should NOT appear in "My Tasks" page
2. **My Tasks page shows configurations** (`site_checklists`), not instances
3. **Today's Tasks page shows instances** (`checklist_tasks` WHERE `due_date = today`)
4. **All tasks created by Edge Function** should have `generated_at` timestamp set
5. **Advance loading**: Certificate/SOP/RA tasks created 30 days before due date
