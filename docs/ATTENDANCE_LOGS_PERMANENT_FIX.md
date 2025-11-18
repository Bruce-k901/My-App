# Attendance Logs - Permanent Fix Documentation

## Problem

The `attendance_logs` table was migrated to a VIEW that maps to `staff_attendance`. This caused:

- 406 errors when using `clock_in_at::date` filters (PostgREST doesn't support `::date` casting)
- 406 errors when trying to INSERT into the view (views are read-only)

## Permanent Solution

### 1. Database Layer

- **View**: `attendance_logs` is a read-only view mapping to `staff_attendance`
- **Column**: `clock_in_date` is available for date filtering (replaces `clock_in_at::date`)
- **Functions**: All database functions use `clock_in_date`

### 2. Application Layer

- **Fetch Interceptor**: Automatically fixes queries at network level
- **Client Interceptor**: Redirects write operations to `staff_attendance`
- **Guard Module**: Type-safe wrapper (`attendanceLogsGuard`)

## Usage Rules

### ✅ CORRECT Usage

```typescript
// SELECT queries - use attendance_logs view with clock_in_date
const { data } = await supabase
  .from("attendance_logs")
  .select("*")
  .eq("clock_in_date", "2025-11-18") // ✅ Use clock_in_date
  .eq("site_id", siteId);

// INSERT/UPDATE/DELETE - use staff_attendance directly
const { data } = await supabase
  .from("staff_attendance") // ✅ Use staff_attendance for writes
  .insert({
    user_id: userId,
    company_id: companyId,
    site_id: siteId,
    shift_status: "on_shift",
  });

// Or use the guard module
import { attendanceLogsGuard } from "@/lib/attendance-logs-guard";
const { data } = await attendanceLogsGuard.select("*").eq("clock_in_date", "2025-11-18");
```

### ❌ WRONG Usage

```typescript
// ❌ Don't use clock_in_at::date (PostgREST doesn't support it)
const { data } = await supabase
  .from('attendance_logs')
  .select('*')
  .eq('clock_in_at::date', '2025-11-18')  // ❌ WRONG - will cause 406 error

// ❌ Don't try to INSERT into the view
const { data } = await supabase
  .from('attendance_logs')  // ❌ WRONG - views are read-only
  .insert({ ... })  // Will fail with "cannot insert into view"
```

## Protection Layers

### Layer 1: Database View

- View is read-only (cannot INSERT/UPDATE/DELETE)
- `clock_in_date` column available for filtering
- All functions use `clock_in_date`

### Layer 2: Fetch Interceptor (`src/lib/supabase.ts`)

- Intercepts all network requests to `attendance_logs`
- Automatically fixes `clock_in_at::date` → `clock_in_date`
- Redirects INSERT/UPDATE/DELETE to `staff_attendance`

### Layer 3: Client Interceptor (`src/lib/supabase.ts`)

- Intercepts at Supabase client level
- Redirects write operations to `staff_attendance`

### Layer 4: Guard Module (`src/lib/attendance-logs-guard.ts`)

- Type-safe wrapper
- Throws clear errors for wrong usage
- Provides helper functions

## Verification

### Check Database Setup

```sql
-- Run verification function
SELECT * FROM verify_attendance_logs_setup();

-- Should return:
-- check_name              | status | message
-- ------------------------+--------+----------------------------------
-- View exists             | PASS   | attendance_logs view exists
-- clock_in_date column     | PASS   | clock_in_date column exists
-- View is readable         | PASS   | View is accessible for SELECT
```

### Test SELECT Query

```sql
-- This should work
SELECT id FROM attendance_logs
WHERE clock_in_date = CURRENT_DATE
AND site_id = 'your-site-id'
LIMIT 1;
```

### Test Write Protection

```sql
-- This should FAIL (view is read-only)
INSERT INTO attendance_logs (id, user_id, company_id, site_id)
VALUES (gen_random_uuid(), 'user-id', 'company-id', 'site-id');
-- Expected: ERROR - cannot insert into view "attendance_logs"
```

## If It Breaks Again

### Step 1: Check Database

```sql
-- Verify view exists
SELECT * FROM information_schema.views
WHERE table_name = 'attendance_logs';

-- Verify clock_in_date column exists
SELECT column_name FROM information_schema.columns
WHERE table_name = 'attendance_logs' AND column_name = 'clock_in_date';

-- Run verification
SELECT * FROM verify_attendance_logs_setup();
```

### Step 2: Check Application Code

```bash
# Search for problematic patterns
grep -r "clock_in_at::date" src/
grep -r "clock_in_at%3A%3Adate" src/
grep -r "attendance_logs.*insert" src/
```

### Step 3: Check Browser Console

- Look for interceptor warnings
- Check for 406 errors
- Verify redirects are happening

### Step 4: Re-apply Migration

```sql
-- Re-run the permanent fix migration
-- File: supabase/migrations/20250221000010_permanent_fix_attendance_logs.sql
```

## Migration History

1. **20250221000008**: Created attendance_logs view
2. **20250221000009**: Fixed RLS and functions
3. **20250221000010**: PERMANENT FIX - Comprehensive solution

## Key Files

- `supabase/migrations/20250221000010_permanent_fix_attendance_logs.sql` - Database fix
- `src/lib/supabase.ts` - Fetch and client interceptors
- `src/lib/attendance-logs-guard.ts` - Type-safe wrapper
- `src/lib/notifications/attendance.ts` - Main attendance service (uses staff_attendance)

## Best Practices

1. **Always use `clock_in_date` for date filtering** - never `clock_in_at::date`
2. **Use `staff_attendance` for writes** - never try to write to `attendance_logs`
3. **Use the guard module** for new code - it prevents mistakes
4. **Check browser console** - interceptors will warn about issues
5. **Run verification** - use `verify_attendance_logs_setup()` to check setup

## Support

If you encounter issues:

1. Check this documentation first
2. Run the verification function
3. Check browser console for interceptor messages
4. Review the migration file for the latest fixes
