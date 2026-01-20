# Template RLS Fix - Global Template Access

## Problem

Tasks are not showing in "Today's Tasks" because templates cannot be loaded. The RLS policy for `task_templates` was blocking access to global templates (where `company_id IS NULL`).

## Root Cause

The RLS policy `task_templates_select_company` only allowed access to templates where `company_id` matched the user's company. It did not allow access to global templates that are shared across all companies.

## Solution

### 1. Update RLS Policy

The RLS policy has been updated to allow access to:

- **Global templates** (`company_id IS NULL`) - visible to all authenticated users
- **Company-specific templates** - visible to users from that company

### 2. Apply SQL Fix

Run the SQL script to update the RLS policy:

```bash
# Apply the fix
psql $DATABASE_URL -f supabase/sql/fix_task_templates_rls_global_access.sql
```

Or apply it through the Supabase dashboard SQL editor.

### 3. Temporary: Show Orphaned Tasks

To help diagnose the issue, orphaned tasks (tasks with missing templates) are temporarily being shown with a warning instead of being hidden. Once templates are loading correctly, we should change this back to hiding orphaned tasks.

**Files modified:**

- `src/app/dashboard/todays_tasks/page.tsx` - Line 405-411
- `src/app/dashboard/checklists/page.tsx` - Line 466-472

**To revert (once templates are loading):**
Change `return true;` back to `return false;` in both files.

## Files Changed

1. `supabase/sql/rls_policies_authoritative.sql` - Updated RLS policy to allow global template access
2. `supabase/sql/fix_task_templates_rls_global_access.sql` - SQL script to apply the fix
3. `src/app/dashboard/todays_tasks/page.tsx` - Temporarily show orphaned tasks
4. `src/app/dashboard/checklists/page.tsx` - Temporarily show orphaned tasks

## Next Steps

1. Apply the SQL fix to the database
2. Test that templates are now loading correctly
3. Verify that tasks appear in "Today's Tasks"
4. Once confirmed, revert the temporary change to hide orphaned tasks again












