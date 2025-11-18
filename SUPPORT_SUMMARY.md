# Support Summary - Recent Work Status

## ✅ All Billing/Addon Work is INTACT

All recent work on the billing and addon system is **still present** in the codebase:

### Files Confirmed Present:

- ✅ `src/components/billing/AddonsSelection.tsx` - Contains all per-site quantity UI, collapsible sections, "Apply to All" functionality
- ✅ `src/app/api/billing/purchase-addon/route.ts` - API route with per-site quantities support
- ✅ `src/app/dashboard/billing/page.tsx` - Main billing page with tabs
- ✅ `src/components/billing/PlanSelection.tsx` - Plan selection component
- ✅ All migrations in `supabase/migrations/` directory

### Recent Features Implemented:

1. **Per-site quantity configuration** - Users can set different quantities for each site
2. **Collapsible UI** - Clean, expandable site quantity sections
3. **"Apply to All" helper** - Quick action to set same quantity for all sites
4. **RLS policy fixes** - INSERT/UPDATE policies for addon purchases
5. **£80/sensor pricing** - Updated hardware costs

## 🔧 406 Error Fix

The 406 error is caused by queries using `clock_in_at::date` which PostgREST doesn't support.

### Current Status:

- ✅ Migration `20250220000019_fix_attendance_logs_rest_api_query.sql` exists and creates `clock_in_date` column
- ✅ Helper functions in `src/lib/attendance-logs.ts` use `clock_in_date` (correct)
- ⚠️ **Issue**: Some code may still be using `clock_in_at::date` filter

### Solution:

The error URL shows: `clock_in_at%3A%3Adate=eq.2025-11-18` which decodes to `clock_in_at::date=eq.2025-11-18`

**This query pattern needs to be replaced with:**

```typescript
// ❌ WRONG (causes 406):
.eq('clock_in_at::date', date)

// ✅ CORRECT:
.eq('clock_in_date', date)
```

### Action Items:

1. Search codebase for any remaining `clock_in_at::date` usage
2. Ensure migration `20250220000019` has been applied to database
3. Verify `clock_in_date` column exists and is populated via trigger

## 📋 Migration Checklist

Run these migrations in order:

1. ✅ `20250221000000_add_hardware_costs_to_addons.sql` - Hardware cost columns
2. ✅ `20250221000001_fix_pro_plan_pricing.sql` - Pro plan per-site pricing
3. ✅ `20250221000002_update_monthly_amount_calculation.sql` - Monthly amount calculation
4. ✅ `20250221000003_add_per_site_quantities.sql` - Per-site quantities table
5. ✅ `20250221000004_fix_addon_rls_and_pricing.sql` - RLS policies + £80/sensor pricing
6. ⚠️ `20250220000019_fix_attendance_logs_rest_api_query.sql` - Fix 406 errors (if not already applied)

## 🎯 Next Steps

1. **Fix 406 Error**:
   - Apply migration `20250220000019` if not already done
   - Search for any code still using `clock_in_at::date` and update to `clock_in_date`

2. **Verify Billing**:
   - Test addon purchase flow
   - Verify per-site quantities are saving correctly
   - Check pricing calculations show £80/sensor

3. **Database Check**:

   ```sql
   -- Verify clock_in_date column exists
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'attendance_logs' AND column_name = 'clock_in_date';

   -- Verify trigger exists
   SELECT * FROM pg_trigger WHERE tgname = 'trg_update_attendance_logs_date';
   ```
