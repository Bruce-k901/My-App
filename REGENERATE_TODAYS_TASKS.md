# 🔄 Regenerate Today's Tasks

This guide explains how to delete today's tasks and regenerate them using the edge function.

## Quick Steps

### Option 1: Using SQL + Edge Function (Recommended)

1. **Delete today's tasks:**
   - Open Supabase SQL Editor
   - Run: `supabase/sql/delete_todays_tasks_and_regenerate.sql`
   - Or run directly:
     ```sql
     DELETE FROM public.checklist_tasks
     WHERE due_date = CURRENT_DATE;
     ```

2. **Trigger task generation:**
   - **Via API Route** (from your app):
     ```typescript
     import { triggerTaskGeneration } from "@/lib/task-generation";
     await triggerTaskGeneration();
     ```
   - **Via PowerShell Script**:
     ```powershell
     .\scripts\regenerate-todays-tasks.ps1
     ```
   - **Via Supabase Dashboard**:
     - Go to Edge Functions → `generate-daily-tasks`
     - Click "Invoke" button
     - Method: POST
     - Authorization: Bearer `<your_service_role_key>`

### Option 2: Using PowerShell Script (All-in-One)

```powershell
# Make sure environment variables are set
$env:NEXT_PUBLIC_SUPABASE_URL = "https://your-project.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "your-service-role-key"

# Run the script
.\scripts\regenerate-todays-tasks.ps1
```

**Note:** The script will prompt you to delete tasks manually first, then it will call the edge function.

### Option 3: Manual Steps

1. **Delete today's tasks:**

   ```sql
   -- Check what will be deleted
   SELECT COUNT(*) FROM public.checklist_tasks WHERE due_date = CURRENT_DATE;

   -- Delete today's tasks
   DELETE FROM public.checklist_tasks WHERE due_date = CURRENT_DATE;
   ```

2. **Call edge function:**
   - Use Postman, curl, or your app's API route
   - Endpoint: `POST /api/admin/generate-tasks`
   - Headers: `Authorization: Bearer <your_token>`

## What Gets Deleted

- ✅ All tasks with `due_date = CURRENT_DATE` (today)
- ✅ This includes:
  - Pending tasks
  - In-progress tasks
  - Completed tasks (if they were due today)

## What Gets Regenerated

The edge function will create new tasks for today based on:

- ✅ Active task templates
- ✅ Template frequency (daily, weekly, monthly)
- ✅ Template dayparts
- ✅ Site assignments

## Verification

After regeneration, check:

1. Today's Tasks page shows new tasks
2. Tasks match your active templates
3. Tasks have correct dayparts and times

## Troubleshooting

### No tasks generated?

- Check that you have active templates
- Verify templates have `is_active = true` or no `is_active` column
- Check edge function logs in Supabase Dashboard

### Wrong tasks generated?

- Check template configurations
- Verify site assignments
- Check template frequency settings

### Edge function fails?

- Check Supabase Dashboard → Edge Functions → Logs
- Verify service role key is correct
- Check that templates exist and are active

## Files Created

- `supabase/sql/delete_todays_tasks_and_regenerate.sql` - SQL script to delete today's tasks
- `scripts/regenerate-todays-tasks.ps1` - PowerShell script to automate the process
- `REGENERATE_TODAYS_TASKS.md` - This guide
