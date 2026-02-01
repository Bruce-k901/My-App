# Troubleshooting: Employee in Wrong Section of Org Chart

## Problem
An employee was added to a site (e.g., St Kaths) but appears in the "Head Office" section of the org chart instead of under their assigned site.

## Root Cause
The org chart determines employee placement based on the `site_id` field in the `profiles` table:

```typescript
// From org-chart/page.tsx lines 129-135
const headOffice = employees.filter(e => 
  !e.site_id &&  // ← This is the key check
  !['Owner', 'CEO', 'Managing Director', ...].includes(e.app_role)
);
```

**If `site_id` is NULL, the employee appears in Head Office, regardless of other fields.**

## Common Causes

### 1. `site_id` is NULL but `home_site` is set
- The database has TWO site-related fields: `site_id` and `home_site`
- The org chart only checks `site_id`
- Some forms may set `home_site` but not `site_id`

### 2. Employee was created via Head Office modal
- The Head Office/Executive modal explicitly sets `site_id` to `null`
- If the wrong modal was used, the employee won't have a site

### 3. Site assignment was cleared accidentally
- Manual database edit
- Form submission error

## Quick Diagnosis

### Option 1: Check via Supabase Dashboard
1. Go to Supabase Dashboard → Table Editor → `profiles`
2. Find the employee by name or email
3. Check the `site_id` column:
   - **NULL** = Will appear in Head Office ❌
   - **Has UUID** = Will appear under that site ✅

### Option 2: Run SQL Query
```sql
-- Find the employee and check their site assignment
SELECT 
  p.id,
  p.full_name,
  p.email,
  p.app_role,
  p.site_id,
  p.home_site,
  s1.name as site_id_name,
  s2.name as home_site_name,
  CASE 
    WHEN p.site_id IS NULL THEN '❌ NO SITE - Will show in Head Office'
    ELSE '✅ Has site - Should show under site'
  END as status
FROM profiles p
LEFT JOIN sites s1 ON p.site_id = s1.id
LEFT JOIN sites s2 ON p.home_site = s2.id
WHERE 
  p.full_name ILIKE '%[EMPLOYEE_NAME]%'
  OR p.email = '[EMAIL]';
```

## Solutions

### Solution 1: Fix via Supabase Dashboard (Easiest)
1. Go to Supabase Dashboard → Table Editor → `profiles`
2. Find the employee row
3. Click on the `site_id` cell
4. Select the correct site from the dropdown (e.g., St Kaths)
5. Save
6. Refresh the org chart page

### Solution 2: Fix via SQL (Fastest for multiple employees)
```sql
-- Step 1: Find St Kaths site ID
SELECT id, name FROM sites WHERE name ILIKE '%kath%';

-- Step 2: Update the employee
UPDATE profiles
SET 
  site_id = '[ST_KATHS_SITE_ID]',
  home_site = '[ST_KATHS_SITE_ID]'  -- Keep both in sync
WHERE 
  full_name = '[EMPLOYEE_NAME]'
  OR email = '[EMPLOYEE_EMAIL]';

-- Step 3: Verify
SELECT 
  p.full_name,
  p.site_id,
  s.name as site_name
FROM profiles p
LEFT JOIN sites s ON p.site_id = s.id
WHERE p.full_name = '[EMPLOYEE_NAME]';
```

### Solution 3: Bulk Fix (If many employees have this issue)
```sql
-- Fix all employees where home_site is set but site_id is NULL
UPDATE profiles
SET site_id = home_site
WHERE 
  site_id IS NULL 
  AND home_site IS NOT NULL;

-- Verify the fix
SELECT 
  p.full_name,
  p.site_id,
  s.name as site_name,
  '✅ Fixed' as status
FROM profiles p
JOIN sites s ON p.site_id = s.id
WHERE p.site_id = p.home_site;
```

## Prevention

### For Future Employee Additions:

1. **Use the correct modal:**
   - **Head Office/Executive Modal** → For non-site staff (CEO, CFO, etc.)
   - **Site Employee Form** → For site-based staff

2. **Always verify site assignment:**
   - After adding an employee, check the org chart
   - Confirm they appear under the correct site

3. **Database consistency:**
   - Keep `site_id` and `home_site` in sync
   - Consider adding a database trigger to auto-sync these fields

## Understanding the Fields

### `site_id` (Primary field for org chart)
- **Purpose:** Determines where employee appears in org chart
- **Used by:** Org chart, site-based filtering, reports
- **Should be:** The site where the employee primarily works

### `home_site` (Secondary field)
- **Purpose:** Reference for "home base" in multi-site scenarios
- **Used by:** Some reports, employee profile display
- **Should be:** Same as `site_id` in most cases

### Best Practice
Keep both fields identical unless you have a specific multi-site use case.

## Verification Steps

After fixing, verify the employee appears correctly:

1. **Refresh the org chart page** (`/dashboard/people/employees/org-chart`)
2. **Find St Kaths site** in the hierarchy
3. **Expand the site** to see employees
4. **Confirm the employee** is listed under St Kaths, not in Head Office

## Need More Help?

### Check these related files:
- `src/app/dashboard/people/employees/org-chart/page.tsx` - Org chart logic
- `src/components/users/AddExecutiveModal.tsx` - Head office modal
- `src/app/dashboard/people/directory/new-site/page.tsx` - Site employee form

### SQL Scripts:
- `supabase/sql/check_employee_site_assignment.sql` - Diagnostic queries
- `supabase/sql/fix_employee_site_assignment.sql` - Fix scripts

## Example: Complete Fix for St Kaths Employee

```sql
-- 1. Find St Kaths
SELECT id, name FROM sites WHERE name = 'St Kaths';
-- Result: id = 'abc-123-def'

-- 2. Find employee
SELECT id, full_name, site_id FROM profiles 
WHERE full_name = 'John Smith';
-- Result: id = 'xyz-789-uvw', site_id = NULL

-- 3. Fix it
UPDATE profiles
SET 
  site_id = 'abc-123-def',
  home_site = 'abc-123-def'
WHERE id = 'xyz-789-uvw';

-- 4. Verify
SELECT 
  p.full_name,
  s.name as site_name,
  '✅ Fixed!' as status
FROM profiles p
JOIN sites s ON p.site_id = s.id
WHERE p.id = 'xyz-789-uvw';
```

## Summary

**Problem:** Employee in Head Office instead of St Kaths
**Cause:** `site_id` field is NULL
**Fix:** Set `site_id` to St Kaths site UUID
**Verify:** Check org chart, employee should now appear under St Kaths

