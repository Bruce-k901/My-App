# Shelly's Business Page Empty - Fix Guide

## Issue

Shelly (Manager) sees an empty business page when logging in, while Mike (Admin) sees the data correctly.

## Root Causes Identified

### 1. API Route Security Issue (FIXED)

**Problem:** The `/api/company/get` route didn't validate that the requesting user belongs to the company they're requesting.

**Fix:** Added validation to check user's `company_id` matches the requested company.

### 2. Possible Profile Issues

- Shelly's profile might not have `company_id` set correctly
- Shelly's `company_id` might be NULL or invalid

### 3. Possible Company Data Issues

- Company record exists but all fields are NULL (empty data)
- Company record doesn't exist

## Diagnostic Steps

### Step 1: Run Diagnostic Script

Run `supabase/sql/diagnose_shelly_permissions.sql` to check:

- Shelly's profile and company assignment
- Company data completeness
- RLS policy access

### Step 2: Run Fix Script

Run `supabase/sql/fix_shelly_company_access.sql` to:

- Fix Shelly's `company_id` if missing
- Verify company data exists
- Check access permissions

### Step 3: Check Browser Console

When Shelly logs in, check the browser console for:

- `✅ Company fetched:` - Should show company name
- `❌ Access denied:` - Indicates permission issue
- `❌ Company not found:` - Indicates company_id issue
- `⚠️ No company data returned` - Indicates empty company record

## Fixes Applied

### 1. API Route Security (`src/app/api/company/get/route.ts`)

- ✅ Added validation that user belongs to requested company
- ✅ Added better error logging
- ✅ Returns 403 if user doesn't belong to company

### 2. BusinessDetailsTab Error Handling (`src/components/organisation/BusinessDetailsTab.tsx`)

- ✅ Improved error logging
- ✅ Shows helpful message if company data not found
- ✅ Better handling of access denied errors

### 3. Diagnostic Scripts Created

- ✅ `supabase/sql/diagnose_shelly_permissions.sql` - Diagnostic queries
- ✅ `supabase/sql/fix_shelly_company_access.sql` - Fix script

## How to Fix

### Option 1: Run Fix Script (Recommended)

```sql
-- Run in Supabase SQL Editor
-- File: supabase/sql/fix_shelly_company_access.sql
```

This will:

1. Find Shelly and Checkly Test Co company
2. Fix Shelly's `company_id` if missing
3. Verify company has data
4. Show diagnostic information

### Option 2: Manual Fix

If the script doesn't work, manually check:

1. **Check Shelly's Profile:**

```sql
SELECT id, email, company_id, app_role
FROM profiles
WHERE email ILIKE '%shelly%';
```

2. **Check Company:**

```sql
SELECT id, name
FROM companies
WHERE name ILIKE '%checkly%test%';
```

3. **Update Shelly's company_id:**

```sql
UPDATE profiles
SET company_id = 'COMPANY_ID_HERE'
WHERE email ILIKE '%shelly%';
```

4. **Check if Company Has Data:**

```sql
SELECT * FROM companies
WHERE id = 'COMPANY_ID_HERE';
```

If company fields are all NULL, you need to populate them via the UI (as Admin).

## Testing

After applying fixes:

1. **Shelly logs in** → Should see business page with data
2. **Check browser console** → Should see `✅ Company fetched: Checkly Test Co`
3. **Check network tab** → `/api/company/get` should return 200 with company data
4. **Verify data** → Business page should show company name, address, etc.

## Common Issues

### Issue: "Access denied: You do not have permission"

**Cause:** Shelly's `company_id` doesn't match the company she's trying to access
**Fix:** Run `fix_shelly_company_access.sql` to update her `company_id`

### Issue: "Company not found"

**Cause:** Shelly's `company_id` is NULL or invalid
**Fix:** Update her `company_id` to match Checkly Test Co's ID

### Issue: Page loads but shows empty form

**Cause:** Company record exists but all fields are NULL
**Fix:** Admin needs to populate company data via Business Details page

## Files Modified

- ✅ `src/app/api/company/get/route.ts` - Added access validation
- ✅ `src/components/organisation/BusinessDetailsTab.tsx` - Improved error handling
- ✅ `supabase/sql/diagnose_shelly_permissions.sql` - Diagnostic script
- ✅ `supabase/sql/fix_shelly_company_access.sql` - Fix script

## Status

✅ **API Route Fixed** - Now validates user access
✅ **Error Handling Improved** - Better logging and user messages
✅ **Diagnostic Scripts Created** - Ready to run

## Next Steps

1. Run `fix_shelly_company_access.sql` in Supabase SQL Editor
2. Check the output to see what was fixed
3. Have Shelly log in and check browser console
4. If still empty, check if company data needs to be populated
