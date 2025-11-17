# Cron Frequency & Dayparts Fix

## Problem

The cron was looking for tasks with `due_date = today`, but tasks use **frequency patterns** (daily, weekly, monthly) and **dayparts** to determine when they're due.

## Solution

Completely rewrote the cron to:

1. **Query all active tasks** (like Active Tasks page)
2. **Check frequency pattern** to determine if task is due today:
   - **daily**: Always due today ✅
   - **weekly**: Check if today matches `recurrence_pattern.days` array
   - **monthly**: Check if today matches `recurrence_pattern.date_of_month`
3. **Expand by dayparts**: Each task can have multiple dayparts (morning, afternoon, evening)
   - Each daypart = separate notification check
   - Each daypart has its own `due_time`
4. **Check notification timing** for each daypart instance

## How It Works

### Frequency Checking

```typescript
// Daily tasks: Always due today
if (frequency === "daily") return true;

// Weekly tasks: Check if today matches target days
if (frequency === "weekly") {
  const targetDays = recurrence_pattern.days || [1]; // Default Monday
  const dayOfWeek = now.getUTCDay(); // 0=Sunday, 1=Monday, etc.
  return targetDays.includes(dayOfWeek);
}

// Monthly tasks: Check if today matches target date
if (frequency === "monthly") {
  const targetDate = recurrence_pattern.date_of_month || 1;
  return now.getUTCDate() === targetDate;
}
```

### Daypart Expansion

1. **Get dayparts** from (in priority order):
   - `task_data.dayparts` array
   - `template.dayparts` array
   - `task.daypart` field
   - Default: `['anytime']`

2. **Get due_time** for each daypart:
   - From `task_data.daypart_times[daypart]` (if exists)
   - From `task.due_time` (if exists)
   - From daypart defaults:
     - `before_open` / `morning`: `08:00`
     - `during_service` / `afternoon`: `12:00`
     - `after_service` / `evening` / `dinner`: `18:00`
     - `anytime`: template `time_of_day` or `09:00`

3. **Expand task**: Create one instance per daypart with its specific `due_time`

### Example

Task with:

- Frequency: `daily`
- Dayparts: `['morning', 'afternoon', 'evening']`
- Daypart times: `{ morning: '08:00', afternoon: '14:00', evening: '18:00' }`

Expands to 3 notification checks:

1. Morning task at 08:00
2. Afternoon task at 14:00
3. Evening task at 18:00

## Changes Made

1. ✅ Removed `due_date = today` filter from query
2. ✅ Added `isTaskDueToday()` function to check frequency patterns
3. ✅ Added `getTaskDayparts()` function to expand tasks by dayparts
4. ✅ Added `getDefaultDaypartTime()` function for daypart time defaults
5. ✅ Query now includes `frequency`, `dayparts`, `recurrence_pattern` from template
6. ✅ Tasks expanded into daypart instances before notification checks

## Testing

Run the cron test:

```powershell
.\test-cron-fixed.ps1
```

Expected output:

- `tasks_checked` should show expanded daypart instances
- Should find tasks based on frequency patterns
- Each daypart instance checked for notification timing

## Next Steps

1. **Deploy the updated function**:

   ```bash
   supabase functions deploy check-task-notifications
   ```

2. **Test manually** to verify it finds tasks

3. **Check logs** to see:
   - How many tasks found
   - How many daypart instances created
   - Notification timing checks

The cron should now correctly find and process tasks based on their frequency and dayparts! 🎉
