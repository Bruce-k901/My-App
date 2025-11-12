# Task Generation - Key Points

## Understanding

**All templates have:**

- ✅ **Dayparts**: Array of dayparts (e.g., `["before_open", "afternoon", "after_service"]`)
- ✅ **Times**: Either in `daypart_times` (per daypart) or `time_of_day` (single time for all)

**The TIME is the key for today's task population:**

- Tasks are created for **TODAY** (`due_date = CURRENT_DATE`)
- Each task gets a specific **TIME** (`due_time`)
- Tasks appear in "Today's Tasks" based on their `due_date` and `due_time`

## Expected Behavior

For a template with:

- **Dayparts**: `["before_open", "afternoon", "after_service"]`
- **Times**:
  - `before_open`: 06:00
  - `afternoon`: 15:00
  - `after_service`: 18:00

**Should create 3 tasks for TODAY:**

1. Task 1: `daypart = "before_open"`, `due_time = "06:00"`, `due_date = TODAY`
2. Task 2: `daypart = "afternoon"`, `due_time = "15:00"`, `due_date = TODAY`
3. Task 3: `daypart = "after_service"`, `due_time = "18:00"`, `due_date = TODAY`

## Current Issue

Only **1 task** is being created instead of **3 tasks** (one per daypart).

## Root Cause

The generation function is not properly:

1. Looping through all dayparts
2. Assigning correct times to each daypart
3. Creating separate tasks for each daypart+time combination

## Fix

The `QUICK_FIX_MISSING_DAYPART_TASKS.sql` script will:

1. Find templates with multiple dayparts
2. Check which daypart tasks are missing for today
3. Create missing tasks with correct times
4. Use `daypart_times` if available, otherwise use `time_of_day` (if valid), otherwise use daypart-based defaults
