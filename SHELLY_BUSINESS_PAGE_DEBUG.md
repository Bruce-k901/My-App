# Shelly's Business Page Debug Guide

## Current Status

✅ **Shelly's profile is correctly linked** to Checkly Test Co:

- Email: `lee@e-a-g.co`
- Full Name: Shelly Roderick
- Role: Manager
- Company ID: `fae1b377-859d-4ba6-bce2-d8aaf0044517` ✅
- Status: ✅ OK

✅ **Company data exists** and has data:

- Name: "Checkly Test Co"
- Industry: "Food & Beverage"
- VAT Number: "GB 17444741"
- Company Number: "128652256"
- Phone: "07891710002"
- Address: "55a Sunderland Road, London, SE23 2PS"
- Status: ✅ Has data

## Issue

Despite correct profile assignment, Shelly sees an empty business page.

## Fixes Applied

### 1. API Route Validation (`src/app/api/company/get/route.ts`)

- ✅ Fixed UUID comparison (convert to strings for reliable comparison)
- ✅ Added better error logging
- ✅ Validates user belongs to requested company

### 2. BusinessDetailsTab Component (`src/components/organisation/BusinessDetailsTab.tsx`)

- ✅ Improved company data handling
- ✅ Ensures all form fields are set (converts null to empty strings)
- ✅ Better handling when `contextCompany` is available
- ✅ Shows helpful error message if company data can't be loaded

## Debugging Steps

### Step 1: Check Browser Console

When Shelly logs in and navigates to Business Details page, check console for:

**Expected Success Messages:**

```
✅ AppContext company loaded: Checkly Test Co
✅ Company fetched: fae1b377-859d-4ba6-bce2-d8aaf0044517
✅ Company access granted: { userId: ..., companyId: ..., companyName: "Checkly Test Co" }
✅ Using contextCompany directly: Checkly Test Co
✅ BusinessDetailsTab rendered, form: { hasForm: true, formId: ..., formName: "Checkly Test Co" }
```

**Error Messages to Look For:**

```
❌ Access denied: User does not belong to requested company
❌ Company not found
⚠️ No company data returned
```

### Step 2: Check Network Tab

1. Open browser DevTools → Network tab
2. Filter by "company"
3. Look for `/api/company/get?id=fae1b377-859d-4ba6-bce2-d8aaf0044517`
4. Check:
   - Status: Should be `200 OK`
   - Response: Should contain company data with `name: "Checkly Test Co"`

### Step 3: Verify AppContext Loading

Check console for AppContext logs:

```
🔄 AppContext loading company: fae1b377-859d-4ba6-bce2-d8aaf0044517
✅ AppContext company found via API route: Checkly Test Co
✅ AppContext company loaded: Checkly Test Co
```

## Common Issues & Solutions

### Issue: "Access denied: You do not have permission"

**Cause:** UUID comparison issue or profile company_id mismatch
**Fix:** Already fixed - UUIDs are now compared as strings

### Issue: Company data loads but form shows empty

**Cause:** Form fields not being set properly when company data has null values
**Fix:** Already fixed - form now ensures all fields are set (null → empty string)

### Issue: "No company data returned"

**Cause:** API route returns 404 or company doesn't exist
**Fix:** Check that company ID matches exactly

### Issue: Context company not loading

**Cause:** AppContext not fetching company after profile loads
**Fix:** Check AppContext logs - should see company fetch after profile loads

## Testing Checklist

After fixes:

- [ ] Shelly logs in
- [ ] Browser console shows `✅ Company fetched: Checkly Test Co`
- [ ] Browser console shows `✅ Company access granted`
- [ ] Network tab shows `/api/company/get` returns 200 with company data
- [ ] Business page shows company name "Checkly Test Co"
- [ ] Business page shows company address, phone, VAT number, etc.
- [ ] Form fields are populated (not empty)

## Files Modified

- ✅ `src/app/api/company/get/route.ts` - Fixed UUID comparison, added validation
- ✅ `src/components/organisation/BusinessDetailsTab.tsx` - Improved data handling
- ✅ `supabase/sql/fix_shelly_profile_assignment.sql` - Profile fix script (not needed, but ready)

## Next Steps

1. **Have Shelly log out and log back in** (to refresh AppContext)
2. **Navigate to Business Details page**
3. **Check browser console** for the success/error messages above
4. **Check Network tab** for API call status
5. **Report what you see** - this will help identify the exact issue

The fixes should resolve the issue, but if Shelly still sees an empty page, the console logs will tell us exactly what's happening.
