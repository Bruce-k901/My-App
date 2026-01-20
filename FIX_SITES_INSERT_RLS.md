# Fix Sites INSERT RLS Issue

## Problem

Getting error: "new row violates row-level security policy for table 'sites'" when trying to add new sites.

## Root Cause

The sites INSERT RLS policy was directly querying the `profiles` table, which can cause infinite recursion or fail if RLS blocks the query.

## Solution

### Step 1: Run the SQL Fix

You need to run the comprehensive SQL fix against your Supabase database:

**File:** `supabase/sql/fix_sites_insert_rls_comprehensive.sql`

**How to run:**

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Copy and paste the entire contents of `fix_sites_insert_rls_comprehensive.sql`
4. Click "Run"

**OR via CLI:**

```bash
psql <your-connection-string> -f supabase/sql/fix_sites_insert_rls_comprehensive.sql
```

### Step 2: Verify the Fix

After running the SQL, verify it worked by running the diagnostic script:

**File:** `supabase/sql/diagnose_sites_insert_rls.sql`

This will show you:

- Whether helper functions exist
- Your current user's profile info
- What RLS policies are active
- Whether you have the right permissions

### Step 3: Check Your User Profile

The INSERT policy requires:

1. ✅ You have a `company_id` in your profile
2. ✅ Your `app_role` is either 'owner' or 'admin' (case-insensitive)

To check your profile, run this in SQL Editor:

```sql
SELECT id, email, company_id, app_role
FROM profiles
WHERE id = auth.uid();
```

If your `app_role` is not 'owner' or 'admin', you'll need to update it:

```sql
UPDATE profiles
SET app_role = 'admin'
WHERE id = auth.uid();
```

### Step 4: Test Again

After applying the fix:

1. Refresh your browser
2. Try adding a new site again
3. Check the browser console for detailed error messages (I've added better logging)

## What the Fix Does

1. **Drops all existing sites policies** - Clean slate to avoid conflicts
2. **Creates security definer helper functions** - These bypass RLS to avoid recursion:
   - `get_user_company_id()` - Gets your company_id
   - `is_user_owner_or_admin()` - Checks if you're owner/admin
3. **Creates new policies** - Uses the helper functions instead of direct queries
4. **Adds DELETE policy** - For completeness

## Enhanced Error Logging

I've also updated `SiteFormBase.tsx` to log more detailed error information. Check your browser console for:

- The exact error message
- Your profile information
- The site data being saved

This will help diagnose any remaining issues.

## Files Changed

1. ✅ `supabase/sql/fix_sites_insert_rls_comprehensive.sql` - Comprehensive fix
2. ✅ `supabase/sql/diagnose_sites_insert_rls.sql` - Diagnostic script
3. ✅ `supabase/sql/rls_policies_authoritative.sql` - Updated authoritative policies
4. ✅ `src/components/sites/SiteFormBase.tsx` - Enhanced error logging

## Still Having Issues?

If you're still getting errors after running the SQL fix:

1. **Check the diagnostic output** - Run `diagnose_sites_insert_rls.sql` and share the results
2. **Check browser console** - Look for the detailed error logs I added
3. **Verify your profile** - Make sure you have `company_id` and `app_role` set correctly
4. **Check for multiple policies** - The diagnostic script will show all policies on the sites table









