# Fix Shelly's Profile Assignment

## Issue

Shelly (Manager) is not properly linked to Checkly Test Co company in the profiles table. The company data exists, but Shelly's profile doesn't have the correct `company_id`.

## Company Information

- **Company ID:** `fae1b377-859d-4ba6-bce2-d8aaf0044517`
- **Company Name:** Checkly Test Co
- **Status:** ✅ Has data (all fields populated)

## Solution

### Step 1: Run Fix Script

Run `supabase/sql/fix_shelly_profile_assignment.sql` in Supabase SQL Editor.

This script will:

1. ✅ Find Shelly by email
2. ✅ Verify Checkly Test Co company exists
3. ✅ Find East Dulwich site (if exists)
4. ✅ Update Shelly's `company_id` to Checkly Test Co
5. ✅ Update `site_id` if site found
6. ✅ Verify the update worked
7. ✅ Show all users in Checkly Test Co

### Step 2: Verify Results

After running the script, check the output:

1. **Shelly Profile Section:**
   - Should show `✅ Linked to Checkly Test Co`
   - `company_id` should be `fae1b377-859d-4ba6-bce2-d8aaf0044517`

2. **All Users Section:**
   - Shelly should appear in the list
   - Should show `✅ OK` status

### Step 3: Test

1. Have Shelly log out and log back in
2. Check browser console for:
   - `✅ Company fetched: Checkly Test Co`
   - `✅ Company access granted`
3. Business page should now show company data

## Manual Fix (If Script Doesn't Work)

If the script can't find Shelly, manually update:

```sql
-- Find Shelly's user ID
SELECT id, email, company_id
FROM profiles
WHERE email ILIKE '%shelly%';

-- Update Shelly's company_id (replace USER_ID_HERE with actual ID)
UPDATE profiles
SET company_id = 'fae1b377-859d-4ba6-bce2-d8aaf0044517'
WHERE id = 'USER_ID_HERE';

-- Verify update
SELECT p.id, p.email, p.company_id, c.name as company_name
FROM profiles p
LEFT JOIN companies c ON c.id = p.company_id
WHERE p.email ILIKE '%shelly%';
```

## Why This Happens

This can occur when:

1. User was created before company was set up
2. User was invited but profile wasn't properly linked
3. Profile was created manually without `company_id`
4. Data migration didn't complete properly

## Prevention

The universal RLS policies script (`ensure_universal_rls_policies.sql`) ensures this works for all companies going forward, but existing users may need their profiles fixed.

## Files Created

- ✅ `supabase/sql/fix_shelly_profile_assignment.sql` - Fix script
- ✅ `supabase/sql/diagnose_shelly_permissions.sql` - Updated diagnostic

## Status

✅ **FIX SCRIPT READY** - Run `fix_shelly_profile_assignment.sql` to fix Shelly's profile
