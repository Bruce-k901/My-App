# Identity Standardization - Audit Status

**Date:** February 12, 2025  
**Status:** Migration file exists, but audit needed to verify current state

---

## Current Situation

### ✅ What We Have

1. **Migration File Exists**
   - `supabase/migrations/20250212000001_identity_standardization.sql`
   - Created: 2025-02-12
   - Purpose: Rename all `user_id` → `profile_id`, update foreign keys
   - Covers multiple tables: `staff_attendance`, `messages`, `notifications`, etc.

2. **Existing Audit Script**
   - `scripts/audit-identity-columns.sql`
   - Similar functionality to the Day 1 audit

3. **Downloaded Audit Script**
   - `c:\Users\bruce\Downloads\day1-identity-audit.sql`
   - More comprehensive with 4 queries
   - Includes helpful documentation

### ❓ What We Don't Know

- **Has the migration been APPLIED to the database?**
- **What is the current state of user_id vs profile_id columns?**
- **Are there any remaining issues to fix?**

---

## What to Do

### Option 1: Run Audit BEFORE Migration (Recommended)

If you haven't applied the migration yet:

1. **Run the Day 1 Audit** (`day1-identity-audit.sql`)
   - This will show you what needs fixing
   - Save the results
   - Share with me if you need help interpreting

2. **Review the Results**
   - Check how many tables have `user_id` (needs fixing)
   - Check how many tables have `profile_id` (correct)
   - Check foreign keys to `auth.users` (must change)

3. **Apply Migration**
   - Run `20250212000001_identity_standardization.sql`
   - Monitor for any errors

4. **Re-run Audit** (verify)
   - Should show 0 tables with `user_id`
   - Should show all foreign keys pointing to `profiles`

### Option 2: Run Audit AFTER Migration (Verification)

If the migration has already been applied:

1. **Run the Day 1 Audit** (`day1-identity-audit.sql`)
   - This will verify everything was fixed correctly
   - Should show 0 tables with `user_id` (all renamed to `profile_id`)
   - Should show all foreign keys pointing to `profiles(id)`, not `auth.users(id)`

2. **Check for Remaining Issues**
   - Any tables still using `user_id`? → Needs fixing
   - Any foreign keys still pointing to `auth.users`? → Needs fixing
   - Any RLS policies using `auth.uid()` incorrectly? → Needs review

---

## How to Run the Audit

### In Supabase SQL Editor:

1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy the entire `day1-identity-audit.sql` script
4. Paste into SQL Editor
5. Click "Run"
6. Review the 4 query results

### What Each Query Shows:

**Query 1: Find All User Reference Columns**
- Shows all tables with `user_id`, `profile_id`, `sender_id`, etc.
- Shows what each column references (foreign key target)
- **Look for:** Any `user_id` columns → Needs fixing

**Query 2: Summary Statistics**
- Shows count of tables with `user_id` vs `profile_id`
- **Look for:** 
  - High count of `user_id` tables → Migration not applied yet
  - High count of `profile_id` tables → Migration likely applied

**Query 3: Foreign Keys to auth.users**
- Shows all foreign keys still pointing to `auth.users`
- **Look for:** Any results → Must be fixed (should point to `profiles`)

**Query 4: RLS Policies Using auth.uid()**
- Shows RLS policies that use `auth.uid()`
- **Look for:** Policies that might need updates after migration

---

## Expected Results

### Before Migration:
```
Query 2 Results:
- TABLES USING user_id (NEEDS FIXING): X (some number > 0)
- TABLES USING profile_id (CORRECT): Y (some number)
- TABLES USING sender_id (NEEDS FIXING): Z (some number)

Query 3 Results:
- Several foreign keys pointing to auth.users
```

### After Migration:
```
Query 2 Results:
- TABLES USING user_id (NEEDS FIXING): 0 ✅
- TABLES USING profile_id (CORRECT): X+Y (all tables)
- TABLES USING sender_id (NEEDS FIXING): 0 ✅

Query 3 Results:
- 0 foreign keys pointing to auth.users ✅
- All foreign keys pointing to profiles(id) ✅
```

---

## Next Steps

1. **Run the audit** using `day1-identity-audit.sql`
2. **Share the results** with me (or save them)
3. **Interpret the results:**
   - If migration not applied → Apply migration
   - If migration applied → Verify no issues remain
   - If issues found → Create fix script

---

## Migration File Coverage

Based on the migration file, these tables are covered:

- ✅ `staff_attendance` - user_id → profile_id
- ✅ `messages` - sender_id → sender_profile_id, receiver_id → receiver_profile_id
- ✅ `conversation_participants` - user_id → profile_id
- ✅ `message_reads` - user_id → profile_id
- ✅ `notifications` - user_id → profile_id (with data migration)
- ✅ `profile_settings` - user_id → profile_id

**Note:** The audit script will find ALL tables with user references, not just these. The migration may not cover everything, so the audit is critical to find any missed tables.

---

**Recommendation:** Run the audit NOW to understand the current state, then we can decide next steps based on the results.
