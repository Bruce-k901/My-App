# Archived Items Task Exclusion Fix

## Problem

Archived items (assets, users, documents, risk assessments, SOPs) were still being included in task lookups and scheduled task generation. Once an item is archived, it should be excluded from all task-related queries.

## Solution

Added filters to exclude archived items from all task-related queries across the application.

## Changes Made

### 1. Assets - PPM Scheduled Tasks ✅

**Files Fixed:**

- `src/lib/fetchAssets.ts` - Added `.eq('archived', false)` filter
- `src/components/ppm/AddPPMModal.tsx` - Added `.eq('archived', false)` filter
- `supabase/functions/generate-daily-tasks/index.ts` - Already had filter (line 237) ✅
- `supabase/sql/notifications.sql` - Already had filter (line 301) ✅

**Impact:** Archived assets are now excluded from:

- PPM schedule generation
- Asset dropdowns in PPM modals
- Task creation for PPM services

### 2. SOPs - Review Tasks ✅

**File Fixed:**

- `supabase/functions/generate-daily-tasks/index.ts` - Added `.neq('status', 'Archived')` filter (line 317)

**Impact:** Archived SOPs (status = 'Archived') are now excluded from:

- SOP review task generation

### 3. Risk Assessments - Review Tasks ✅

**File Fixed:**

- `supabase/functions/generate-daily-tasks/index.ts` - Added `.neq('status', 'Archived')` filter (line 393)

**Impact:** Archived Risk Assessments (status = 'Archived') are now excluded from:

- Risk assessment review task generation

### 4. Documents - Expiry Tasks ✅

**File Fixed:**

- `supabase/functions/generate-daily-tasks/index.ts` - Added `.eq('is_archived', false)` filter (line 460)

**Impact:** Archived documents are now excluded from:

- Document expiry task generation

### 5. Users - Task Assignment ✅

**Status:** No changes needed

**Reason:** Archived users are moved to the `archived_users` table and removed from `profiles`. Since task assignments reference `profiles.id` (via `sites.gm_user_id` and `task_templates.assigned_to_user_id`), archived users are automatically excluded.

**Note:** If there are existing tasks assigned to users who were later archived, those tasks will still reference the user ID, but new tasks will not be assigned to archived users.

## Archive Field Names by Entity

| Entity           | Archive Field                   | Archive Value         |
| ---------------- | ------------------------------- | --------------------- |
| Assets           | `archived`                      | `false` (boolean)     |
| Users            | Moved to `archived_users` table | N/A                   |
| SOPs             | `status`                        | `'Archived'` (string) |
| Risk Assessments | `status`                        | `'Archived'` (string) |
| Documents        | `is_archived`                   | `false` (boolean)     |

## Files Modified

1. `src/lib/fetchAssets.ts` - Added archived filter
2. `src/components/ppm/AddPPMModal.tsx` - Added archived filter
3. `supabase/functions/generate-daily-tasks/index.ts` - Added archived filters for SOPs, RAs, and documents

## Testing Checklist

- [ ] Verify archived assets don't appear in PPM asset dropdowns
- [ ] Verify PPM tasks are not created for archived assets
- [ ] Verify SOP review tasks are not created for archived SOPs
- [ ] Verify RA review tasks are not created for archived RAs
- [ ] Verify document expiry tasks are not created for archived documents
- [ ] Verify new tasks are not assigned to archived users (should be automatic)

## Notes

- The SQL function `create_ppm_tasks()` in `supabase/sql/notifications.sql` already had the archived asset filter, so no changes were needed there.
- The `generate-daily-tasks` function already filtered archived assets for PPM tasks, so only the asset dropdown queries needed fixing.
- Archived users are handled automatically since they're moved to a separate table.
