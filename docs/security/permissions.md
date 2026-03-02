# Universal Permissions Guide

## Overview

This guide ensures that RLS (Row Level Security) policies work correctly for **ALL companies**, both existing and future, with proper role-based access control.

## Two-Layer Security Model

### Layer 1: Database RLS (Row Level Security)

**Purpose:** Company-level data isolation

- Ensures users can only access data from their own company
- Works universally for all companies using `company_id` checks
- No role restrictions at database level (except for viewing others' attendance)

### Layer 2: Application Role-Based Access Control

**Purpose:** Feature-level restrictions based on user role

- Defined in `src/lib/accessControl.ts`
- Enforced in UI components and API routes
- Staff role has restricted features (Organization, Business Details, Sites, Users, etc.)
- Manager/Admin/Owner have full access

## Files

### 1. `supabase/sql/ensure_universal_rls_policies.sql`

**Purpose:** Universal RLS policies for all companies

- Works for existing and new companies
- Should be run once to fix existing companies
- Should be included in database migrations

**What it fixes:**

- ✅ Clock-in permissions (all users in company)
- ✅ Conversation creation (all users in company)
- ✅ Message sending (users in conversation)
- ✅ Company data viewing (all users in company)
- ✅ COSHH sheets access (all users in company)

### 2. `supabase/sql/fix_checkly_test_co_permissions.sql`

**Purpose:** Diagnostic and fix script (includes company-specific checks)

- Includes diagnostic queries for troubleshooting
- Can be run to verify/fix specific companies
- Useful for debugging permission issues

## Role-Based Access Control

### Staff Role Restrictions

Staff users **cannot** access:

- Organization settings
- Business Details (view/edit)
- Sites management
- Users management
- Documents
- Task Templates
- Compliance Templates
- Drafts
- Create Library
- Library Templates
- Contractors
- Reports
- Settings

Staff users **can** access:

- Dashboard
- My Tasks
- SOPs
- SOP Templates
- My RA's
- RA Templates
- COSHH Data
- All Libraries
- Assets
- PPM Schedule
- Callout Logs
- EHO Readiness
- Support

### Manager/Admin/Owner Roles

- **Full access** to all features
- No restrictions at application level
- Can view/edit all company data

## How It Works for New Companies

### When a new company is created:

1. Company record is created in `companies` table
2. Users are assigned `company_id` in `profiles` table
3. RLS policies automatically apply (no company-specific setup needed)
4. Role-based restrictions apply based on `app_role` field

### Example Flow:

```sql
-- 1. Company created
INSERT INTO companies (name, ...) VALUES ('New Company', ...);

-- 2. User assigned to company
UPDATE profiles SET company_id = 'company-uuid' WHERE id = 'user-uuid';

-- 3. RLS policies automatically work:
--    - User can clock in (staff_attendance_insert_own policy)
--    - User can create conversations (conversations_insert_company policy)
--    - User can view company data (companies_select_own_or_profile policy)
--    - User can access COSHH sheets (coshh_data_sheets policies)

-- 4. Application layer enforces role restrictions:
--    - Staff: Cannot access Organization/Business Details pages
--    - Manager/Admin: Full access
```

## Verification Checklist

After running the universal RLS script, verify:

### ✅ Database Level (RLS)

- [ ] Users can clock in
- [ ] Users can create conversations
- [ ] Users can send messages
- [ ] Users can view their company data
- [ ] Users can access COSHH sheets
- [ ] Users **cannot** see other companies' data

### ✅ Application Level (Role-Based)

- [ ] Staff users see restricted menu items
- [ ] Staff users cannot access Organization pages
- [ ] Staff users cannot access Business Details
- [ ] Manager/Admin users see all menu items
- [ ] Manager/Admin users can access all pages

## Troubleshooting

### Issue: Users can't clock in

**Check:**

1. User has `company_id` set in profile
2. `staff_attendance_insert_own` policy exists
3. User is authenticated (`auth.uid()` is not null)

**Fix:**

```sql
-- Check user's company_id
SELECT id, email, company_id FROM profiles WHERE email = 'user@example.com';

-- Verify policy exists
SELECT * FROM pg_policies WHERE tablename = 'staff_attendance';
```

### Issue: Staff users can see restricted pages

**Check:**

1. `isRestricted()` function in `src/lib/accessControl.ts`
2. Navigation components use `isRestricted()` check
3. Page components check role restrictions

**Fix:**

- Verify `ACCESS_RULES.Staff.restricted` includes the feature
- Check that UI components use `isRestricted(role, featureName)`

### Issue: Users can see other companies' data

**Check:**

1. RLS policies use `company_id` checks
2. Policies use `EXISTS` subquery correctly
3. User's `company_id` matches the data's `company_id`

**Fix:**

- Run `ensure_universal_rls_policies.sql` to recreate policies
- Verify policies use `p.company_id = table.company_id` pattern

## Best Practices

1. **Always use company_id checks in RLS policies**
   - Never hardcode company names or IDs
   - Use `EXISTS` subquery pattern

2. **Keep role restrictions in application layer**
   - Database RLS = company isolation
   - Application = feature restrictions

3. **Test with multiple companies**
   - Create test companies
   - Verify data isolation works
   - Verify role restrictions work

4. **Include in migrations**
   - Add `ensure_universal_rls_policies.sql` to migration files
   - Ensures new deployments have correct policies

## Status

✅ **Universal RLS policies created** - Works for all companies
✅ **Role-based access control documented** - Application layer restrictions
✅ **Migration script ready** - Can be included in database migrations

## Next Steps

1. Run `ensure_universal_rls_policies.sql` to fix existing companies
2. Include script in database migrations for new deployments
3. Test with multiple companies to verify isolation
4. Verify role-based restrictions work in UI
