# Stockly 406 Error Fix

## Problem

Getting 406 (Not Acceptable) errors when querying Stockly tables:

- `stock_levels`
- `stock_items`
- `deliveries`
- `waste_logs`
- `daily_sales_summary`

## Root Cause

The code is using `.schema('stockly')` to query tables directly, but PostgREST expects queries to use the `public` schema views that expose the `stockly` tables.

## Solution

Remove `.schema('stockly')` from all queries and use the `public` schema views instead.

### Migration Setup

The migration `06-stockly-public-views.sql` creates views in the `public` schema:

- `public.stock_levels` → `stockly.stock_levels`
- `public.stock_items` → `stockly.stock_items`
- `public.deliveries` → `stockly.deliveries`
- `public.waste_logs` → `stockly.waste_logs`
- `public.daily_sales_summary` → `stockly.daily_sales_summary`

These views have `security_invoker = true` and proper RLS policies.

## Files to Fix

### ✅ Fixed

- `src/app/dashboard/stockly/page.tsx` - All queries updated

### ⚠️ Needs Fixing

- `src/components/stockly/panels/QuickStockCountPanel.tsx` (6 instances)
- `src/components/stockly/panels/QuickStaffPurchasePanel.tsx` (6 instances)
- `src/components/stockly/panels/QuickWastePanel.tsx` (6 instances)
- `src/components/stockly/panels/QuickDeliveryPanel.tsx` (8 instances)
- `src/components/stockly/QuickStockCountPanel.tsx` (6 instances)

## Fix Pattern

**Before:**

```typescript
const { data } = await supabase.schema("stockly").from("stock_items").select("*");
```

**After:**

```typescript
const { data } = await supabase
  .from("stock_items") // Uses public schema view
  .select("*");
```

## Verification

After fixing, verify:

1. No 406 errors in browser console
2. Stockly dashboard loads correctly
3. All queries return data as expected

## Quick Fix Command

To find all instances:

```powershell
grep -r "\.schema\('stockly'\)" src/
```

To fix automatically (use with caution):

```powershell
# This is a manual process - review each file
```
