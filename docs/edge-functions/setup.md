# Complete Edge Function Setup Guide

## Overview

The `generate-daily-tasks` Edge Function runs daily (via cron at 3am) and creates task instances in `checklist_tasks` from multiple sources.

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────┐
│ SOURCE 1: My Tasks (site_checklists)                        │
│ - User-configured recurring tasks                           │
│ - Daily, Weekly, Monthly, Annual                            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ SOURCE 2-6: System-Generated Tasks                          │
│ - PPM Overdue (assets/ppm_schedule)                         │
│ - Certificate Expiry (profiles)                             │
│ - SOP Review (sop_entries)                                  │
│ - RA Review (risk_assessments)                              │
│ - Callout Follow-up (callouts)                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Edge Function: generate-daily-tasks                         │
│ Creates: checklist_tasks instances                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Today's Tasks Page                                          │
│ Shows: checklist_tasks WHERE due_date = today               │
└─────────────────────────────────────────────────────────────┘
```

## Task Generation Sources

### 1. My Tasks (site_checklists) ✅

**What it does**: Reads user-configured task configurations from `site_checklists` and creates task instances.

**How it works**:

- **Daily**: Creates tasks for today based on `daypart_times` (e.g., 3 fridge checks at 07:00, 12:00, 17:00)
- **Weekly**: Creates tasks if today matches `days_of_week` array (e.g., [1,3,5] = Mon, Wed, Fri)
- **Monthly**: Creates tasks if today's date matches `date_of_month` (e.g., 1st of month)
- **Annual**: Creates tasks if today matches `anniversary_date`

**Example Configuration**:

```json
{
  "frequency": "daily",
  "daypart_times": {
    "before_open": ["07:00"],
    "during_service": ["12:00"],
    "after_service": ["17:00"]
  },
  "equipment_config": [
    { "assetId": "uuid-1", "equipment": "Fridge", "nickname": "F1" },
    { "assetId": "uuid-2", "equipment": "Freezer", "nickname": "F2" }
  ]
}
```

**Result**: Creates 3 tasks today (one for each time)

---

### 2. PPM Overdue ✅

**What it does**: Creates tasks for assets that need PPM (Planned Preventative Maintenance).

**Source**: `assets` table
**Logic**:

- Asset has `next_service_date <= today` OR
- Asset has `last_service_date < 6 months ago`
- Asset status is "active"

**Template**: `ppm-overdue-generic`
**Task Name**: `"PPM Required: {asset_name}"`
**Task Data**: `{ source_type: "ppm_overdue", source_id: asset.id }`

---

### 3. Certificate Expiry ✅ NEW

**What it does**: Creates tasks 30 days before staff certificates expire.

**Source**: `profiles` table
**Certificate Types**:

- `food_safety_expiry_date` (with `food_safety_level`)
- `h_and_s_expiry_date` (with `h_and_s_level`)
- `fire_marshal_expiry_date`
- `first_aid_expiry_date`
- `cossh_expiry_date`

**Logic**:

- Check each certificate type for each profile
- If expiry date is within next 30 days, create task TODAY
- Task appears in "Today's Tasks" starting 30 days before expiry

**Template**: `certificate-renewal-generic`
**Task Name**: `"{Certificate Type} Level {X} Certificate Expiring: {staff_name}"`
**Task Data**:

```json
{
  "source_type": "certificate_expiry",
  "certificate_type": "food_safety",
  "profile_id": "uuid",
  "expiry_date": "2025-03-15",
  "days_until_expiry": 25
}
```

**Example**: If John's Food Safety Level 3 certificate expires on March 15th, a task is created on February 14th (30 days before).

---

### 4. SOP Review ✅ NEW

**What it does**: Creates tasks 30 days before SOPs need review.

**Source**: `sop_entries` table
**Review Date Calculation**:

1. Use `sop_data->>'review_date'` if exists
2. Otherwise: `updated_at + 1 year`
3. Otherwise: `created_at + 1 year`

**Logic**:

- Calculate review date for each SOP
- If review date is within next 30 days, create task TODAY
- Task appears in "Today's Tasks" starting 30 days before review

**Template**: `sop-review-generic`
**Task Name**: `"SOP Review Due: {sop_title} ({ref_code})"`
**Task Data**:

```json
{
  "source_type": "sop_review",
  "sop_id": "uuid",
  "review_date": "2025-03-15",
  "days_until_review": 25
}
```

---

### 5. Risk Assessment Review ✅ NEW

**What it does**: Creates tasks 30 days before Risk Assessments need review.

**Source**: `risk_assessments` table
**Field**: `next_review_date`

**Logic**:

- If `next_review_date` is within next 30 days, create task TODAY
- Excludes archived RAs (`status != 'Archived'`)
- Task appears in "Today's Tasks" starting 30 days before review

**Template**: `ra-review-generic`
**Task Name**: `"Risk Assessment Review Due: {title} ({ref_code})"`
**Task Data**:

```json
{
  "source_type": "ra_review",
  "ra_id": "uuid",
  "review_date": "2025-03-15",
  "days_until_review": 25
}
```

---

### 6. Messaging Tasks ✅ NEW

**What it does**: Syncs tasks created from the messaging module to appear in Today's Tasks.

**Source**: `tasks` table
**Logic**:

- Find tasks where `created_from_message_id IS NOT NULL`
- Filter by `due_date = today` and active status (`todo`, `pending`, `in_progress`)
- Create corresponding entries in `checklist_tasks`

**Template**: `messaging-task-generic`
**Task Name**: Uses `name` from `tasks` table
**Task Data**:

```json
{
  "source_type": "messaging_task",
  "source_id": "task_id",
  "original_task_id": "task_id",
  "linked_asset_id": "asset_id_or_null"
}
```

**Note**: Tasks are synced daily so they appear in Today's Tasks page.

---

### 7. Document/Policy Expiry ✅ NEW

**What it does**: Creates tasks 30 days before documents/policies expire.

**Source**: `global_documents` table
**Field**: `expiry_date`
**Logic**:

- If `expiry_date` is within next 30 days, create task TODAY
- Only for active documents (`is_active = true`)
- Documents are company-wide (no `site_id`)

**Template**: `document-review-generic`
**Task Name**: `"Document Review Due: {name} (v{version}) - {category}"`
**Task Data**:

```json
{
  "source_type": "document_expiry",
  "document_id": "uuid",
  "document_name": "name",
  "document_category": "category",
  "expiry_date": "2025-03-15",
  "days_until_expiry": 25
}
```

---

### 8. Callout Follow-up ✅

**What it does**: Creates tasks for open callouts that need follow-up.

**Source**: `callouts` table
**Logic**: Find all callouts where `status = 'open'`

**Template**: `callout-followup-generic`
**Task Name**: `"Follow up: {asset_name} Callout"`
**Task Data**: `{ source_type: "callout_followup", source_id: callout.id }`

---

## Generic Templates Required

These templates MUST exist in `task_templates` with `company_id = NULL` (global templates):

| Slug                          | Name                   | Purpose                      |
| ----------------------------- | ---------------------- | ---------------------------- |
| `certificate-renewal-generic` | Certificate Renewal    | Certificate expiry tasks     |
| `sop-review-generic`          | SOP Review             | SOP review tasks             |
| `ra-review-generic`           | Risk Assessment Review | RA review tasks              |
| `ppm-overdue-generic`         | PPM Overdue            | PPM overdue tasks            |
| `callout-followup-generic`    | Callout Follow-up      | Callout follow-up tasks      |
| `messaging-task-generic`      | Task from Message      | Messaging module tasks       |
| `document-review-generic`     | Document Review        | Document/policy expiry tasks |

**Status**: All templates are created in migration `20250220000006_create_generic_task_templates.sql`

---

## Task Creation Rules

### For site_checklists (My Tasks):

- ✅ **MUST** set `site_checklist_id` (links to configuration)
- ✅ **MUST** set `template_id` (from site_checklist)
- ✅ **MUST** set `due_time` and `daypart` for daily tasks
- ✅ **MUST** include `equipment_config` in `task_data` if present
- ✅ **MUST** set `due_date = today`

### For System-Generated Tasks:

- ✅ **MUST NOT** set `site_checklist_id` (NULL)
- ✅ **MUST** set `template_id` (generic template)
- ✅ **MUST** set `custom_name` (descriptive task name)
- ✅ **MUST** set `task_data.source_type` (identifies source)
- ✅ **MUST** set `task_data.source_id` (links to original record)
- ✅ **SHOULD** set `due_time = null` (no specific time)
- ✅ **MUST** set `due_date = today` (appears in Today's Tasks)

---

## Duplicate Prevention

### For site_checklists:

**Check**: `site_checklist_id + due_date + due_time`

**Example**: If a daily fridge check at 07:00 already exists for today, don't create another.

### For System Tasks:

**Check**: `task_data.source_type + task_data.source_id + due_date`

**Example**: If a certificate expiry task for profile X already exists for today, don't create another.

---

## Important Notes

1. **System tasks only appear in "Today's Tasks"** - they should NOT appear in "My Tasks" page
2. **My Tasks page shows configurations** (`site_checklists`), not instances
3. **Today's Tasks page shows instances** (`checklist_tasks` WHERE `due_date = today`)
4. **All tasks created by Edge Function** have `generated_at` timestamp set
5. **Advance loading**: Certificate/SOP/RA tasks created when expiry/review is within 30 days
6. **Tasks are created with `due_date = today`** so they appear immediately in Today's Tasks

---

## Expected Response Format

```json
{
  "success": true,
  "timestamp": "2025-02-21T03:00:00.000Z",
  "daily_tasks_created": 12,
  "weekly_tasks_created": 3,
  "monthly_tasks_created": 1,
  "ppm_tasks_created": 5,
  "callout_tasks_created": 2,
  "certificate_tasks_created": 8,
  "sop_review_tasks_created": 3,
  "ra_review_tasks_created": 2,
  "messaging_tasks_created": 5,
  "document_expiry_tasks_created": 3,
  "total_tasks_created": 44,
  "errors": []
}
```

---

## Cron Schedule

**Recommended**: Run daily at 3am UTC
**Cron Expression**: `0 3 * * *`

**Setup**:

1. Go to Supabase Dashboard → Database → Cron Jobs
2. Create new cron job:
   - Name: `generate-daily-tasks`
   - Schedule: `0 3 * * *`
   - Command: `SELECT net.http_post(url := 'https://YOUR_PROJECT.supabase.co/functions/v1/generate-daily-tasks', headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb);`

---

## Testing

### Manual Test (PowerShell):

```powershell
$anonKey = "YOUR_ANON_KEY"
$headers = @{
    "Authorization" = "Bearer $anonKey"
    "Content-Type" = "application/json"
}
$response = Invoke-RestMethod -Uri "https://YOUR_PROJECT.supabase.co/functions/v1/generate-daily-tasks" -Method Post -Headers $headers
$response | ConvertTo-Json -Depth 10
```

### Verify Tasks Created:

```sql
-- Check tasks created today
SELECT
  COUNT(*) as total_tasks,
  COUNT(DISTINCT site_checklist_id) as from_configs,
  COUNT(*) FILTER (WHERE site_checklist_id IS NULL) as system_generated
FROM checklist_tasks
WHERE due_date = CURRENT_DATE
  AND generated_at::date = CURRENT_DATE;
```

---

## Troubleshooting

### No tasks created:

1. Check if `site_checklists` exist with `active = true`
2. Check if generic templates exist (run migration `20250220000006_create_generic_task_templates.sql`)
3. Check Edge Function logs in Supabase Dashboard
4. Verify cron job is enabled and running

### Duplicate tasks:

- Edge Function checks for duplicates before creating
- If duplicates appear, check the duplicate prevention logic

### Tasks not appearing in Today's Tasks:

- Verify `due_date = today` in database
- Check RLS policies allow user to view tasks
- Verify user's `site_id` matches task's `site_id` (or user is Owner/Admin)
