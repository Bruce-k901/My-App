# Duplicate/Legacy Tables Analysis

## Overview

Found multiple task-related tables that may be causing confusion and duplicate data issues.

## Task-Related Tables Found

### 1. ✅ **checklist_tasks** (ACTIVE - Main Table)

- **Location**: `supabase/migrations/001_create_checklist_schema.sql`
- **Status**: ✅ Currently in use
- **Purpose**: Main task table for the checklist system
- **Used by**:
  - Active Tasks page
  - Daily Checklist page
  - Task generation function
  - Task completion modal

### 2. ⚠️ **tasks** (LEGACY - May Still Exist)

- **Location**: `supabase/sql/tasks.sql`
- **Status**: ⚠️ Legacy table - may still exist in database
- **Purpose**: Old task system
- **Used by**:
  - `supabase/functions/generate_daily_tasks/index.ts` (old version)
  - `supabase/functions/send_daily_digest/index.ts`
  - `supabase/functions/generate_eho_pack/index.ts`
  - `supabase/functions/cleanup_tasks/index.ts`
- **Action Needed**: Check if still in use, migrate data if needed

### 3. ❌ **task_instances** (DEPRECATED - Should Not Exist)

- **Location**: `supabase/migrations/001_create_task_template_schema.sql`
- **Status**: ❌ Deprecated - should have been removed
- **Purpose**: Old task instance system
- **Action Needed**: Verify if table exists, remove if present

### 4. ⚠️ **site_compliance_tasks** (LEGACY - May Still Exist)

- **Location**: `supabase/migrations/003_create_compliance_schema.sql`
- **Status**: ⚠️ Legacy table - may still exist
- **Purpose**: Old compliance task deployment system
- **Action Needed**: Check if still in use

### 5. ⚠️ **compliance_task_instances** (LEGACY - May Still Exist)

- **Location**: `supabase/migrations/003_create_compliance_schema.sql`
- **Status**: ⚠️ Legacy table - may still exist
- **Purpose**: Old compliance task instances
- **Action Needed**: Check if still in use

### 6. ⚠️ **monitoring_tasks** (LEGACY - May Still Exist)

- **Location**: `supabase/migrations/003_create_compliance_schema.sql`
- **Status**: ⚠️ Legacy table - may still exist
- **Purpose**: Monitoring tasks for out-of-range temperatures
- **Action Needed**: Check if still in use

## Template-Related Tables

### 1. ✅ **task_templates** (ACTIVE)

- **Status**: ✅ Currently in use
- **Used by**: Main template system

### 2. ⚠️ **task_fields** vs **template_fields**

- **task_fields**: From `001_create_task_template_schema.sql` (deprecated)
- **template_fields**: From `001_create_checklist_schema.sql` (active)
- **Action Needed**: Verify which is in use

## Migration Files to Review

### Duplicate Schema Migrations:

1. `001_create_checklist_schema.sql` - ✅ Active
2. `001_create_task_template_schema.sql` - ❌ Deprecated
3. `003_create_compliance_schema.sql` - ⚠️ May contain legacy tables

## Recommended Actions

### 1. Run Diagnostic Script

```sql
-- Run: scripts/diagnose-all-task-tables.sql
-- This will show:
-- - Which tables actually exist
-- - Table structures
-- - Task counts per table
-- - Duplicate patterns
```

### 2. Check for Data in Legacy Tables

- If `tasks` table exists and has data, migrate to `checklist_tasks`
- If `task_instances` exists, verify if it's being used
- Check if legacy compliance tables are still needed

### 3. Update Edge Functions

Several edge functions still reference the old `tasks` table:

- `supabase/functions/generate_daily_tasks/index.ts` (has both old and new code)
- `supabase/functions/send_daily_digest/index.ts`
- `supabase/functions/generate_eho_pack/index.ts`
- `supabase/functions/cleanup_tasks/index.ts`

### 4. Clean Up Migration Files

- Archive or remove deprecated migration files
- Document which tables are active vs legacy

## Scripts Created

1. **`scripts/diagnose-all-task-tables.sql`**
   - Lists all task-related tables
   - Shows table structures
   - Counts tasks in each table
   - Identifies duplicates

2. **`scripts/fix-remove-duplicate-same-name-tasks.sql`**
   - Fixed version of duplicate removal script
   - Includes table existence checks
   - Better error handling

## Next Steps

1. ✅ Run `scripts/diagnose-all-task-tables.sql` to see what actually exists
2. ✅ Review the results to identify which tables are in use
3. ✅ Run `scripts/fix-remove-duplicate-same-name-tasks.sql` to remove duplicates
4. ⚠️ Migrate data from legacy tables if needed
5. ⚠️ Update edge functions to use only `checklist_tasks`
6. ⚠️ Remove or archive deprecated tables
