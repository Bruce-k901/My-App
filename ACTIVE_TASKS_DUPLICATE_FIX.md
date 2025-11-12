# Active Tasks Duplicate Fix - Complete Solution

## Problem

Duplicates are appearing in the Active Tasks page despite deduplication logic. There are too many to delete manually.

## Root Causes Identified

1. **Database Level**: Duplicates exist in `checklist_tasks` table
2. **Frontend Level**: Deduplication logic had inefficiencies
3. **Query Level**: No database-level deduplication

## Solutions Implemented

### 1. ✅ Improved Frontend Deduplication

**File**: `src/app/dashboard/tasks/active/page.tsx`

**Changes**:

- Improved deduplication algorithm using `Map` for O(1) lookups
- Better sorting to ensure oldest tasks come first
- Enhanced logging to track duplicates
- More efficient filtering

**How it works**:

- Uses a `Map` with combination key as the key
- Keeps only the first occurrence (oldest by `created_at`)
- Logs all duplicates found for debugging

### 2. ✅ Bulk Delete Script

**File**: `scripts/bulk-delete-duplicate-tasks.sql`

**Purpose**: Remove all duplicates from the database in one operation

**Usage**:

1. Run Step 1 to preview what will be deleted
2. Run Step 2 to see the count
3. Uncomment Step 3 to actually delete
4. Run Step 4 to verify cleanup

### 3. ✅ Database View for Deduplicated Tasks

**File**: `supabase/migrations/20250206000004_create_deduplicated_tasks_view.sql`

**Purpose**: Create a database view that automatically deduplicates tasks

**Benefits**:

- Frontend can query the view instead of the table
- Database handles deduplication automatically
- Always returns clean data

**To use**:

```typescript
// In your query, change:
.from('checklist_tasks')
// To:
.from('deduplicated_checklist_tasks')
```

## Implementation Steps

### Step 1: Run Bulk Delete Script

```sql
-- In Supabase SQL Editor
-- Run: scripts/bulk-delete-duplicate-tasks.sql
-- 1. Review Step 1 results
-- 2. Check Step 2 count
-- 3. Uncomment Step 3 and run to delete
-- 4. Verify with Step 4
```

### Step 2: Apply Database View Migration

```bash
# Run the migration
supabase migration up
# Or apply manually in Supabase SQL Editor:
# Run: supabase/migrations/20250206000004_create_deduplicated_tasks_view.sql
```

### Step 3: (Optional) Update Frontend to Use View

If you want to use the database view instead of client-side deduplication:

```typescript
// In src/app/dashboard/tasks/active/page.tsx
// Change line 62 from:
.from('checklist_tasks')
// To:
.from('deduplicated_checklist_tasks')
```

**Note**: The current frontend deduplication should work fine, but using the view is more efficient.

### Step 4: Test

1. Open Active Tasks page
2. Check browser console for duplicate warnings
3. Verify no duplicates appear in the UI
4. Check that tasks are properly sorted

## How Deduplication Works

### Combination Key

Tasks are considered duplicates if they have the same:

- `template_id`
- `site_id`
- `due_date`
- `daypart` (or both null/empty)
- `due_time` (or both null/empty)

### Which Task is Kept

- **Oldest task** (by `created_at`) is always kept
- All newer duplicates are removed/filtered

## Monitoring

### Browser Console

The frontend will log:

- Each duplicate found: `⚠️ Duplicate task detected (will be filtered)`
- Summary: `⚠️ Filtered out X duplicate task(s) from display`

### Database

Run this query to check for remaining duplicates:

```sql
WITH duplicates AS (
  SELECT
    template_id,
    site_id,
    due_date,
    COALESCE(daypart, '') as daypart,
    COALESCE(due_time::text, '') as due_time,
    COUNT(*) as count
  FROM checklist_tasks
  WHERE template_id IS NOT NULL
  GROUP BY template_id, site_id, due_date, COALESCE(daypart, ''), COALESCE(due_time::text, '')
  HAVING COUNT(*) > 1
)
SELECT COUNT(*) as remaining_duplicates FROM duplicates;
```

## Prevention

The unique constraint added in `20250206000003_add_unique_constraint_prevent_duplicates.sql` should prevent new duplicates from being created.

## Files Modified

1. ✅ `src/app/dashboard/tasks/active/page.tsx` - Improved deduplication
2. ✅ `scripts/bulk-delete-duplicate-tasks.sql` - Bulk delete script
3. ✅ `supabase/migrations/20250206000004_create_deduplicated_tasks_view.sql` - Database view

## Next Steps

1. **Immediate**: Run the bulk delete script to clean up existing duplicates
2. **Short-term**: Apply the database view migration
3. **Long-term**: Monitor for new duplicates (shouldn't happen with unique constraint)

## Troubleshooting

### If duplicates still appear:

1. Check browser console for deduplication logs
2. Verify the bulk delete script ran successfully
3. Check if the unique constraint is active
4. Verify the frontend code is using the latest version

### If bulk delete fails:

1. Check for foreign key constraints
2. Verify you have DELETE permissions
3. Try deleting in smaller batches
4. Check for any triggers that might prevent deletion
