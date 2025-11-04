# Apply Checklist Migration - INSTRUCTIONS

## The Problem

Your database has an **OLD** `task_templates` schema with wrong columns:

- ❌ `title` (should be `name`)
- ❌ `days_of_week` (not in new schema)
- ❌ `audience`, `tags`, `weight` (not in new schema)
- ❌ Missing: `slug`, `instructions`, `evidence_types`, `is_template_library`, etc.

The **CHECKLIST** migration was NEVER APPLIED.

## Solution

You need to run the checklist migration to create the correct tables. Since the system is still in wireframe mode, you can safely:

### Option 1: Drop and Recreate (EASIEST - if no important data)

Run this in Supabase SQL Editor:

```sql
-- Drop old task_templates table if it exists
DROP TABLE IF EXISTS public.task_templates CASCADE;

-- Run the checklist migration
\i supabase/migrations/001_create_checklist_schema.sql
```

### Option 2: Keep Old Table and Create New One (if you have data to keep)

Run the migration as-is. It will create the correct schema alongside the old one.

## Migration to Run

**File:** `supabase/migrations/001_create_checklist_schema.sql`

This creates:

1. ✅ `task_templates` with **name** column
2. ✅ `template_fields`
3. ✅ `checklist_tasks`
4. ✅ `task_completion_records`
5. ✅ `template_repeatable_labels`
6. ✅ `contractor_callouts`

## After Migration

1. Regenerate types:

```bash
supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/supabase.ts
```

2. Test the template creation again

## Which Migration File?

The CORRECT migration is:

- ✅ `supabase/migrations/001_create_checklist_schema.sql` - USE THIS ONE

The WRONG migrations are:

- ❌ `supabase/migrations/001_create_task_template_schema.sql` - OLD schema with task_instances
- ❌ `supabase/migrations/003_create_compliance_schema.sql` - Different table name

## Quick Fix Command

If you're using Supabase CLI:

```bash
# Check current migrations
supabase migration list

# Apply new migration
supabase db push

# Or manually in SQL Editor, paste the entire contents of:
# supabase/migrations/001_create_checklist_schema.sql
```
