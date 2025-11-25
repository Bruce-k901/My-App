# Task Archive System - Implementation Guide

## ✅ What's Been Built

### 1. **Database Layer**

- ✅ Added `archived` boolean column to tasks table
- ✅ Added `archived_at` timestamp column
- ✅ Added `archived_by` user reference column
- ✅ Created indexes for performance
- ✅ Created auto-archive function for tasks older than 30 days

### 2. **Archive Page**

- ✅ New page at `/dashboard/tasks/archived`
- ✅ View all archived tasks
- ✅ Search archived tasks
- ✅ Stats dashboard (total, this month, completed)
- ✅ Restore tasks back to active
- ✅ Permanently delete tasks

### 3. **My Tasks Page Updates**

- ✅ Filters out archived tasks automatically
- ✅ "Archived Tasks" button in header
- ✅ Clean separation between active and archived

---

## 🚀 Setup Instructions

### Step 1: Run the Migration

**Run this SQL in Supabase SQL Editor:**

Open `supabase/migrations/20251125000002_add_task_archive.sql` and run it in
Supabase.

This will:

- Add archive columns to tasks table
- Create indexes
- Create auto-archive function

### Step 2: Test the System

1. **Go to My Tasks** (`/dashboard/tasks/my-tasks`)
2. **Click "Archived Tasks"** button in top-right
3. **Archive page should load** (empty at first)

### Step 3: Archive a Task Manually

You can manually archive tasks by running:

```sql
UPDATE public.tasks
SET
  archived = true,
  archived_at = now(),
  archived_by = auth.uid()
WHERE id = 'YOUR_TASK_ID';
```

---

## 📋 Features

### Archive Page Features:

- ✅ **Search** - Find archived tasks by title or description
- ✅ **Stats** - See total archived, this month, and completed counts
- ✅ **Restore** - Bring tasks back to active status
- ✅ **Permanent Delete** - Remove tasks forever (with confirmation)
- ✅ **Sorted by Date** - Most recently archived first

### Auto-Archive:

- ✅ Tasks completed/cancelled for **30+ days** can be auto-archived
- ✅ Run manually: `SELECT auto_archive_old_completed_tasks();`
- ✅ Or set up cron job (see migration file)

---

## 🔄 Workflow

```
Active Task → Complete → (30 days) → Auto-Archive → Archived Tasks Page
                                                            ↓
                                                    Restore or Delete
```

### Manual Archive:

You can add a manual "Archive" button to tasks if needed. Just update the task:

```tsx
const handleArchive = async (taskId: string) => {
  await supabase
    .from("tasks")
    .update({
      archived: true,
      archived_at: new Date().toISOString(),
      archived_by: userId,
    })
    .eq("id", taskId);
};
```

---

## 🎨 UI/UX

### My Tasks Page:

- Shows only **active** (non-archived) tasks
- "Archived Tasks" button in top-right corner
- Clean, uncluttered view

### Archived Tasks Page:

- Archive icon in header
- Search bar for finding old tasks
- Stats cards showing archive metrics
- Each task shows:
  - Title and description
  - Status badge (completed/cancelled)
  - Completion date
  - Archive date
  - Restore and Delete buttons

---

## 🔧 Customization Options

### Change Auto-Archive Period:

Edit the migration to change from 30 days to X days:

```sql
WHERE completed_at < (now() - interval '30 days')  -- Change 30 to your preferred number
```

### Set Up Automatic Cron Job:

Uncomment this line in the migration:

```sql
SELECT cron.schedule('auto-archive-tasks', '0 2 * * *', 'SELECT auto_archive_old_completed_tasks()');
```

This runs daily at 2 AM.

### Add Manual Archive Button:

In `my-tasks/page.tsx`, add this button to each task:

```tsx
<button
  onClick={() => handleArchive(task.id)}
  className="flex items-center gap-2 px-4 py-2 bg-gray-500/20 text-gray-400 rounded-lg"
>
  <Archive className="w-4 h-4" />
  Archive
</button>
```

---

## 📊 Database Schema

```sql
tasks table:
  - archived: boolean (default: false)
  - archived_at: timestamptz (null until archived)
  - archived_by: uuid (references auth.users)
```

---

## ✨ Benefits

1. **Clean UI** - Active tasks page stays uncluttered
2. **Data Retention** - Keep historical data without deleting
3. **Easy Recovery** - Restore archived tasks if needed
4. **Performance** - Fewer tasks to query = faster page loads
5. **Compliance** - Maintain audit trail of completed work

---

## 🧪 Testing Checklist

- [ ] Run migration in Supabase
- [ ] Hard refresh browser
- [ ] Complete a task
- [ ] Navigate to Archived Tasks page
- [ ] Manually archive the completed task (SQL or add button)
- [ ] Verify it appears in archived page
- [ ] Test restore functionality
- [ ] Test permanent delete (with confirmation)
- [ ] Test search functionality
- [ ] Verify stats are accurate

---

**Status**: ✅ Ready to Deploy\
**Last Updated**: 2025-11-25
