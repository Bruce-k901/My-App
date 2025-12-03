# Template Fields Table Fix ✅

## Issue

Templates are not loading with their correct features and seeded data because the `template_fields` table either:

1. Doesn't exist
2. Has incorrect RLS policies blocking access
3. Uses wrong column names

## Root Cause

- Code queries `template_fields` table with `template_id` column
- Schema files create `task_fields` table with `task_template_id` column
- Seed scripts insert into `template_fields` with `template_id` column
- No SQL file creates the `template_fields` table with correct structure and RLS

## Fix Applied

**File:** `supabase/sql/create_template_fields_table.sql`

### Changes:

1. ✅ Created `template_fields` table with correct column names:
   - `template_id` (not `task_template_id`)
   - `field_order` (not `display_order`)
   - `label` (not `field_label`)
   - `required` (not `is_required`)
   - Added `warn_threshold`, `fail_threshold`, `label_value` per schema updates

2. ✅ Created RLS policies that allow:
   - **SELECT**: Access to fields for library templates (company_id IS NULL) AND company templates (user's company)
   - **INSERT/UPDATE/DELETE**: Only admins/owners can modify

3. ✅ Updated error handling in `TaskFromTemplateModal.tsx`:
   - Now logs full error details for debugging
   - Still gracefully handles errors (doesn't break component)

## How to Apply

Run this SQL in Supabase SQL Editor:

```sql
-- Run: supabase/sql/create_template_fields_table.sql
```

This will:

- Create the `template_fields` table if it doesn't exist
- Create correct RLS policies
- Allow access to library templates (seeded data)

## Expected Behavior After Fix

1. **Library templates** (company_id IS NULL):
   - All authenticated users can read `template_fields`
   - Fields load correctly
   - Features are enabled based on template configuration

2. **Company templates**:
   - Only users in the same company can read `template_fields`
   - Fields load correctly for company templates

3. **Error handling**:
   - Errors are logged with full details for debugging
   - Component continues to work even if fields can't be loaded
   - Features still work based on `evidence_types` in template

## Status

✅ **FIXED** - Table creation script created, error handling improved

**Next Step:** Run the SQL script in Supabase to create the table and RLS policies
