# Task Page Filtering Issue - Diagnosis

## The Problem

Tasks are appearing in **Active Tasks** page but NOT in **Today's Tasks** page.

## Root Cause Analysis

### Active Tasks Page (`/dashboard/tasks/active`)

- **Query**: Fetches ALL tasks from `checklist_tasks` table
- **Filters**: Only by `company_id`
- **No date filter**: Shows all tasks regardless of `due_date`
- **Result**: ✅ Shows today's tasks (along with all other tasks)

### Today's Tasks Page (`/dashboard/checklists`)

- **Query**: Fetches tasks in date range (30 days before to 30 days after)
- **Filters**:
  1. By `site_id` (if set)
  2. By visibility windows (if configured)
  3. By `due_date === today` (if no visibility window)
- **Result**: ❌ May not show tasks if:
  - `site_id` doesn't match
  - Visibility window logic filters them out
  - Date format mismatch

## Likely Issues

### Issue 1: Site ID Filter

The Today's Tasks page filters by `siteId` from context:

```typescript
if (siteId) {
  query = query.eq("site_id", siteId);
}
```

**If `siteId` is not set or doesn't match**, tasks won't appear.

### Issue 2: Visibility Window Logic

The Today's Tasks page has complex visibility window logic:

- If visibility windows are set, tasks must be within the window
- If no visibility window, tasks must have `due_date === todayStr`

**If visibility windows are misconfigured**, tasks might be filtered out.

### Issue 3: Date Format Mismatch

The Edge Function sets:

```typescript
const today = new Date().toISOString().split("T")[0]; // "2025-02-06"
due_date: today;
```

The Today's Tasks page compares:

```typescript
const todayStr = today.toISOString().split("T")[0]; // "2025-02-06"
return task.due_date === todayStr;
```

**These should match**, but timezone differences could cause issues.

## How to Verify

### Step 1: Check if tasks exist for today

Run this SQL:

```sql
SELECT
  id,
  template_id,
  site_id,
  due_date,
  due_time,
  status,
  generated_at
FROM checklist_tasks
WHERE due_date = CURRENT_DATE
ORDER BY generated_at DESC
LIMIT 10;
```

### Step 2: Check site_id in tasks

```sql
SELECT DISTINCT site_id, COUNT(*) as task_count
FROM checklist_tasks
WHERE due_date = CURRENT_DATE
GROUP BY site_id;
```

### Step 3: Check what siteId is set in context

Open browser console on Today's Tasks page and check:

```javascript
// The page uses useAppContext() to get siteId
// Check if siteId is set and matches the tasks' site_id
```

## Quick Fixes

### Fix 1: Remove site_id filter (if not needed)

If you want to show all company tasks regardless of site:

```typescript
// In src/app/dashboard/checklists/page.tsx
// Comment out or remove:
// if (siteId) {
//   query = query.eq('site_id', siteId)
// }
```

### Fix 2: Check visibility window settings

If templates have visibility windows set, tasks might be filtered out. Check:

```sql
SELECT
  id,
  name,
  recurrence_pattern->'visibility_window_days_before' as before,
  recurrence_pattern->'visibility_window_days_after' as after
FROM task_templates
WHERE is_active = true;
```

### Fix 3: Simplify Today's Tasks filter

For debugging, temporarily simplify the filter to just check `due_date`:

```typescript
// In fetchTodaysTasks(), replace the complex filter with:
const data = (allTasks || []).filter((task) => {
  // Simple: just check if due_date is today
  return task.due_date === todayStr;
});
```

## Expected Behavior

**Active Tasks Page:**

- Shows ALL tasks for the company
- No date filtering
- Useful for viewing all tasks across all dates

**Today's Tasks Page:**

- Shows ONLY tasks due today (or within visibility window)
- Filters by site_id (if set)
- This is the page users should see daily tasks on

## Next Steps

1. ✅ Verify tasks are being created with correct `due_date`
2. ✅ Check if `siteId` is set in context
3. ✅ Verify site_id matches between tasks and context
4. ✅ Check visibility window settings
5. ✅ Test with simplified date filter
