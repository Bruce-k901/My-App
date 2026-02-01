# Summary of All Fixes

## Issues Found

1. **All tasks have `assigned_to_user_id: null`** → No notifications can be created (they require an assigned user)
2. **Tasks have no names** → `custom_name` is null for most tasks
3. **PPM tasks for archived assets** → Tasks being created for assets that are archived

## Fixes Created

### 1. `FIX_ALL_TASK_ISSUES.sql`

This script:

- ✅ Assigns users to tasks (from template → site GM → company admin → manager)
- ✅ Adds names to tasks (from template → task_data → generated based on type)
- ✅ Deletes PPM tasks for archived assets
- ✅ Updates notification function to handle unassigned tasks (sends to managers)

### 2. `FIX_NOTIFICATIONS_NO_DUE_TIME.sql`

- ✅ Adds `task_id` column to notifications table
- ✅ Updates notification functions to handle missing `due_time`
- ✅ Creates function for date-based notifications

### 3. Updated Edge Function (`generate-daily-tasks/index.ts`)

- ✅ Ensures PPM tasks always have assigned users
- ✅ Uses "PPM Required:" format to match your existing tasks
- ✅ Adds default `due_time` for PPM tasks
- ✅ Already filters archived assets

## What To Do

### Step 1: Run `FIX_ALL_TASK_ISSUES.sql`

This will:

- Assign users to all your existing tasks
- Add names to all tasks
- Delete PPM tasks for archived assets

### Step 2: Run `FIX_NOTIFICATIONS_NO_DUE_TIME.sql`

This adds the `task_id` column and fixes notification functions.

### Step 3: Deploy Updated Edge Function

```bash
supabase functions deploy generate-daily-tasks
supabase functions deploy check-task-notifications
```

### Step 4: Test

After running the fixes, check:

```sql
-- Should show tasks with assigned users
SELECT COUNT(*) FROM checklist_tasks
WHERE due_date = CURRENT_DATE
AND assigned_to_user_id IS NOT NULL;

-- Should show tasks with names
SELECT COUNT(*) FROM checklist_tasks
WHERE due_date = CURRENT_DATE
AND custom_name IS NOT NULL;
```

## Expected Results

After fixes:

- ✅ All tasks will have assigned users
- ✅ All tasks will have names
- ✅ No PPM tasks for archived assets
- ✅ Notifications will be created (for tasks with assigned users who are clocked in)

## Why Notifications Weren't Working

**Root cause**: All tasks had `assigned_to_user_id: null`. The notification system requires an assigned user to send notifications to. Even if you're clocked in, if the task isn't assigned to you, no notification is created.

The fix assigns all tasks to appropriate users, so notifications can be created.
