# Task Generation System Review

## Current Status

### ✅ What's Working

1. **Automated Task Generation (Cron)**
   - Function: `generate_daily_tasks_direct()` in SQL
   - Edge Function: `supabase/functions/generate-daily-tasks/index.ts`
   - Cron Schedule: 3:00 AM UTC daily (`0 3 * * *`)
   - Handles multiple dayparts and times correctly
   - Creates one task per daypart+time combination

2. **Duplicate Prevention**
   - Unique constraint: `idx_checklist_tasks_unique_template_task`
   - Prevents duplicates based on: `template_id, site_id, due_date, daypart, due_time`
   - `safeInsertTasks()` helper handles race conditions
   - Checks existing tasks before inserting

3. **Multiple Dayparts/Times Support**
   - Automated generation creates tasks for each daypart+time combination
   - Supports `recurrence_pattern.daypart_times` format
   - Example: `{ "before_open": "06:00", "during_service": ["12:00", "15:00"] }`

### ❌ Issues Found

1. **Manual Task Creation (TaskFromTemplateModal)**
   - **PROBLEM**: Only creates ONE task with first daypart/time
   - **SHOULD**: Create multiple tasks for each daypart+time combination (like automated generation)
   - **Location**: `src/components/templates/TaskFromTemplateModal.tsx:1190-1217`

2. **Compliance Template Task Creation**
   - **PROBLEM**: Only creates tasks for selected dayparts, but doesn't handle multiple times per daypart
   - **Location**: `src/components/compliance/TemperatureCheckTemplate.tsx:748-788`

## What Needs to Be Fixed

### Priority 1: Manual Task Creation

When a user manually creates a task from a template:

- If template has multiple dayparts → create one task per daypart
- If template has multiple times per daypart → create one task per daypart+time combination
- Should match the automated generation logic

### Priority 2: Verify Cron Job

- Run `scripts/verify-task-generation-setup.sql` to check:
  - Cron job exists and is scheduled
  - Unique constraint is applied
  - Function exists and is callable

### Priority 3: Test with Multiple Dayparts/Times

- Create a test template with:
  - Multiple dayparts: `["before_open", "during_service", "after_service"]`
  - Multiple times: `{ "before_open": "06:00", "during_service": ["12:00", "15:00"] }`
- Verify tasks are created correctly

## Files to Review

1. **Task Generation (Automated)**
   - `supabase/migrations/20250202000003_setup_task_generation_cron.sql` - Cron setup
   - `supabase/functions/generate-daily-tasks/index.ts` - Edge Function
   - `supabase/migrations/20250206000003_add_unique_constraint_prevent_duplicates.sql` - Unique constraint

2. **Task Creation (Manual)**
   - `src/components/templates/TaskFromTemplateModal.tsx` - Manual task creation
   - `src/components/compliance/TemperatureCheckTemplate.tsx` - Compliance template creation

3. **Diagnostics**
   - `scripts/verify-task-generation-setup.sql` - Verify setup

## Next Steps

1. ✅ Run verification script to check cron and constraints
2. ⏳ Fix manual task creation to handle multiple dayparts/times
3. ⏳ Test with a template having multiple dayparts/times
4. ⏳ Verify cron job runs at 3am UTC
