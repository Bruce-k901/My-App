# Fix: Tasks for Archived Assets

## Problem

Tasks (PPM and follow-up) were being created for assets that have been moved to Archive. Examples:

- `PPM Required: TESTSET-2025 Double Door Freezer` (asset is archived)
- `Follow up: TESTSET-2025 Double Door Freezer Callout` (asset is archived)

## Solution

### 1. SQL Fix (`FIX_ARCHIVED_ASSETS_TASKS.sql`)

**Deletes existing tasks for archived assets:**

- PPM tasks (`source_type = 'ppm_service'`)
- Follow-up tasks (`source_type = 'callout_followup'`)
- Tasks linked via `callout_id` column

**Creates helper functions:**

- `is_asset_archived(asset_id)` - Check if asset is archived
- `is_callout_asset_archived(callout_id)` - Check if callout's asset is archived

### 2. Edge Function Fix (`generate-daily-tasks/index.ts`)

**Already fixed** - PPM task generation already filters archived assets:

```typescript
.eq("archived", false) // Line 237
if (!asset || asset.archived) continue; // Line 254
```

### 3. API Route Fix (`src/app/api/tasks/create-ppm-followup/route.ts`)

**Added check** before creating follow-up task:

- Checks if asset is archived
- Returns success (but skipped) if asset is archived
- Prevents task creation for archived assets

## What To Do

### Step 1: Run SQL Fix

```sql
-- Run in Supabase SQL Editor
\i FIX_ARCHIVED_ASSETS_TASKS.sql
```

Or copy/paste the contents of `FIX_ARCHIVED_ASSETS_TASKS.sql` into Supabase SQL Editor.

### Step 2: Verify Existing Tasks Deleted

Run this query to verify no tasks remain for archived assets:

```sql
SELECT
  COUNT(*) as tasks_for_archived_assets
FROM checklist_tasks ct
WHERE (
  -- PPM tasks
  (ct.task_data->>'source_type' = 'ppm_service'
   AND EXISTS (
     SELECT 1 FROM assets a
     WHERE a.id = (ct.task_data->>'asset_id')::uuid
       AND a.archived = true
   ))
  OR
  -- Follow-up tasks
  (ct.task_data->>'source_type' = 'callout_followup'
   AND EXISTS (
     SELECT 1 FROM callouts c
     JOIN assets a ON a.id = c.asset_id
     WHERE c.id = (ct.task_data->>'callout_id')::uuid
       AND a.archived = true
   ))
  OR
  -- Tasks via callout_id column
  (ct.callout_id IS NOT NULL
   AND EXISTS (
     SELECT 1 FROM callouts c
     JOIN assets a ON a.id = c.asset_id
     WHERE c.id = ct.callout_id
       AND a.archived = true
   ))
);
```

Should return `0`.

### Step 3: Deploy Code Changes

The API route fix is already applied. No deployment needed if you're running locally, but if deployed:

```bash
# The changes are in the codebase, just commit and push
git add src/app/api/tasks/create-ppm-followup/route.ts
git commit -m "fix: prevent follow-up tasks for archived assets"
git push
```

## Expected Behavior

### ✅ After Fix:

- **PPM tasks**: Only created for non-archived assets (already working)
- **Follow-up tasks**: Not created if asset is archived (now fixed)
- **Existing tasks**: Deleted for archived assets (SQL fix)

### ⚠️ Important Notes:

- Tasks created **before** an asset was archived will be deleted by the SQL fix
- Tasks created **after** an asset is archived will be prevented (API/edge function checks)
- The callout itself can still be created for archived assets (that's fine)
- Only the **follow-up task** is prevented

## Testing

1. **Create a callout for an archived asset:**
   - Callout should be created successfully
   - Follow-up task should NOT be created (check Today's Tasks)

2. **Check existing tasks:**
   - Run verification query above
   - Should return 0 tasks for archived assets

3. **PPM task generation:**
   - Edge function already filters archived assets
   - No PPM tasks should be created for archived assets
