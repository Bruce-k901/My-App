# Active Tasks Page - Purpose & Behavior

## 🎯 Purpose

The **Active Tasks** page is **NOT** a list of "active" (non-completed) tasks. It's actually:

**Master Task Registry** - A complete list of all tasks that the cron job uses to regenerate today's tasks daily at 3am.

## 📋 Key Behaviors

### 1. Shows ALL Tasks Regardless of Status

- ✅ Shows `pending` tasks
- ✅ Shows `in_progress` tasks
- ✅ Shows `completed` tasks (they remain here!)
- ✅ Shows `overdue` tasks
- ✅ Shows `failed` tasks
- ✅ Shows `skipped` tasks

**Why?** Because the cron job needs to see all tasks to regenerate them daily.

### 2. Tasks Are Only Removed When Manually Deleted

- Tasks are **NOT** automatically removed when completed
- Tasks are **NOT** automatically removed when skipped
- Tasks are **ONLY** removed when the user clicks the delete button
- This ensures the cron job always has the full list of tasks to work with

### 3. Cron Job Uses This List

- Every day at 3am UTC, the cron job runs `generate_daily_tasks_direct()`
- It reads tasks from the `checklist_tasks` table (which is what Active Tasks shows)
- It uses these tasks to regenerate today's tasks based on their templates and schedules
- Completed tasks remain in the list so they can be regenerated for future days

### 4. Completed Tasks Behavior

**Active Tasks Page:**

- ✅ Completed tasks **remain visible** (they're part of the master registry)
- ✅ Can be manually deleted if no longer needed
- ✅ Status shows as "completed" but task is still in the list

**Today's Tasks Page:**

- ✅ Completed tasks are **filtered out** from the active list
- ✅ Completed tasks appear in a separate "Completed Tasks" section
- ✅ Only shows `pending`, `in_progress`, `overdue`, `failed` in the main list

**Completed Tasks Page:**

- ✅ Shows all completed tasks as read-only audit trails
- ✅ Fetches from `task_completion_records` table
- ✅ Immutable - cannot be edited or deleted

## 🔄 Task Lifecycle

1. **Task Created** → Appears in Active Tasks
2. **Task Completed** →
   - Status changes to `completed` in Active Tasks
   - Removed from Today's Tasks active list
   - Added to Completed Tasks page (read-only)
   - **Still visible in Active Tasks** (for cron regeneration)
3. **Task Deleted** →
   - Removed from Active Tasks (user manually deletes)
   - No longer used by cron job
   - Completion record remains in Completed Tasks page (audit trail)

## 📝 Code References

### Active Tasks Page

```typescript
// Shows ALL tasks regardless of status
const { data: tasksData } = await supabase
  .from("checklist_tasks")
  .select("*")
  .eq("company_id", companyId);
// Don't filter by status - show all tasks (this is the master registry)
```

### Today's Tasks Page

```typescript
// Filter out completed tasks from the main list
let activeTasks = tasksWithProfiles.filter(
  (t) => t.status !== "completed" && t.status !== "skipped",
);
```

### Cron Job

```sql
-- generate_daily_tasks_direct() reads from checklist_tasks
-- Uses all tasks (including completed ones) to regenerate today's tasks
SELECT * FROM task_templates WHERE is_active = true
-- Creates new tasks based on templates and schedules
```

## ✅ Summary

- **Active Tasks** = Master registry (all tasks, all statuses)
- **Today's Tasks** = Active list (filters out completed)
- **Completed Tasks** = Read-only audit trails
- **Cron Job** = Uses Active Tasks to regenerate daily
- **Manual Delete** = Only way to remove tasks from Active Tasks
