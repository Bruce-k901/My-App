# Moving Employees Between Sites and Head Office

## Overview
Employees can be moved between sites or promoted from site-based roles to head office positions (and vice versa) using the employee edit form.

## Use Cases

### 1. Promotion to Head Office Role
**Scenario:** Site Manager promoted to Area Manager

**Before:**
- Name: Sarah Johnson
- Role: Manager
- Site: St Kaths
- Shows: Under St Kaths in org chart

**After Promotion:**
- Name: Sarah Johnson
- Role: Area Manager
- Site: Head Office (No Site)
- Shows: Under "Area Managers" in org chart

### 2. Transfer Between Sites
**Scenario:** Staff member transfers to different location

**Before:**
- Name: Mike Chen
- Role: Staff
- Site: London Bridge

**After Transfer:**
- Name: Mike Chen
- Role: Staff
- Site: St Kaths

### 3. Demotion/Transfer from Head Office to Site
**Scenario:** Area Manager takes on Site Manager role

**Before:**
- Name: Emma Wilson
- Role: Area Manager
- Site: Head Office (No Site)
- Shows: Under "Area Managers" in org chart

**After:**
- Name: Emma Wilson
- Role: Manager
- Site: Manchester Central
- Shows: Under Manchester Central site in org chart

## How to Move Employees

### Moving from Site to Head Office

1. **Navigate to employee list:**
   - Go to People → Directory
   - Or Organization → Users

2. **Find the employee**
   - Search or scroll to find them
   - Click to expand their card

3. **Update their role:**
   - Change "App Role" dropdown to executive/management role:
     - Regional Manager
     - Area Manager
     - HR Manager
     - Operations Manager
     - Finance Manager
     - CEO, COO, CFO, etc.

4. **Remove site assignment:**
   - In "Site Assignment" dropdown
   - Select **"🏢 Head Office (No Site)"**
   - This will appear at the top of the list

5. **Save changes:**
   - Click "Save" button
   - Employee's `site_id` and `home_site` are now NULL

6. **Verify:**
   - Go to org chart
   - Employee should now appear in appropriate executive/management section
   - They will NOT appear under any site

### Moving from Head Office to Site

1. **Navigate to employee list**

2. **Find the employee**
   - Expand their card

3. **Update their role (if needed):**
   - Change "App Role" to site-based role:
     - Manager
     - Staff
     - Admin

4. **Assign to site:**
   - In "Site Assignment" dropdown
   - Select the target site (e.g., "St Kaths", "London Bridge")
   - Both `site_id` and `home_site` are set to the selected site

5. **Save changes:**
   - Click "Save"

6. **Verify:**
   - Go to org chart
   - Employee should now appear under the selected site
   - They will NOT appear in head office section

### Moving Between Sites

1. **Navigate to employee list**

2. **Find the employee**
   - Expand their card

3. **Change site:**
   - In "Site Assignment" dropdown
   - Select the new site

4. **Save changes:**
   - Click "Save"

5. **Verify:**
   - Go to org chart
   - Employee appears under new site
   - No longer appears under old site

## Site Assignment Dropdown

The "Site Assignment" dropdown shows:

```
🏢 Head Office (No Site)     ← Special option at the top
─────────────────────────
London Bridge
Manchester Central
St Kaths
Birmingham New Street
... (all your sites alphabetically)
```

### How it Works:

**"🏢 Head Office (No Site)" selected:**
- Sets `site_id` = `NULL`
- Sets `home_site` = `NULL`
- Employee appears in org chart based on their `app_role`:
  - CEO → Executive Leadership
  - Area Manager → Area Managers section
  - HR Manager → Head Office Staff
  - etc.

**Any site selected:**
- Sets `site_id` = [site UUID]
- Sets `home_site` = [site UUID]
- Employee appears under that site in org chart
- Role determines their position within the site

## Org Chart Placement Logic

### Head Office Employees (site_id = NULL)

**Executive Leadership:**
- CEO / Owner
- Managing Director
- COO
- CFO

**Management:**
- Regional Manager
- Area Manager
- HR Manager
- Operations Manager
- Finance Manager

**Head Office Staff:**
- Admin (if not assigned to a site)
- Other staff with no site assignment

### Site-Based Employees (site_id = UUID)

Appear under their assigned site:
- **Site Manager** (app_role = "Manager")
- **Staff** (app_role = "Staff")
- **Admin** (app_role = "Admin" with site assignment)

## Common Workflows

### Workflow 1: Promoting Site Manager to Area Manager

```
Step 1: Change Role
  - App Role: Manager → Area Manager

Step 2: Remove Site
  - Site Assignment: [Current Site] → 🏢 Head Office (No Site)

Step 3: Update Status (if needed)
  - Status: Ensure "✅ Active"

Step 4: Save
  
Result:
  - Appears in "Area Managers" section of org chart
  - No longer appears under previous site
  - Can now manage multiple sites in their area
```

### Workflow 2: Regional Manager Taking Over a Site

```
Step 1: Change Role
  - App Role: Regional Manager → Manager

Step 2: Assign Site
  - Site Assignment: 🏢 Head Office (No Site) → Manchester Central

Step 3: Save

Result:
  - Appears under Manchester Central site
  - No longer appears in "Regional Managers" section
  - Now manages that specific site
```

### Workflow 3: Staff Transfer Between Sites

```
Step 1: Change Site (Role stays same)
  - Site Assignment: London Bridge → St Kaths

Step 2: Update Department/BOH-FOH (if needed)

Step 3: Save

Result:
  - Moves from London Bridge to St Kaths
  - Role remains "Staff"
  - Clean transfer with no gaps
```

## Important Notes

### Role & Site Alignment

**Executive/Management Roles** (typically no site):
- CEO, COO, CFO
- Managing Director
- Regional Manager
- Area Manager
- HR Manager
- Operations Manager
- Finance Manager

**Site-Based Roles** (require site assignment):
- Manager (Site Manager)
- Staff
- Admin (unless head office admin)

### Consistency Tips

1. **Match role to assignment:**
   - Area Managers should be Head Office
   - Site Managers should have a site
   - Staff should always have a site

2. **Update both fields:**
   - The system automatically syncs `site_id` and `home_site`
   - You only need to use the "Site Assignment" dropdown

3. **Check org chart:**
   - After saving, verify placement in org chart
   - Refresh the page if needed

4. **Status matters:**
   - Keep status as "✅ Active" for working employees
   - Use "🏖️ On Leave" for temporary absence
   - Use "⏸️ Inactive" for long-term absence

## Technical Details

### Database Changes

**Moving to Head Office:**
```sql
UPDATE profiles
SET 
  site_id = NULL,
  home_site = NULL,
  app_role = 'Area Manager'  -- or appropriate role
WHERE id = '[employee_id]';
```

**Moving to Site:**
```sql
UPDATE profiles
SET 
  site_id = '[site_uuid]',
  home_site = '[site_uuid]',
  app_role = 'Manager'  -- or appropriate role
WHERE id = '[employee_id]';
```

### Auto-Sync Logic

```typescript
// When changing site assignment:
if (newSite === 'HEAD_OFFICE') {
  // Clear both fields
  site_id = null;
  home_site = null;
} else {
  // Set both to the selected site
  site_id = newSite;
  home_site = newSite;
}
```

## Verification Checklist

After moving an employee:

- [ ] Employee card shows correct site (or "Head Office")
- [ ] Org chart shows employee in correct section
- [ ] Employee's role matches their assignment
- [ ] Status is correct (Active, On Leave, etc.)
- [ ] No duplicate entries in org chart
- [ ] Employee can access appropriate features for their role

## Examples

### Example 1: Complete Promotion Flow

**Starting State:**
```
Name: Sarah Johnson
Role: Manager
Site: St Kaths
Status: Active
```

**Promotion Decision:**
Sarah is promoted to Area Manager for Central London area.

**Changes to Make:**
1. App Role: Manager → Area Manager
2. Site Assignment: St Kaths → 🏢 Head Office (No Site)
3. Position Title: Site Manager → Area Manager
4. Department: Operations → Management
5. Click Save

**Final State:**
```
Name: Sarah Johnson
Role: Area Manager
Site: Head Office (No Site)
Status: Active
Position: Area Manager
```

**Verification:**
- Org chart: Sarah appears under "Area Managers" section
- Not under St Kaths anymore
- Has appropriate permissions for area management

### Example 2: Site Transfer

**Starting State:**
```
Name: Tom Williams
Role: Staff
Site: London Bridge
BOH/FOH: BOH
```

**Transfer Decision:**
Tom is transferring to St Kaths.

**Changes to Make:**
1. Site Assignment: London Bridge → St Kaths
2. Verify BOH/FOH is still correct (or update if different)
3. Click Save

**Final State:**
```
Name: Tom Williams
Role: Staff
Site: St Kaths
BOH/FOH: BOH
```

**Verification:**
- Org chart: Tom appears under St Kaths
- Not under London Bridge anymore
- All other details preserved

## Related Documentation

- `docs/EMPLOYEE_STATUS_MANAGEMENT.md` - Managing employee status
- `docs/BUG_FIX_SITE_ASSIGNMENT.md` - Site assignment bug fixes
- `docs/ORG_CHART_GUIDE.md` - Org chart structure
- `docs/HEAD_OFFICE_ONBOARDING.md` - Adding head office employees

## Summary

✅ **Easy Movement:** Change site assignment with one dropdown
✅ **Head Office Option:** "🏢 Head Office (No Site)" moves to head office
✅ **Auto-Sync:** site_id and home_site stay in sync automatically
✅ **Role Matching:** Ensure role matches site assignment
✅ **Verify:** Check org chart after changes

The system makes it simple to promote, transfer, or reorganize staff while maintaining data integrity and correct org chart placement! 🎉

