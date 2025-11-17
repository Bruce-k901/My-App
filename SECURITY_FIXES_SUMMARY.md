# Security Fixes Summary

## Overview

This document outlines the security issues found and how to fix them.

## Issues Found

### 1. RLS Disabled on Tables (11 tables)

**Status**: ✅ Ready to fix

**Active Tables** (must fix):

- `assets` - Has policies but RLS disabled
- `conversations` - Has policies but RLS disabled
- `contractors` - No RLS enabled
- `site_closures` - No RLS enabled
- `archived_users` - No RLS enabled
- `troubleshooting_questions` - No RLS enabled

**Legacy Tables** (consider dropping):

- `ppm_schedule_redundant` - Only in types file, not used
- `user_scope_assignments` - Not found in codebase
- `company_regions` - Not found in codebase
- `company_areas` - Not found in codebase

### 2. Security Definer Views (7 views)

**Status**: ⚠️ Needs manual fix

**Active Views** (must fix):

- `ppm_schedule` - Used in PPMDrawer.tsx
- `profile_settings` - Used in settings/calendar pages
- `site_compliance_score_latest` - Used in compliance API
- `ppm_full_schedule` - Referenced in types
- `tenant_compliance_overview` - Used in compliance API
- `v_current_profile` - Need to verify usage
- `v_user_sites` - Need to verify usage

### 3. RLS Policies Using user_metadata (4 policies)

**Status**: ✅ Ready to fix

**Policies to replace**:

- `profiles: select by company (jwt+user_metadata)`
- `profiles: update by admins/managers (jwt+user_metadata)`
- `profiles: self-update (jwt+user_metadata)`
- `sites: select by company (jwt+user_metadata)`

## Fix Steps

### Step 1: Enable RLS on Active Tables ✅

**File**: `FIX_SECURITY_ISSUES.sql` (Part 1 & 2)

Run this script to:

- Enable RLS on all active tables
- Create RLS policies where missing

**Impact**: Low risk - these tables already have policies or are actively used

### Step 2: Handle Legacy Tables ⚠️

**File**: `DROP_LEGACY_TABLES.sql`

**Option A**: Drop unused tables (recommended if confirmed unused)

- `ppm_schedule_redundant`
- `user_scope_assignments`
- `company_regions`
- `company_areas`

**Option B**: Enable RLS on them (safer, adds technical debt)

- Keep tables but enable RLS
- Create basic policies

**Recommendation**: Drop them if you've confirmed they're unused

### Step 3: Fix user_metadata Policies ✅

**File**: `FIX_SECURITY_ISSUES.sql` (Part 5)

This script will:

- Drop insecure policies using `user_metadata`
- Recreate them using proper `company_id` checks from `profiles` table

**Impact**: Medium risk - test thoroughly after applying

### Step 4: Fix Security Definer Views ⚠️

**File**: `FIX_SECURITY_DEFINER_VIEWS.sql`

**Process**:

1. Query database to get view definitions
2. Drop each view
3. Recreate without SECURITY DEFINER
4. Test that views still work

**Already Fixed**:

- `site_compliance_score_latest` ✅
- `tenant_compliance_overview` ✅

**Still Need Fixing**:

- `ppm_schedule` - Need to get definition
- `profile_settings` - Need to get definition
- `ppm_full_schedule` - Need to get definition
- `v_current_profile` - Need to get definition
- `v_user_sites` - Need to get definition

## Execution Order

1. ✅ **Run `FIX_SECURITY_ISSUES.sql`** - Fixes RLS and user_metadata policies
2. ⚠️ **Decide on legacy tables** - Drop or enable RLS
3. ⚠️ **Fix remaining views** - Use `FIX_SECURITY_DEFINER_VIEWS.sql` as guide

## Testing Checklist

After applying fixes:

- [ ] Verify `assets` table queries work
- [ ] Verify `conversations` table queries work
- [ ] Verify `contractors` table queries work
- [ ] Verify `site_closures` table queries work
- [ ] Verify `archived_users` table queries work
- [ ] Verify `troubleshooting_questions` table queries work
- [ ] Verify `ppm_schedule` view queries work
- [ ] Verify `profile_settings` view queries work
- [ ] Verify compliance API endpoints work
- [ ] Verify user can only see their company's data
- [ ] Verify managers can update profiles
- [ ] Verify users can update their own profile

## Rollback Plan

If issues occur:

1. **RLS Issues**: Disable RLS temporarily

   ```sql
   ALTER TABLE public.table_name DISABLE ROW LEVEL SECURITY;
   ```

2. **View Issues**: Restore views from backup or recreate with SECURITY DEFINER

   ```sql
   CREATE VIEW public.view_name WITH (security_definer = true) AS ...;
   ```

3. **Policy Issues**: Drop new policies and restore old ones
   ```sql
   DROP POLICY policy_name ON public.table_name;
   ```

## Files Created

1. `FIX_SECURITY_ISSUES.sql` - Main fix script for RLS and policies
2. `FIX_SECURITY_DEFINER_VIEWS.sql` - Helper for fixing views
3. `DROP_LEGACY_TABLES.sql` - Script to drop unused tables
4. `SECURITY_FIX_ANALYSIS.md` - Detailed analysis
5. `SECURITY_FIXES_SUMMARY.md` - This file
