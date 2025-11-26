# Fix for Tasks Disappearing Issue

## Problem

When completing a PPM task, all other tasks (including non-PPM tasks) disappeared from Today's Tasks page.

## Root Cause Analysis

The PPM schedule update code I added runs after task completion. While it's wrapped in try-catch, there might be an issue with:

1. Async execution blocking the response
2. Errors causing the entire API call to fail
3. Query parameters being affected somehow

## Fix Applied

### 1. Made PPM Update Truly Non-Blocking

**File**: `src/app/api/tasks/complete/route.ts`

- Changed PPM update to run asynchronously without blocking the response
- Wrapped in IIFE (Immediately Invoked Function Expression) with `.catch()` to ensure no unhandled promise rejections
- Response is sent immediately after task completion, before PPM update runs

### 2. Error Handling

- All PPM update errors are caught and logged
- Errors in PPM update will NOT affect task completion
- Task completion response is sent regardless of PPM update success/failure

## Testing Steps

1. **Check Browser Console**
   - Open browser DevTools (F12)
   - Go to Console tab
   - Complete a PPM task
   - Look for any errors related to:
     - Task completion API
     - PPM schedule update
     - Task refresh/fetch

2. **Check Network Tab**
   - Open Network tab in DevTools
   - Complete a PPM task
   - Check the `/api/tasks/complete` request:
     - Status should be 200 (success)
     - Response should include `taskUpdated: true`
   - Check if `fetchTodaysTasks` is being called
   - Check if there are any failed requests

3. **Verify Task Query**
   - After completing a task, check if `fetchTodaysTasks` is being called
   - Check the query parameters:
     - `company_id` should be present
     - `site_id` should be present (if applicable)
     - `due_date` should be today's date
     - `status` should be `['pending', 'in_progress']`

4. **Check Database**
   - Verify that tasks still exist in `checklist_tasks` table
   - Check that only the completed task has `status = 'completed'`
   - Other tasks should still have `status = 'pending'` or `'in_progress'`

## Potential Issues to Check

### Issue 1: Query Filtering

If tasks are being filtered out incorrectly:

- Check `src/app/dashboard/todays_tasks/page.tsx` line 304-327
- Verify `due_date` filter is correct
- Check if `shiftFilter` is excluding tasks incorrectly

### Issue 2: State Management

If tasks are cleared but not refetched:

- Check `onComplete` callback in `TaskCompletionModal`
- Verify `fetchTodaysTasks()` is being called
- Check if there's an error preventing the refresh

### Issue 3: Company/Site ID Loss

If `companyId` or `siteId` is lost:

- Check `useAppContext()` is providing correct values
- Verify these values persist after task completion

## Debugging Commands

Run these in browser console after completing a task:

```javascript
// Check if tasks exist in database
const { data } = await supabase
  .from("checklist_tasks")
  .select("id, status, due_date, company_id, site_id")
  .eq("due_date", new Date().toISOString().split("T")[0])
  .in("status", ["pending", "in_progress"]);
console.log("Tasks in DB:", data);

// Check company context
console.log("Company ID:", window.__APP_CONTEXT__?.companyId);
```

## Next Steps

1. **If tasks still disappear:**
   - Check browser console for errors
   - Check Network tab for failed requests
   - Verify database still has tasks
   - Check if `companyId`/`siteId` are being lost

2. **If PPM update is failing:**
   - Check console logs for PPM update errors
   - Verify `ppm_schedule` table exists and has correct structure
   - Check if `asset_id` in task_data matches an asset in `ppm_schedule`

3. **If issue persists:**
   - Temporarily disable PPM update code to isolate the issue
   - Check if issue occurs with non-PPM tasks too
   - Verify RLS policies aren't blocking queries

## Rollback Plan

If the issue persists, you can temporarily disable the PPM update by commenting out lines 203-270 in `src/app/api/tasks/complete/route.ts`. The PPM schedule will still need to be updated manually, but task completion will work normally.
