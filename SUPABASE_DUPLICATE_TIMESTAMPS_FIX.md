# Fix Duplicate Migration Timestamps

## The Root Problem

You have **multiple migration files with the same timestamp**. For example:

- `20250115000000_fix_compliance_score_function.sql`
- `20250115000000_seed_food_labelling_dating_audit_template.sql`

Both use timestamp `20250115000000`, but Supabase's migration system uses the timestamp as the **primary key** - you can only have **one migration per timestamp**.

## Why This Happens

When migrations are created manually or in parallel, they can end up with duplicate timestamps. The migration history table (`supabase_migrations.schema_migrations`) uses `version` (the timestamp) as the primary key, so it can't store two migrations with the same timestamp.

## The Fix

### Step 1: Remove All Duplicate-Timestamp Migrations from History

Run this SQL in **Supabase Dashboard → SQL Editor**:

**File:** `supabase/sql/fix_duplicate_migrations.sql` (updated)

This removes ALL migrations with duplicate timestamps from the history table.

### Step 2: The CLI Will Apply Them, But...

When you run `supabase db push --include-all`, the CLI will try to apply both files with the same timestamp. It will:

1. Apply the first file successfully
2. Try to apply the second file with the same timestamp
3. **Fail** because the timestamp is already in the history

## Long-Term Solution: Rename Migration Files

You need to give each migration file a **unique timestamp**. Here's how:

### Option A: Use Supabase CLI to Create New Migrations

For each duplicate, create a new migration with a unique timestamp:

```bash
# For each duplicate migration, create a new one with unique timestamp
supabase migration new fix_compliance_score_function
supabase migration new seed_food_labelling_dating_audit_template
# etc...
```

Then copy the SQL content from the old files to the new ones.

### Option B: Manually Rename Files (Quick Fix)

Rename the second file in each duplicate pair to have a slightly later timestamp:

```powershell
# Example: Add 1 second to the timestamp
Rename-Item "20250115000000_seed_food_labelling_dating_audit_template.sql" "20250115000001_seed_food_labelling_dating_audit_template.sql"
```

Do this for all duplicate pairs.

## Recommended Approach

1. **First, remove duplicates from history** (run the SQL fix)
2. **Rename the duplicate migration files** to have unique timestamps
3. **Then run** `supabase db push --include-all`

This ensures each migration has a unique timestamp and can be properly tracked.

## Quick Rename Script

I can create a PowerShell script to automatically rename all duplicate migrations if you'd like. Would you like me to create that?
