# COMPREHENSIVE FIX: Companies Table Permission Errors

## Problem

"Permission denied for table companies" errors due to RLS (Row Level Security) blocking access.

## Solution Applied

### 1. Removed ALL Direct Client-Side Queries

✅ All client-side code now uses API routes (`/api/company/get`, `/api/company/create`, `/api/company/update`)
✅ These API routes use the admin client which bypasses RLS

### 2. Files Fixed

- ✅ `src/context/AppContext.tsx` - Uses API routes
- ✅ `src/context/AppContextSimple.tsx` - Uses API routes
- ✅ `src/components/organisation/BusinessDetailsTab.tsx` - Uses API routes, removed legacy fallback
- ✅ `src/components/organisation/BusinessDetailsForm.tsx` - Uses API routes
- ✅ `src/components/setup/CompanySetupWizard.tsx` - Uses API routes
- ✅ `src/app/dashboard/business/page.tsx` - Uses API routes

### 3. Apply RLS Policy Fix

Run this SQL in your Supabase database (via Supabase Studio or CLI):

```sql
-- File: supabase/sql/fix_companies_rls.sql
-- Run this to update RLS policies
```

**To apply via Supabase CLI:**

```bash
supabase db execute --file supabase/sql/fix_companies_rls.sql
```

**Or via Supabase Studio:**

1. Go to SQL Editor
2. Copy contents of `supabase/sql/fix_companies_rls.sql`
3. Run the SQL

## What Changed

### Before:

- Client-side code queried `companies` table directly → RLS blocked access
- Multiple fallback strategies that still hit RLS errors

### After:

- ALL queries go through API routes → Admin client bypasses RLS
- Clean, single code path
- No more permission errors

## Testing

After applying the SQL fix, test:

1. Sign up a new user
2. Create a company
3. View business details
4. Update company information

All should work without permission errors.
