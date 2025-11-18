# Fix for Recursive Trigger Loop - attendance_logs sync

**Date:** February 2025  
**Issue:** Stack depth limit exceeded when clocking out  
**Status:** ✅ FIXED (Migration Created)

---

## 🐛 Problem

Getting **PostgreSQL stack depth limit exceeded** error when clocking out:

```
Error: stack depth limit exceeded
code: '54001'
```

**Root Cause:**

- **Bidirectional sync triggers** creating infinite recursion:
  1. Clock out updates `staff_attendance`
  2. Trigger `trg_sync_staff_to_logs` fires → updates `attendance_logs`
  3. Trigger `trg_sync_attendance_logs_update` fires → updates `staff_attendance`
  4. Back to step 2 → **infinite loop** 🔄

---

## ✅ Solution

### Migration Created: `20250220000020_fix_attendance_logs_recursive_trigger.sql`

**Fix Strategy:**

1. **Session variable guard** - Use `app.syncing_attendance` to track sync state
2. **Check sync flag** - Skip sync if already in progress (prevents recursion)
3. **Check if sync needed** - Skip sync if values haven't changed

### Key Changes:

#### 1. `sync_attendance_logs_update()` Function

```sql
-- Check if already syncing (prevents recursion)
v_syncing := COALESCE(current_setting('app.syncing_attendance', TRUE)::boolean, FALSE);
IF v_syncing THEN
  RETURN NEW; -- Already syncing, skip
END IF;

-- Check if update is actually needed
IF OLD.clock_out_at IS NOT DISTINCT FROM NEW.clock_out_at THEN
  RETURN NEW; -- Skip sync if no changes
END IF;

-- Set sync flag
PERFORM set_config('app.syncing_attendance', 'true', TRUE);

UPDATE public.staff_attendance SET ...;

-- Clear sync flag
PERFORM set_config('app.syncing_attendance', 'false', TRUE);
```

#### 2. `sync_staff_attendance_to_logs()` Function

```sql
-- Check if already syncing (prevents recursion)
v_syncing := COALESCE(current_setting('app.syncing_attendance', TRUE)::boolean, FALSE);
IF v_syncing THEN
  RETURN NEW; -- Already syncing, skip
END IF;

-- Check if sync is needed
IF OLD.clock_out_time IS NOT DISTINCT FROM NEW.clock_out_time THEN
  RETURN NEW; -- Skip sync if no changes
END IF;

-- Set sync flag
PERFORM set_config('app.syncing_attendance', 'true', TRUE);

INSERT ... ON CONFLICT DO UPDATE ...;

-- Clear sync flag
PERFORM set_config('app.syncing_attendance', 'false', TRUE);
```

---

## 📝 How to Apply

### In Supabase SQL Editor:

1. **Open Supabase Dashboard** → SQL Editor
2. **Run Migration:**
   ```sql
   -- Copy and paste the contents of:
   -- supabase/migrations/20250220000020_fix_attendance_logs_recursive_trigger.sql
   ```
3. **Verify:** Try clocking out - should work without errors

---

## 🔍 Technical Details

### Before Fix (Infinite Loop):

```
Clock Out → UPDATE staff_attendance
  ↓
Trigger: trg_sync_staff_to_logs
  ↓
UPDATE attendance_logs
  ↓
Trigger: trg_sync_attendance_logs_update
  ↓
UPDATE staff_attendance (again!)
  ↓
[LOOP CONTINUES] → Stack overflow ❌
```

### After Fix (Session variable guard):

```
Clock Out → UPDATE staff_attendance
  ↓
Trigger: trg_sync_staff_to_logs
  ↓
  → Set app.syncing_attendance = 'true'
  ↓
UPDATE attendance_logs
  ↓
Trigger: trg_sync_attendance_logs_update
  ↓
  → Sees app.syncing_attendance = 'true'
  ↓
  → Skips sync (returns immediately)
  ↓
  → Clear app.syncing_attendance = 'false'
  ↓
[DONE] ✅
```

---

## ✅ Verification

After applying the migration:

1. **Clock In** - Should work normally
2. **Clock Out** - Should work without stack depth error
3. **Check attendance_logs** - Should be synced correctly
4. **Check staff_attendance** - Should have correct clock_out_time

---

## 📚 Related Files

- `supabase/migrations/20250220000020_fix_attendance_logs_recursive_trigger.sql` - **NEW MIGRATION**
- `supabase/migrations/20250220000012_fix_attendance_logs_queries.sql` - Original sync setup
- `supabase/migrations/20250220000000_create_staff_attendance.sql` - Staff attendance table

---

**Status:** ✅ **MIGRATION CREATED** - Apply in Supabase SQL Editor to fix recursive trigger loop
