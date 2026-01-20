# Today's Tasks Cron Fix - Summary

## Problem
After migration push, the `archive_and_clean_tasks` migration deleted all tasks, leaving no Active Tasks for the cron to generate from.

## Solution Applied ✅
Created migration `20251215000011_restore_active_tasks_from_templates.sql` that:
- Restores 344 Active Tasks from `task_templates` 
- Creates one Active Task per template/company/site/daypart combination
- These Active Tasks serve as patterns for the cron to regenerate daily/weekly/monthly tasks

## Current Status
- ✅ 344 Active Tasks restored from templates
- ✅ All tasks have `due_date = CURRENT_DATE` (2026-01-20)
- ✅ All tasks have `status = 'pending'`
- ✅ Tasks should be visible in Today's Tasks page

## Why Tasks Might Not Be Showing

The Today's Tasks page (`/dashboard/todays_tasks`) has several filters:

1. **Site Filtering**: 
   - If you're a manager/admin and have a site selected in the dropdown, it filters by that site
   - If you're staff, it only shows tasks for your current site when you're on shift

2. **Shift-Based Filtering**:
   - Staff must be clocked in (on shift) to see tasks
   - If you're not on shift, the page shows no tasks

3. **Status Filtering**:
   - Only shows tasks with `status IN ['pending', 'in_progress']`
   - Completed tasks are filtered out

## How to Verify Tasks Are Working

1. **Check if tasks exist in database**:
   ```sql
   SELECT COUNT(*) FROM checklist_tasks 
   WHERE due_date = CURRENT_DATE 
   AND status = 'pending';
   ```

2. **Check your site_id**:
   - Make sure you're viewing the correct site
   - Try selecting "All Sites" if you're a manager/admin

3. **Check if you're on shift** (if you're staff):
   - You need to be clocked in to see tasks
   - Managers/admins see all tasks regardless of shift

4. **Refresh the page**:
   - The tasks should appear after a page refresh

## Next Steps

The cron will automatically generate new tasks for tomorrow based on these Active Tasks. The restored Active Tasks should already be visible in Today's Tasks page.

If tasks still don't show:
1. Check browser console for errors
2. Verify your user role and site assignment
3. Check if you're clocked in (if staff)
4. Try selecting "All Sites" in the site dropdown
