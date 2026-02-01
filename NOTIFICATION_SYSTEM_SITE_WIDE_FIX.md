# Notification System: Site-Wide Fix

## Problem

The notification system was only sending notifications to the **assigned user** of a task. However:

- Tasks are assigned to **teams/sites**, not individual users
- Users clock in to receive notifications
- **All clocked-in users at a site** should receive notifications for tasks at that site

## Solution

Updated the notification system to send notifications to **ALL clocked-in users at the site**, not just the assigned user.

## Changes Made

### 1. SQL Functions (`FIX_NOTIFICATIONS_FOR_ALL_CLOCKED_IN_USERS.sql`)

#### Updated `get_active_staff_on_site()`

- Now uses `staff_attendance` table (via `attendance_logs` view)
- Returns all users currently clocked in at a site
- Includes Staff, Manager, General Manager, Admin, and Owner roles

#### New Function: `create_task_notification_for_site()`

- Creates notifications for **ALL clocked-in users** at a site
- Only creates one notification per user per task per day (prevents duplicates)
- Returns array of `{notification_id, user_id, user_name}` for each notification created
- Supports both `task_ready` and `task_late` notification types

#### Updated Function: `create_task_notification_for_date_range()`

- Now uses the site-wide approach
- Sends to all clocked-in users at the site

### 2. Edge Function (`check-task-notifications/index.ts`)

#### Removed Requirements:

- ❌ No longer requires `assigned_to_user_id`
- ❌ No longer checks if user is assigned to task

#### New Behavior:

- ✅ Only requires `site_id` (which all tasks have)
- ✅ Sends notifications to ALL clocked-in users at the site
- ✅ Handles tasks without assigned users gracefully
- ✅ Returns count of notifications created (for logging)

#### Updated Notification Calls:

**Before:**

```typescript
// Only sent to assigned user
create_task_ready_notification({
  p_user_id: task.assigned_to_user_id, // Required!
  ...
})
```

**After:**

```typescript
// Sends to ALL clocked-in users at site
create_task_notification_for_site({
  p_site_id: task.site_id, // Only requirement
  p_notification_type: 'task_ready',
  ...
})
// Returns array of notifications created
```

## How It Works

1. **Task becomes ready/late** → Edge function checks task
2. **Get clocked-in users** → `get_active_staff_on_site(site_id)` returns all users clocked in
3. **Create notifications** → One notification per clocked-in user
4. **Prevent duplicates** → Checks if notification already exists for user+task+day

## What To Do

### Step 1: Run SQL Fix

```sql
-- Run this in Supabase SQL Editor
\i FIX_NOTIFICATIONS_FOR_ALL_CLOCKED_IN_USERS.sql
```

Or copy/paste the contents of `FIX_NOTIFICATIONS_FOR_ALL_CLOCKED_IN_USERS.sql` into Supabase SQL Editor.

### Step 2: Deploy Updated Edge Function

```bash
supabase functions deploy check-task-notifications
```

### Step 3: Test

1. **Clock in** at a site
2. **Create a task** due today (or wait for existing task to become ready)
3. **Check notifications** - should see notification for all clocked-in users

### Step 4: Verify

Run this query to see notifications created:

```sql
SELECT
  n.id,
  n.type,
  n.title,
  n.message,
  p.full_name as user_name,
  s.name as site_name,
  ct.custom_name as task_name
FROM notifications n
JOIN profiles p ON p.id = n.user_id
LEFT JOIN sites s ON s.id = n.site_id
LEFT JOIN checklist_tasks ct ON ct.id = n.task_id
WHERE n.created_at::date = CURRENT_DATE
ORDER BY n.created_at DESC;
```

## Expected Behavior

### ✅ What Works Now:

- Tasks without assigned users → Notifications sent to all clocked-in users
- Tasks with assigned users → Still works, but sends to ALL clocked-in users (not just assigned)
- Multiple users clocked in → All receive notifications
- User not clocked in → No notification (as expected)

### ⚠️ Important Notes:

- **Users must be clocked in** to receive notifications
- Notifications are **site-specific** - only users clocked in at that site receive them
- One notification per user per task per day (prevents spam)

## Troubleshooting

### No notifications being created?

1. **Check if users are clocked in:**

```sql
SELECT * FROM get_active_staff_on_site('YOUR_SITE_ID');
```

2. **Check if tasks exist:**

```sql
SELECT id, custom_name, site_id, due_date, due_time
FROM checklist_tasks
WHERE due_date = CURRENT_DATE;
```

3. **Check edge function logs:**
   - Go to Supabase Dashboard → Edge Functions → `check-task-notifications` → Logs
   - Look for errors or "no users clocked in" messages

### Notifications created but not showing?

- Check RLS policies on `notifications` table
- Verify user has access to notifications for their company/site
- Check frontend notification fetching logic

## Migration Notes

- **Backward compatible**: Old notification functions still exist (deprecated)
- **No data migration needed**: Existing notifications remain unchanged
- **New notifications**: Will use site-wide approach going forward
