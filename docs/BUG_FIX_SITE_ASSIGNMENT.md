# Bug Fix: Site Assignment & Onboarding Status

## Issues Discovered

### Issue 1: Employees Show in Head Office Instead of Their Site
**Symptom:** Josh Simmons (and potentially others) appears in the "Head Office" section of the org chart despite having a site assigned in their profile.

**Root Cause:** The site employee form was saving to `home_site` but NOT to `site_id`. The org chart only checks `site_id` to determine placement.

**Code Location:** `src/app/dashboard/people/directory/new-site/page.tsx` line 267

**Before:**
```typescript
home_site: formData.home_site || null,
```

**After:**
```typescript
site_id: formData.home_site || null,  // Primary field for org chart
home_site: formData.home_site || null, // Keep both in sync
```

### Issue 2: Onboarding Badge Never Removed
**Symptom:** Employee cards show "onboarding" badge even after employee is fully onboarded.

**Root Cause:** 
1. New employees are set to `status: 'onboarding'` (correct)
2. There's no UI to change status to `'active'` after onboarding is complete
3. Status must be manually updated in database

**Code Location:** `src/app/dashboard/people/directory/new-site/page.tsx` line 294

**Current State:**
```typescript
status: 'onboarding', // TODO: Provide UI to change to 'active' after onboarding complete
```

## Fix Applied

### Code Fix (Prevents Future Issues)
✅ **Fixed:** Site employee form now saves to BOTH `site_id` and `home_site`
- New employees will correctly appear under their assigned site
- No more Head Office misplacement for site employees

### Database Fix Required (For Existing Employees)

#### Quick Fix for Josh Simmons

**Option 1: If home_site is already set (Easiest)**
```sql
UPDATE profiles
SET 
  site_id = home_site,
  status = 'active'
WHERE 
  full_name ILIKE '%josh%simmons%'
  AND site_id IS NULL
  AND home_site IS NOT NULL;
```

**Option 2: Explicit site assignment (Safest)**
```sql
-- 1. Get St Kaths ID
SELECT id FROM sites WHERE name ILIKE '%kath%';

-- 2. Update Josh (replace [ST_KATHS_ID] with actual ID)
UPDATE profiles
SET 
  site_id = '[ST_KATHS_ID]',
  home_site = '[ST_KATHS_ID]',
  status = 'active'
WHERE 
  full_name ILIKE '%josh%simmons%';
```

#### Verify the Fix
```sql
SELECT 
  p.full_name,
  p.email,
  s.name as site_name,
  p.status,
  CASE 
    WHEN p.site_id IS NOT NULL AND p.status = 'active' 
    THEN '✅ FIXED!'
    ELSE '❌ Still has issues'
  END as check
FROM profiles p
LEFT JOIN sites s ON p.site_id = s.id
WHERE p.full_name ILIKE '%josh%simmons%';
```

#### Bulk Fix (If Multiple Employees Affected)
```sql
-- Find all affected employees
SELECT 
  p.full_name,
  s.name as home_site_name,
  p.status
FROM profiles p
LEFT JOIN sites s ON p.home_site = s.id
WHERE 
  p.site_id IS NULL 
  AND p.home_site IS NOT NULL;

-- Fix them all
UPDATE profiles
SET 
  site_id = home_site,
  status = 'active'
WHERE 
  site_id IS NULL 
  AND home_site IS NOT NULL;
```

## How to Apply the Fix

### Step 1: Fix the Code (Already Done ✅)
The code has been updated. New employees will work correctly.

### Step 2: Fix Josh Simmons in Database

**Via Supabase Dashboard:**
1. Go to Supabase → Table Editor → `profiles`
2. Find Josh Simmons
3. Update two fields:
   - `site_id`: Copy the value from `home_site` (or select St Kaths from dropdown)
   - `status`: Change from `'onboarding'` to `'active'`
4. Save

**Via SQL Editor:**
1. Go to Supabase → SQL Editor
2. Run the SQL from `supabase/sql/fix_josh_simmons_complete.sql`
3. Verify with the verification query

### Step 3: Verify in App
1. Go to `http://localhost:3000/dashboard/people/employees/org-chart`
2. Refresh the page
3. Check that Josh Simmons:
   - ✅ Appears under St Kaths (not Head Office)
   - ✅ Has NO onboarding badge

## Future Improvements Needed

### 1. Status Management UI
**Problem:** No way to change employee status from 'onboarding' to 'active' in the UI

**Solution Options:**
- Add "Complete Onboarding" button on employee profile
- Auto-change to 'active' after X days
- Add status dropdown in employee edit form
- Onboarding checklist that auto-updates status when complete

### 2. Data Consistency
**Problem:** Two fields (`site_id` and `home_site`) serve similar purposes

**Solution Options:**
- Use ONLY `site_id` and remove `home_site`
- Add database trigger to keep them in sync
- Add validation to ensure they're always the same

### 3. Form Validation
**Problem:** Site employee form allows submission without site selection

**Solution:**
- Make site selection required for site employees
- Add validation message if no site selected

## Testing Checklist

After applying fixes, test:
- [ ] Create new site employee → Appears under correct site immediately
- [ ] Check org chart → No employees in Head Office that should be at sites
- [ ] Check employee cards → Onboarding badges only on actual onboarding employees
- [ ] Josh Simmons → Under St Kaths, no badge

## Related Files

### Fixed Files:
- `src/app/dashboard/people/directory/new-site/page.tsx` - Site employee form

### SQL Scripts:
- `supabase/sql/diagnose_josh_simmons.sql` - Diagnostic queries
- `supabase/sql/fix_josh_simmons_complete.sql` - Complete fix for Josh
- `supabase/sql/check_employee_site_assignment.sql` - General diagnostic
- `supabase/sql/fix_employee_site_assignment.sql` - General fix script

### Documentation:
- `docs/TROUBLESHOOTING_SITE_ASSIGNMENT.md` - Detailed troubleshooting guide
- `docs/BUG_FIX_SITE_ASSIGNMENT.md` - This file

## Summary

**What was wrong:**
1. Form saved to `home_site` but not `site_id`
2. Org chart checks `site_id` only
3. Result: Employee appears in wrong section

**What was fixed:**
1. ✅ Code updated to save to both fields
2. ⏳ Database needs manual update for existing employees
3. 📋 TODO: Add UI for status management

**Immediate action:**
Run the SQL fix for Josh Simmons to resolve his issues now.

