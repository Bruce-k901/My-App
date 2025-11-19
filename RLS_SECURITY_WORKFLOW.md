# RLS Security Workflow

## ⚠️ NEVER manually delete policies without following this checklist

This document outlines the safe workflow for making Row Level Security (RLS) changes in Supabase. Following this workflow prevents data loss, access issues, and infinite recursion errors.

---

## Before Making RLS Changes

### Step 1: Run Pre-Flight Check

**Run `PRE_FLIGHT_CHECK_BEFORE_CLEANUP.sql` in Supabase SQL Editor**

This script will:

- Backup all current RLS policies
- Check admin user status
- Verify helper functions exist and are configured correctly
- Check for duplicate profiles
- Verify protection triggers exist

### Step 2: Save the Output

**Save the output somewhere safe** (copy to a file or document)

The pre-flight check creates a backup of all your RLS policies. If something goes wrong, you can restore them from this backup.

### Step 3: Verify Admin User Has company_id

Check that your admin user has a `company_id` set:

```sql
SELECT
  id,
  email,
  company_id,
  CASE
    WHEN company_id IS NULL THEN '❌ DANGER: Missing company_id'
    ELSE '✅ OK'
  END as status
FROM profiles
WHERE id = '8066c4f2-fbff-4255-be96-71acf151473d';
```

**Do not proceed if `company_id` is NULL!** Fix it first using the Emergency Recovery section below.

---

## Making RLS Changes

### Step 1: Run Master RLS Reset

**Run `MASTER_RLS_RESET.sql`** (don't manually delete policies)

This script will:

- Safely drop all existing policies
- Recreate helper functions with proper SECURITY DEFINER
- Recreate all RLS policies with correct configuration

**⚠️ DO NOT manually delete policies using `DROP POLICY` commands!** Always use the master reset script to ensure consistency.

### Step 2: Restore Admin User Protection

**Run `PROTECT_ADMIN_USER.sql` to restore protections**

This ensures the admin user cannot be accidentally deleted or have their `company_id` cleared.

### Step 3: Test in Browser

**Refresh app, try clock in/out**

After making RLS changes, always test:

1. Refresh the browser (hard refresh: Ctrl+Shift+R or Cmd+Shift+R)
2. Try clocking in
3. Try clocking out
4. Check that attendance logs load correctly
5. Verify you can access your company's data

---

## After Making Changes

### Step 1: Run Verification Queries

Verify that everything is working correctly:

```sql
-- Check helper function works
SELECT get_user_company_id(); -- Should return your company UUID

-- Check policies were created
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE tablename IN ('profiles', 'sites', 'staff_attendance')
GROUP BY tablename;

-- Verify admin user still has company_id
SELECT
  id,
  email,
  company_id,
  app_role
FROM profiles
WHERE id = '8066c4f2-fbff-4255-be96-71acf151473d';
```

### Step 2: Check for Errors

Check the browser console and Supabase logs for:

- 403 Forbidden errors
- Infinite recursion errors
- Permission denied errors

If you see errors, refer to the "Common Issues" section below.

---

## Emergency Recovery

### If Admin User Loses company_id

If your admin user's `company_id` gets set to NULL, run this immediately:

```sql
UPDATE profiles
SET company_id = 'f99510bc-b290-47c6-8f12-282bea67bd91'
WHERE id = '8066c4f2-fbff-4255-be96-71acf151473d';
```

**Replace the UUIDs with your actual company_id and user_id if different.**

### If You Can't Access the Database

1. Use Supabase Dashboard → SQL Editor
2. Run the emergency recovery SQL above
3. Refresh your app
4. If still not working, check RLS policies are correct

### If Policies Are Broken

1. Restore from the backup created in Step 2 of "Before Making RLS Changes"
2. Or run `MASTER_RLS_RESET.sql` again
3. Then run `PROTECT_ADMIN_USER.sql`

---

## Code Rules

### ❌ NEVER Do These Things

1. **NEVER use `.or()` for profile updates**

   ```typescript
   // ❌ WRONG - Can update multiple profiles
   .update({ company_id: newId })
   .or(`id.eq.${user.id},auth_user_id.eq.${user.id}`)

   // ✅ CORRECT - Update specific profile
   const { data: profile } = await supabase
     .from('profiles')
     .select('id')
     .or(`id.eq.${user.id},auth_user_id.eq.${user.id}`)
     .maybeSingle();

   if (profile?.id) {
     await supabase
       .from('profiles')
       .update({ company_id: newId })
       .eq('id', profile.id);
   }
   ```

2. **NEVER use subqueries in RLS USING clauses**

   ```sql
   -- ❌ WRONG - Causes infinite recursion
   USING (
     company_id IN (
       SELECT company_id FROM profiles WHERE id = auth.uid()
     )
   )

   -- ✅ CORRECT - Use helper function
   USING (
     company_id = get_user_company_id()
   )
   ```

3. **NEVER manually delete policies without backup**
   - Always run pre-flight check first
   - Always use master reset script

### ✅ ALWAYS Do These Things

1. **ALWAYS use `.maybeSingle()` then update by id**

   ```typescript
   // ✅ CORRECT Pattern
   const { data: profile } = await supabase
     .from("profiles")
     .select("id")
     .eq("id", userId)
     .maybeSingle();

   if (profile?.id) {
     await supabase.from("profiles").update({ company_id: newId }).eq("id", profile.id);
   }
   ```

2. **ALWAYS use helper functions in RLS policies**

   ```sql
   -- ✅ CORRECT - Uses SECURITY DEFINER helper
   CREATE POLICY profiles_select_company
     ON public.profiles
     FOR SELECT
     USING (
       id = auth.uid()
       OR company_id = get_user_company_id()
     );
   ```

3. **ALWAYS set `shift_status: 'off_shift'` on clock out**
   ```typescript
   // ✅ CORRECT
   .update({
     clock_out_time: new Date().toISOString(),
     shift_status: 'off_shift', // Must be 'off_shift', not 'clocked_out'
     shift_notes: notes || null
   })
   ```

---

## Common Issues

### 403 Forbidden Error

**Symptom**: `GET /rest/v1/staff_attendance?... 403 (Forbidden)`

**Causes**:

- Missing GRANT permissions on table
- RLS policy blocking access
- Helper function not working

**Solutions**:

```sql
-- Check table permissions
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'staff_attendance';

-- Grant permissions if missing
GRANT SELECT, INSERT, UPDATE ON public.staff_attendance TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.staff_attendance TO anon;

-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'staff_attendance';

-- Verify helper function works
SELECT get_user_company_id();
```

### Infinite Recursion Error

**Symptom**: Database queries hang or timeout, error logs show recursion

**Causes**:

- RLS policy queries the same table it protects
- Helper function missing `SECURITY DEFINER`
- Helper function queries table with RLS enabled

**Solutions**:

```sql
-- Check helper function is SECURITY DEFINER
SELECT
  proname,
  prosecdef as is_security_definer
FROM pg_proc
WHERE proname IN ('get_user_company_id', 'get_user_role');

-- Recreate with SECURITY DEFINER if missing
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER  -- ← This is critical!
STABLE
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
BEGIN
  SELECT company_id INTO v_company_id
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;

  RETURN v_company_id;
END;
$$;
```

### Constraint Violation on Clock Out

**Symptom**: `Error: invalid input value for enum shift_status`

**Causes**:

- Using wrong value for `shift_status` (e.g., `'clocked_out'` instead of `'off_shift'`)
- Database constraint expects specific enum values

**Solutions**:

```typescript
// ✅ CORRECT - Use 'off_shift'
.update({
  clock_out_time: new Date().toISOString(),
  shift_status: 'off_shift', // Not 'clocked_out'!
  shift_notes: notes || null
})

// Check valid enum values
SELECT enumlabel
FROM pg_enum
WHERE enumtypid = (
  SELECT oid FROM pg_type WHERE typname = 'shift_status_enum'
);
```

### Missing company_id

**Symptom**: User can't access company data, `company_id` is NULL

**Causes**:

- Profile update used `.or()` and updated wrong profile
- Database trigger cleared `company_id`
- Manual deletion/modification

**Solutions**:

```sql
-- Check current status
SELECT id, email, company_id
FROM profiles
WHERE id = '8066c4f2-fbff-4255-be96-71acf151473d';

-- Restore company_id
UPDATE profiles
SET company_id = 'f99510bc-b290-47c6-8f12-282bea67bd91'
WHERE id = '8066c4f2-fbff-4255-be96-71acf151473d';

-- Verify protection trigger exists
SELECT trigger_name
FROM information_schema.triggers
WHERE trigger_name = 'protect_admin_user_trigger';

-- If missing, run PROTECT_ADMIN_USER.sql
```

### Duplicate Profiles

**Symptom**: Updates affect wrong user, data inconsistency

**Causes**:

- Multiple profiles with same `auth_user_id`
- Profile creation trigger ran multiple times

**Solutions**:

```sql
-- Find duplicates
SELECT
  auth_user_id,
  COUNT(*) as count,
  array_agg(id) as profile_ids
FROM profiles
WHERE auth_user_id IS NOT NULL
GROUP BY auth_user_id
HAVING COUNT(*) > 1;

-- Merge duplicates (keep the one with company_id)
-- ⚠️ Be very careful with this - backup first!
```

---

## Quick Reference Checklist

### Before RLS Changes

- [ ] Run `PRE_FLIGHT_CHECK_BEFORE_CLEANUP.sql`
- [ ] Save output/backup
- [ ] Verify admin user has `company_id`
- [ ] Check for duplicate profiles

### Making RLS Changes

- [ ] Run `MASTER_RLS_RESET.sql` (not manual deletion)
- [ ] Run `PROTECT_ADMIN_USER.sql`
- [ ] Test in browser (refresh, clock in/out)

### After RLS Changes

- [ ] Run verification queries
- [ ] Check browser console for errors
- [ ] Verify helper functions work
- [ ] Confirm policies were created

### Code Review

- [ ] No `.or()` in profile updates
- [ ] Using `.maybeSingle()` then update by id
- [ ] RLS policies use helper functions
- [ ] Clock out sets `shift_status: 'off_shift'`

---

## Related Files

- `PRE_FLIGHT_CHECK_BEFORE_CLEANUP.sql` - Pre-flight safety checks
- `MASTER_RLS_RESET.sql` - Master RLS reset script (create if needed)
- `PROTECT_ADMIN_USER.sql` - Admin user protection trigger (create if needed)
- `CLEANUP_ATTENDANCE_COMPLETE.sql` - Attendance cleanup (references pre-flight check)

---

## Notes

- Always test in a development environment first
- Keep backups of all SQL scripts
- Document any custom changes to RLS policies
- Review this workflow before major database changes
