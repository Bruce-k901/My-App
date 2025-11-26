# Fix Duplicate Migration Error

## The Problem

The repair script added migrations to the `schema_migrations` history table, but the **actual SQL migrations haven't been run yet**. When the CLI tries to apply them, it finds they're already in the history and throws a duplicate key error.

## The Solution

We need to remove these migrations from the history table so the CLI can:

1. Actually run the SQL migrations
2. Properly record them in the history

## Steps to Fix

### Step 1: Remove Duplicate Entries

Run this SQL in **Supabase Dashboard → SQL Editor**:

**File:** `supabase/sql/fix_duplicate_migrations.sql`

This will remove the 18 migrations from the history table so the CLI can apply them.

### Step 2: Apply Migrations via CLI

After running the SQL, run:

```bash
supabase db push --include-all
```

This will:

- Actually run the SQL in each migration file
- Properly record them in the migration history
- Sync everything correctly

## What These Migrations Do

These migrations include important updates:

- Food labelling audit template seeding
- Pricing calculation fixes
- Task generation fixes
- Staff attendance system
- Notification system updates
- Checklist tasks updates
- And more...

## After Running

Once complete, verify with:

```bash
supabase migration list
```

You should see all migrations properly applied and in order.
