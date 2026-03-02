# Employee Status Management & Site Assignment Fix

## Issues Fixed

### Issue 1: Site Assignment Not Saving

**Problem:** When editing an employee and changing their site, only `home_site` was updated, not `site_id`. The org chart only checks `site_id`, so employees appeared in the wrong section.

**Root Cause:** The edit form updated `home_site` but didn't sync it to `site_id`.

**Fix Applied:**

- Updated `UsersTab.tsx` `handleUserUpdate` function to automatically sync `site_id` and `home_site`
- When either field changes, both are updated to stay in sync
- This ensures org chart placement is always correct

**Code Location:** `src/components/organization/UsersTab.tsx` lines 289-299

### Issue 2: No Way to Change Employee Status

**Problem:** Employees remain in "onboarding" status indefinitely with no UI to mark them as "active".

**Root Cause:** Status field wasn't included in the employee edit form.

**Fix Applied:**

- Added "Status" dropdown to employee edit form
- Options: 🔵 Onboarding, ✅ Active, ⏸️ Inactive, 🏖️ On Leave
- Status is now saved when editing an employee
- Badge will automatically update based on status

**Code Locations:**

- `src/components/users/UserEntityCard.tsx` - Added status dropdown
- `src/components/organization/UsersTab.tsx` - Added status to User interface and save logic

## How to Use

### Fixing Josh Simmons (Immediate)

**Option 1: Via SQL (Fastest)**

```sql
-- Get St Kaths site ID
SELECT id, name FROM sites WHERE name ILIKE '%kath%';

-- Fix Josh (replace [ST_KATHS_SITE_ID] with actual ID)
UPDATE profiles
SET
  site_id = '[ST_KATHS_SITE_ID]',
  home_site = '[ST_KATHS_SITE_ID]',
  status = 'active'
WHERE
  id = '593d7c4f-d0e5-416f-ad23-eb278bb0cd17';
```

**Option 2: Via UI (After Refresh)**

1. Go to People → Directory or Organization → Users
2. Find Josh Simmons
3. Click to expand his card
4. Change "Site" dropdown to "St Kaths"
5. Change "Status" dropdown to "✅ Active"
6. Click "Save"
7. Verify in org chart

### Managing Employee Status Going Forward

#### When to Use Each Status:

**🔵 Onboarding** (Default for new employees)

- Employee has been added but hasn't completed onboarding
- Still completing paperwork, training, etc.
- Shows badge on employee card
- Use until employee is fully ready to work

**✅ Active** (Normal working status)

- Employee is fully onboarded and working
- All paperwork complete
- Training up to date
- This is the standard status for most employees

**⏸️ Inactive** (Temporarily not working)

- Employee is still employed but not currently working
- On extended leave without pay
- Suspended
- Between contracts

**🏖️ On Leave** (Temporary absence)

- Annual leave
- Sick leave
- Maternity/paternity leave
- Sabbatical

#### How to Change Status:

1. Navigate to the employee list (People → Directory or Organization → Users)
2. Find the employee
3. Click to expand their card
4. Find the "Status" dropdown
5. Select the appropriate status
6. Click "Save"
7. The badge will update automatically

## Technical Details

### Database Fields

**`site_id`** (UUID, nullable)

- Primary field for site assignment
- Used by org chart to determine placement
- Used by site-based filtering and reports
- Should always match `home_site`

**`home_site`** (UUID, nullable)

- Secondary field for site assignment
- Used by some legacy features
- Kept in sync with `site_id` automatically

**`status`** (TEXT, nullable)

- Values: `'onboarding'`, `'active'`, `'inactive'`, `'on_leave'`
- Defaults to `'onboarding'` for new employees
- Controls badge display on employee cards
- Used for filtering and reporting

### Auto-Sync Logic

When you edit an employee:

```typescript
// If home_site changes, site_id is automatically updated
if (updates.home_site !== undefined) {
  updates.site_id = updates.home_site;
}

// If site_id changes, home_site is automatically updated
if (updates.site_id !== undefined && updates.home_site === undefined) {
  updates.home_site = updates.site_id;
}
```

This ensures both fields always stay in sync, preventing org chart placement issues.

## Verification Steps

After fixing Josh or any employee:

1. **Check Database:**

```sql
SELECT
  full_name,
  site_id,
  home_site,
  status,
  (SELECT name FROM sites WHERE id = profiles.site_id) as site_name
FROM profiles
WHERE id = '593d7c4f-d0e5-416f-ad23-eb278bb0cd17';
```

Expected result:

- `site_id` = St Kaths UUID
- `home_site` = St Kaths UUID (same)
- `status` = `'active'`

2. **Check Org Chart:**

- Go to `/dashboard/people/employees/org-chart`
- Find St Kaths in the hierarchy
- Expand St Kaths
- Josh Simmons should be listed there (not in Head Office)

3. **Check Employee Card:**

- Go to People → Directory
- Find Josh Simmons
- Card should NOT have "onboarding" badge
- Should show "✅ Active" status when expanded

## Common Issues & Solutions

### Issue: Employee still in Head Office after changing site

**Cause:** Only `home_site` was updated, not `site_id`
**Solution:** Run SQL to sync them:

```sql
UPDATE profiles
SET site_id = home_site
WHERE site_id IS NULL AND home_site IS NOT NULL;
```

### Issue: Badge still showing after changing status

**Cause:** Browser cache or status not saved
**Solution:**

1. Hard refresh browser (Ctrl+Shift+R)
2. Verify status in database
3. Re-save if needed

### Issue: Status dropdown not showing

**Cause:** Need to refresh after code update
**Solution:**

1. Stop dev server
2. Clear .next folder: `Remove-Item -Recurse -Force .next`
3. Restart dev server: `npm run dev`

## Migration Script

If you have multiple employees with this issue:

```sql
-- Find all affected employees
SELECT
  p.full_name,
  p.email,
  s.name as home_site_name,
  p.status,
  CASE
    WHEN p.site_id IS NULL THEN '❌ Missing site_id'
    WHEN p.status = 'onboarding' THEN '⚠️ Still onboarding'
    ELSE '✅ OK'
  END as issue
FROM profiles p
LEFT JOIN sites s ON p.home_site = s.id
WHERE
  p.site_id IS NULL
  OR p.status = 'onboarding';

-- Fix all at once (CAREFUL - this affects all employees)
UPDATE profiles
SET
  site_id = COALESCE(site_id, home_site),  -- Use site_id if set, otherwise use home_site
  status = CASE
    WHEN status = 'onboarding' AND created_at < NOW() - INTERVAL '7 days'
    THEN 'active'  -- Auto-activate if onboarding for more than 7 days
    ELSE status
  END
WHERE
  site_id IS NULL
  OR (status = 'onboarding' AND created_at < NOW() - INTERVAL '7 days');
```

## Related Files

### Modified Files:

- `src/components/organization/UsersTab.tsx` - Added status field, auto-sync logic
- `src/components/users/UserEntityCard.tsx` - Added status dropdown
- `src/app/dashboard/people/directory/new-site/page.tsx` - Fixed to save site_id

### SQL Scripts:

- `supabase/sql/fix_josh_now.sql` - Immediate fix for Josh
- `supabase/sql/fix_josh_simmons_complete.sql` - Comprehensive fix with verification
- `supabase/sql/diagnose_josh_simmons.sql` - Diagnostic queries

### Documentation:

- `docs/BUG_FIX_SITE_ASSIGNMENT.md` - Original bug fix documentation
- `docs/TROUBLESHOOTING_SITE_ASSIGNMENT.md` - Troubleshooting guide
- `docs/EMPLOYEE_STATUS_MANAGEMENT.md` - This file

## Summary

✅ **Fixed:** Site assignment now properly syncs `site_id` and `home_site`
✅ **Fixed:** Added UI to change employee status
✅ **Fixed:** New site employees will have correct site_id from creation
⏳ **Action Required:** Run SQL to fix Josh Simmons and any other affected employees
📋 **Future:** Consider auto-activating employees after onboarding checklist completion
