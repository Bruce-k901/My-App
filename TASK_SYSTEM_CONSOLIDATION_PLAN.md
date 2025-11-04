# Task System Consolidation Plan

## Overview

Consolidate the entire task system to use the **checklist_tasks** schema instead of the duplicate task_instances system.

## Current Situation

### Two Overlapping Systems

1. **System 1 (Checklist)** - Working and complete ✅
   - Tables: `task_templates` + `template_fields` + `checklist_tasks` + `task_completion_records`
   - Used by: Daily Checklist page, generate-daily-tasks function
   - Migration: `001_create_checklist_schema.sql`

2. **System 2 (Task Instances)** - Incomplete and conflicting ❌
   - Tables: `task_templates` + `task_fields` + `task_instances` + `task_completion_logs`
   - Used by: My Tasks page, TemperatureCheckTemplate
   - Migration: `001_create_task_template_schema.sql`

## Target Architecture

### Single Unified System

```
task_templates (design)
  ↓
template_fields (what to capture)
  ↓
checklist_tasks (My Tasks - deployed instances)
  ↓
task_completion_records (audit trail for completed tasks)
```

## User Flow

1. **User selects template** → Compliance Templates or Task Templates page
2. **Configure template** → Choose equipment, day parts, times
3. **Save or Save & Deploy**:
   - **Save**: Creates template with `is_template_library = false` → Goes to Drafts
   - **Save & Deploy**: Creates template with `is_template_library = true` → Creates tasks in `checklist_tasks` for today → Appears in My Tasks
4. **Auto-generation**: Nightly cron job creates tomorrow's tasks based on templates
5. **Today's Tasks**: Reads from `checklist_tasks` filtered by `due_date = today` and `daypart`
6. **Complete task**: Creates record in `task_completion_records` with all data (temperatures, photos, etc.)
7. **Completed tasks**: Queries `task_completion_records` for reporting and EHO readiness pack
8. **Auto-cleanup**: Deletes records older than 12 months

## What Needs to Change

### 1. Update TemperatureCheckTemplate

**File**: `src/components/compliance/TemperatureCheckTemplate.tsx`

**Changes**:

- Line 203: Change `from("task_fields")` → `from("template_fields")` (already exists)
- Line 328: Change `from("task_fields")` → `from("template_fields")` (already exists)
- Lines 370-378: Create `checklist_tasks` instead of `task_instances`
- Field mapping updates:
  - `task_template_id` → `template_id`
  - `custom_name` removed (use task name directly)
  - `custom_instructions` removed (use template instructions)

### 2. Update My Tasks Page

**File**: `src/app/dashboard/tasks/page.tsx`

**Changes**:

- Line 23: Change `from("task_instances")` → `from("checklist_tasks")`
- Line 33: Change `task_templates` join to reference `template` instead
- Update field references to match schema

### 3. Drafts Page

**File**: `src/app/dashboard/tasks/drafts/page.tsx`

**Already correct** ✅ - Uses `task_templates` with filter `is_template_library = false`

### 4. Auto-Generation Function

**File**: `supabase/functions/generate-daily-tasks/index.ts`

**Already correct** ✅ - Creates `checklist_tasks` from templates

### 5. Daily Checklist Page

**File**: `src/app/dashboard/checklists/page.tsx`

**Already correct** ✅ - Reads from `checklist_tasks`

### 6. Task Completion Modal

**File**: `src/components/checklists/TaskCompletionModal.tsx`

**Already correct** ✅ - Creates `task_completion_records`

### 7. Add 12-Month Auto-Deletion

**New**: Create Supabase Edge Function or scheduled job

**SQL**:

```sql
CREATE OR REPLACE FUNCTION cleanup_old_task_records()
RETURNS void AS $$
BEGIN
  -- Delete completed records older than 12 months
  DELETE FROM public.task_completion_records
  WHERE completed_at < NOW() - INTERVAL '12 months';

  -- Delete old tasks (keep completed ones for 12 months in the task itself)
  DELETE FROM public.checklist_tasks
  WHERE status = 'completed'
    AND completed_at < NOW() - INTERVAL '12 months';
END;
$$ LANGUAGE plpgsql;

-- Schedule daily execution (requires pg_cron extension)
SELECT cron.schedule('cleanup-old-task-records', '0 2 * * *', 'SELECT cleanup_old_task_records()');
```

### 8. Remove Duplicate Migration

**Action**: Delete or deprecate `001_create_task_template_schema.sql` migration

## Schema Mappings

### TemperatureCheckTemplate Deploy Mapping

**OLD** (task_instances):

```javascript
{
  task_template_id: template.id,
  scheduled_date: scheduledDate,
  scheduled_time: scheduledTime,
  due_datetime: dueDateTime,
  custom_name: `Temperature Check - ${dayPart}`,
  custom_instructions: `Check temperatures...`,
  status: 'pending'
}
```

**NEW** (checklist_tasks):

```javascript
{
  template_id: template.id,  // Changed from task_template_id
  company_id: profile.company_id,
  site_id: profile.site_id,
  due_date: scheduledDate,   // Changed from scheduled_date
  due_time: scheduledTime,   // Changed from scheduled_time
  daypart: dayPart,          // NEW field - needed!
  assigned_to_role: 'kitchen_manager',
  assigned_to_user_id: profile.id,
  status: 'pending',
  priority: 'medium'
}
```

## Constraints & Considerations

### ✅ NO ISSUES

1. ✅ Schema already supports everything we need
2. ✅ Day parts already supported in `checklist_tasks.daypart`
3. ✅ Completion records already store JSONB data (temperatures, equipment)
4. ✅ Auto-generation already working
5. ✅ EHO readiness pack can query `task_completion_records`

### ⚠️ MINOR CHANGES NEEDED

1. ⚠️ Update TemperatureCheckTemplate to use correct table names
2. ⚠️ Update My Tasks page to query `checklist_tasks`
3. ⚠️ Add 12-month auto-deletion function
4. ⚠️ Clean up duplicate migration files

### 📝 LATER (Not blockers)

1. 📝 Build EHO readiness pack query interface
2. 📝 Add more compliance templates
3. 📝 Create dashboard for Today's Tasks overview

## Implementation Steps

1. ✅ **DONE**: Verify checklist schema is complete
2. ✅ **DONE**: Update TemperatureCheckTemplate.tsx
3. ✅ **DONE**: Update My Tasks page
4. ✅ **DONE**: Add auto-deletion function
5. 🔄 **NEXT**: Test end-to-end flow
6. 🔄 **NEXT**: Remove duplicate migrations

## Changes Made

### ✅ TemperatureCheckTemplate.tsx

- Changed `task_fields` → `template_fields`
- Changed `task_instances` → `checklist_tasks`
- Updated field mapping to match schema
- Changed field_type from "temperature" to "number"
- Removed `custom_name` and `custom_instructions` fields

### ✅ My Tasks Page (src/app/dashboard/tasks/page.tsx)

- Changed query from `task_instances` → `checklist_tasks`
- Updated field references: `scheduled_date` → `due_date`, `scheduled_time` → `due_time`
- Updated template join: `task_templates` → `template`
- Removed custom_name and custom_instructions references
- Added daypart display

### ✅ Auto-Deletion

- Created Edge Function: `supabase/functions/cleanup-old-task-records/index.ts`
- Created SQL migration: `20250127000000_add_task_cleanup_function.sql`
- Function deletes records older than 12 months
- Can be scheduled with pg_cron or called via Edge Function

## Testing Checklist

- [ ] Can create draft template from Compliance Templates page
- [ ] Draft appears in Drafts page
- [ ] Can deploy draft (creates checklist_tasks)
- [ ] Deployed tasks appear in My Tasks page
- [ ] Today's tasks appears in Daily Checklist page
- [ ] Can complete task (creates task_completion_records)
- [ ] Completed task shows in Completed Tasks page
- [ ] Completion record stores all temperature data
- [ ] Auto-deletion removes records older than 12 months
- [ ] Generate-daily-tasks creates tomorrow's tasks

## Database Impact

### No Schema Changes Required

The checklist schema already has everything we need! We just need to:

- Update application code to use correct table names
- Remove duplicate migrations
- Add cleanup function
