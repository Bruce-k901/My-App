# Notification Severity Field Fix

## Problem

Multiple places in the codebase were trying to insert notifications without the required `severity` field, causing 400 (Bad Request) errors. The code had comments saying "Removed as column does not exist", but the `severity` column DOES exist and is required.

## Root Cause

The `notifications` table schema requires `severity` as a NOT NULL field with CHECK constraint:

```sql
severity text not null check (severity in ('info','warning','critical'))
```

However, several notification insert operations had the `severity` field commented out with incorrect notes.

## Solution

Restored the `severity` field in all notification insert operations.

## Files Fixed

1. **`src/components/checklists/TaskCompletionModal.tsx`** (line 2423)
   - Changed: `// severity: 'warning', // Removed as column does not exist`
   - To: `severity: 'warning', // Required field`

2. **`src/components/dashboard/EnhancedShiftHandover.tsx`** (lines 312, 401)
   - Restored `severity: "info"` in both notification inserts

3. **`src/app/dashboard/calendar/page.tsx`** (lines 403, 490)
   - Restored `severity: "info"` and `severity: message.urgent ? "critical" : "info"`

## Impact

- ✅ Late completion alerts will now work correctly
- ✅ Shift handover reminders will work correctly
- ✅ Calendar notifications will work correctly
- ✅ All notification inserts now include the required `severity` field

## Testing

- [ ] Verify late completion alerts are created successfully
- [ ] Verify shift handover reminders work
- [ ] Verify calendar notifications work
- [ ] Check browser console for 400 errors on notification creation
