# Task Pages Structure - Current State & Issues

## 🔍 **Current Problem**

You have **multiple task pages** that are confusing:

1. **`/dashboard/tasks/my-tasks`** - Shows BOTH template tasks AND message tasks
2. **`/dashboard/tasks/active`** - Shows only template-based tasks (master
   registry)
3. **Sidebar "My Tasks"** links to `/dashboard/tasks/my-tasks`

When clicking a task from messaging, it goes to
`/dashboard/tasks/my-tasks?task=...` but:

- The page shows "All tasks, pending, in progress, completed" tabs
- No tasks appear because the query is filtering incorrectly
- The Archive button wasn't added (code didn't save)

## 📋 **Recommended Structure**

### Option A: Unified "My Tasks" Page (RECOMMENDED)

- **`/dashboard/tasks/my-tasks`** - Shows ALL tasks (template + message)
  - Filter tabs: All, Pending, In Progress, Completed
  - Shows tasks assigned to you OR created by you
  - Archive button in header
  - Works with URL params: `?task=...` to open specific task

- **`/dashboard/tasks/archived`** - Archived tasks only
  - Restore and delete functionality

- **Remove `/dashboard/tasks/active`** - Redundant, causes confusion

### Option B: Separate Pages

- **`/dashboard/tasks/my-tasks`** - Template-based tasks only
- **`/dashboard/tasks/messages`** - Message-created tasks only
- **`/dashboard/tasks/archived`** - Archived tasks

## ✅ **What Needs to Happen**

1. **Fix `/dashboard/tasks/my-tasks` page**:
   - Add Archive button to header
   - Ensure it loads tasks from BOTH sources correctly
   - Fix filtering to show tasks properly

2. **Decide on page structure**:
   - Keep unified page (Option A) OR
   - Split into separate pages (Option B)

3. **Update navigation**:
   - Make sidebar link clear
   - Add breadcrumbs if needed

## 🚨 **Immediate Action Required**

The Archive button code I added didn't save. I need to re-apply it to the
correct file.

Which option do you prefer?

- **Option A**: One "My Tasks" page showing everything
- **Option B**: Separate pages for template tasks vs message tasks
